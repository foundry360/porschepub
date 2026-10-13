import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";
import type { Db } from "@/server/supabase/clients";

/**
 * Helpers for integration tests. Everything created here is tagged with a
 * per-run prefix so cleanup can't touch seeded development data.
 */
export const RUN = `itest-${randomUUID().slice(0, 8)}`;

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } as const;

export function serviceClient(): Db {
  return createClient<Database>(url(), process.env.SUPABASE_SECRET_KEY!, opts);
}
export function anonClient(): Db {
  return createClient<Database>(url(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, opts);
}

export type TestUser = { id: string; email: string; db: Db };

/**
 * Create an Auth user (optionally with an editorial profile) and return a client
 * signed in as that user. `role: null` creates an Auth account with NO profile,
 * which must grant nothing.
 */
export async function createUser(role: "admin" | "editor" | null, label = role ?? "plain"): Promise<TestUser> {
  const service = serviceClient();
  const email = `${RUN}-${label}-${randomUUID().slice(0, 6)}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  if (role) {
    const { error: profileError } = await service
      .from("profiles")
      .insert({ id: data.user.id, role, display_name: `${RUN} ${label}` });
    if (profileError) throw new Error(`profile insert failed: ${profileError.message}`);
  }
  const db = anonClient();
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`sign in failed: ${signInError.message}`);
  return { id: data.user.id, email, db };
}

export async function makeAsset(service: Db, alt = "Test image", extra: Partial<Database["public"]["Tables"]["media_assets"]["Insert"]> = {}) {
  const { data, error } = await service
    .from("media_assets")
    .insert({
      storage_path: `${RUN}/${randomUUID()}.jpg`,
      mime_type: "image/jpeg",
      byte_size: 1234,
      width: 1600,
      height: 900,
      alt_text: alt,
      credit: "Test",
      ...extra,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`makeAsset failed: ${error?.message}`);
  return data.id;
}

export async function makeContributor(service: Db, visible = false) {
  const { data, error } = await service
    .from("contributors")
    .insert({ name: `${RUN} Contributor`, slug: `${RUN}-c-${randomUUID().slice(0, 6)}`, profile_visible: visible })
    .select("id, slug")
    .single();
  if (error || !data) throw new Error(`makeContributor failed: ${error?.message}`);
  return data;
}

export async function anyCategory(service: Db) {
  const { data, error } = await service.from("categories").select("id, slug").order("sort_order").limit(1).single();
  if (error || !data) throw new Error("no baseline categories; run `npm run db:reset`");
  return data;
}

/** Remove everything this run created. Safe to call repeatedly. */
export async function cleanup() {
  const service = serviceClient();
  // Children first, then parents. Failures are surfaced: silent leftovers pollute the dev database.
  const steps = [
    // Submissions first: a "published" submission requires its linked story to exist.
    service.from("submissions").delete().like("title", `${RUN}%`),
    service.from("stories").delete().like("slug", `${RUN}%`),
    service.from("contributors").delete().like("slug", `${RUN}%`),
    service.from("tags").delete().like("slug", `${RUN}%`),
    service.from("media_assets").delete().like("storage_path", `${RUN}/%`),
    service.from("rate_limits").delete().like("key", `${RUN}%`),
  ];
  const problems: string[] = [];
  for (const step of steps) {
    const { error } = await step;
    if (error) problems.push(error.message);
  }
  const { data } = await service.auth.admin.listUsers({ perPage: 200 });
  for (const user of data?.users ?? []) {
    if (user.email?.startsWith(RUN)) await service.auth.admin.deleteUser(user.id);
  }
  if (problems.length) throw new Error(`cleanup left data behind: ${problems.join("; ")}`);
}
