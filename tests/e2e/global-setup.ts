import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_AUTH, EDITOR_AUTH, LEAD_IMAGE, newRun, saveState, type E2EState } from "./state";

export default async function globalSetup(config: FullConfig) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`E2E tests create and delete data and only run against local Supabase (got "${url}").`);
  }
  const service = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const run = newRun();

  // The login throttle is per-IP and persistent; reset it so repeated local runs don't lock out.
  for (const prefix of ["login:", "attempt:", "submit:"]) {
    await service.from("rate_limits").delete().like("key", `${prefix}%`);
  }

  // A real (fictional, generated) photograph-sized JPEG for the upload journey.
  mkdirSync(".artifacts", { recursive: true });
  await sharp({ create: { width: 1800, height: 1000, channels: 3, background: { r: 150, g: 28, b: 36 } } })
    .composite([{ input: Buffer.from(`<svg width="1800" height="1000"><rect x="300" y="300" width="1200" height="400" fill="#f4f1ea"/></svg>`) }])
    .jpeg({ quality: 82 })
    .toFile(LEAD_IMAGE);

  async function user(role: "admin" | "editor" | null, label: string) {
    const email = `${run}-${label}@example.test`;
    const password = `pw-${randomUUID()}`;
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
    if (role) {
      const { error: pe } = await service.from("profiles").insert({ id: data.user.id, role, display_name: `${run} ${label}` });
      if (pe) throw new Error(`profile: ${pe.message}`);
    }
    return { id: data.user.id, email, password };
  }

  const [editor, admin, stranger] = await Promise.all([user("editor", "editor"), user("admin", "admin"), user(null, "stranger")]);

  // Fictional fixture contributor with a public profile, and a baseline category.
  const contributorName = `${run} Fixture Contributor`;
  const contributorSlug = `${run}-fixture-contributor`;
  const { error: ce } = await service.from("contributors").insert({
    name: contributorName,
    slug: contributorSlug,
    bio: "A fictional contributor created by the automated test suite.",
    profile_visible: true,
  });
  if (ce) throw new Error(`contributor: ${ce.message}`);

  const { data: category, error: cat } = await service.from("categories").select("name, slug").order("sort_order").limit(1).single();
  if (cat || !category) throw new Error("No baseline categories. Run `npm run db:reset` first.");

  const state: E2EState = {
    run,
    editor,
    admin,
    stranger,
    contributorName,
    contributorSlug,
    categoryName: category.name,
    categorySlug: category.slug,
  };
  saveState(state);

  // Sign in once per role through the real login form and reuse the session.
  const baseURL = config.projects[0].use.baseURL!;
  const browser = await chromium.launch();
  for (const [who, file] of [
    [editor, EDITOR_AUTH],
    [admin, ADMIN_AUTH],
  ] as const) {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(who.email);
    await page.getByLabel("Password").fill(who.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/admin");
    await context.storageState({ path: file });
    await context.close();
  }
  await browser.close();
}
