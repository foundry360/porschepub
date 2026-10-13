/**
 * Create (or promote) an editorial user.
 *
 *   npm run admin:create -- --email you@example.com [--role admin|editor] [--name "Display Name"]
 *
 * The password is read from the terminal without echo (or from the
 * ADMIN_PASSWORD env var for automation). Nothing is written to disk or logs.
 * The script targets whichever Supabase project the environment points at, and
 * asks you to confirm the URL first. Public signups stay disabled; this is the
 * only supported way to create the first administrator.
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { isLocalUrl, serviceClient } from "./lib/env";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
}

function prompt(question: string, { hidden = false } = {}): Promise<string> {
  return new Promise((resolve) => {
    let muted = false;
    const output = new Writable({
      write(chunk, _encoding, callback) {
        if (!muted) process.stdout.write(chunk);
        callback();
      },
    });
    const rl = createInterface({ input: process.stdin, output, terminal: true });
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
    muted = hidden;
  });
}

async function main() {
  const email = (arg("email") ?? (await prompt("Email: "))).trim().toLowerCase();
  const role = (arg("role") ?? "admin") as "admin" | "editor";
  const displayName = arg("name") ?? email.split("@")[0];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That does not look like an email address.");
  if (role !== "admin" && role !== "editor") throw new Error("--role must be admin or editor.");

  const { url, db } = serviceClient();
  console.log(`\nTarget Supabase project: ${url}${isLocalUrl(url) ? " (local)" : ""}`);
  if (!isLocalUrl(url) && process.env.CONFIRM_REMOTE !== "yes") {
    const answer = await prompt(`This is NOT a local database. Create ${role} "${email}" here? (type "yes"): `);
    if (answer.trim() !== "yes") {
      console.log("Aborted.");
      return;
    }
  }

  const password = process.env.ADMIN_PASSWORD ?? (await prompt("Password (min 12 characters, hidden): ", { hidden: true }));
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");

  // Reuse an existing auth user if present, otherwise create one.
  const { data: list, error: listError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let user = list.users.find((candidate) => candidate.email?.toLowerCase() === email);

  if (!user) {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("Could not create the user.");
    user = data.user;
    console.log("Created auth user.");
  } else {
    const { error } = await db.auth.admin.updateUserById(user.id, { password });
    if (error) throw error;
    console.log("Auth user already existed; password updated.");
  }

  const { error: profileError } = await db
    .from("profiles")
    .upsert({ id: user.id, role, display_name: displayName }, { onConflict: "id" });
  if (profileError) throw profileError;

  console.log(`Done. ${email} is now an ${role}. Sign in at /admin/login.`);
  console.log("Recommended next step: enable MFA for this account in Supabase Auth settings.");
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
