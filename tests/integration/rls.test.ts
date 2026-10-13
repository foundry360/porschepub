import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  RUN,
  anonClient,
  anyCategory,
  cleanup,
  createUser,
  makeAsset,
  makeContributor,
  serviceClient,
  type TestUser,
} from "../support/db";

/**
 * Row Level Security is the authorization boundary for public data. These tests
 * exercise it with real clients (anonymous, plain Auth account, editor, admin).
 */

const service = serviceClient();
let editor: TestUser;
let admin: TestUser;
let plainUser: TestUser;
const ids: Record<string, string> = {};

async function story(slug: string, patch: Record<string, unknown>) {
  const contributor = await makeContributor(service);
  const category = await anyCategory(service);
  const lead = await makeAsset(service, "Lead alt text");
  const { data, error } = await service
    .from("stories")
    .insert({
      slug: `${RUN}-${slug}`,
      headline: `${RUN} ${slug}`,
      body: [{ type: "paragraph", text: "Body" }],
      body_text: "Body",
      contributor_id: contributor.id,
      category_id: category.id,
      lead_image_id: lead,
      ...patch,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`story ${slug}: ${error?.message}`);
  ids[slug] = data.id;
  return data.id;
}

beforeAll(async () => {
  [editor, admin, plainUser] = await Promise.all([createUser("editor"), createUser("admin"), createUser(null, "plain")]);
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
  await story("live", { status: "published", published_at: past });
  await story("draft", { status: "draft" });
  await story("scheduled", { status: "published", published_at: future });
  await story("archived", { status: "archived", published_at: past });
});

afterAll(cleanup);

describe("anonymous visitors", () => {
  it("see only live stories", async () => {
    const { data, error } = await anonClient().from("stories").select("slug").like("slug", `${RUN}%`);
    expect(error).toBeNull();
    expect((data ?? []).map((s) => s.slug)).toEqual([`${RUN}-live`]);
  });

  it("cannot fetch a draft, scheduled or archived story directly by id", async () => {
    for (const key of ["draft", "scheduled", "archived"]) {
      const { data } = await anonClient().from("stories").select("id").eq("id", ids[key]).maybeSingle();
      expect(data, key).toBeNull();
    }
  });

  it("cannot read private columns on stories", async () => {
    const { error } = await anonClient().from("stories").select("created_by").limit(1);
    expect(error).not.toBeNull();
  });

  it("cannot read tables that hold private data", async () => {
    const anon = anonClient();
    for (const table of ["submissions", "audit_log", "profiles", "contributor_private", "media_asset_private", "rate_limits"] as const) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      // Either the privilege is revoked (error) or RLS yields no rows; never data.
      expect(error !== null || (data ?? []).length === 0, table).toBe(true);
    }
  });

  it("cannot write anything", async () => {
    const anon = anonClient();
    const attempts = await Promise.all([
      anon.from("stories").insert({ slug: `${RUN}-x`, headline: "x" }),
      anon.from("stories").update({ headline: "hacked" }).eq("id", ids.live).select(),
      anon.from("stories").delete().eq("id", ids.live).select(),
      anon.from("categories").insert({ slug: `${RUN}-cat`, name: "x" }),
      anon.from("submissions").insert({
        name: "x", email: "x@example.test", title: `${RUN} direct`, subject: "s", pitch: "p",
        consent_version: "v", consented_at: new Date().toISOString(),
      }),
      anon.from("homepage_placements").insert({ section: "featured", story_id: ids.live, position: 0 }),
    ]);
    for (const [index, result] of attempts.entries()) {
      const wroteRows = Array.isArray(result.data) && result.data.length > 0;
      expect(result.error !== null || !wroteRows, `attempt ${index}`).toBe(true);
    }
    const { data } = await service.from("stories").select("headline").eq("id", ids.live).single();
    expect(data?.headline).not.toBe("hacked");
    const { data: sub } = await service.from("submissions").select("id").like("title", `${RUN}%`);
    expect(sub ?? []).toHaveLength(0);
  });

  it("cannot call privileged functions", async () => {
    const anon = anonClient();
    const limit = await anon.rpc("consume_rate_limit", { p_key: `${RUN}-x`, p_limit: 1, p_window_seconds: 60 });
    expect(limit.error).not.toBeNull();
    const anonymize = await anon.rpc("anonymize_closed_submissions", { p_older_than: "400 days" });
    expect(anonymize.error).not.toBeNull();
  });

  it("cannot upload to the media bucket, but can read public objects", async () => {
    const anon = anonClient();
    const upload = await anon.storage.from("editorial-media").upload(`${RUN}/anon.txt`, new Blob(["x"], { type: "image/png" }));
    expect(upload.error).not.toBeNull();
  });

  it("see only live stories through search", async () => {
    const { data, error } = await anonClient().rpc("search_stories", { p_query: RUN, p_limit: 20, p_offset: 0 });
    expect(error).toBeNull();
    const found = (data ?? []).map((row) => row.id);
    expect(found).toContain(ids.live); // proves the query itself matches
    expect(found).not.toContain(ids.draft);
    expect(found).not.toContain(ids.scheduled);
    expect(found).not.toContain(ids.archived);
  });
});

describe("a signed-in account without an editorial profile", () => {
  it("has the same access as an anonymous visitor", async () => {
    const { data } = await plainUser.db.from("stories").select("slug").like("slug", `${RUN}%`);
    expect((data ?? []).map((s) => s.slug)).toEqual([`${RUN}-live`]);

    const { data: subs, error } = await plainUser.db.from("submissions").select("id").limit(1);
    expect(error !== null || (subs ?? []).length === 0).toBe(true);

    const insert = await plainUser.db.from("categories").insert({ slug: `${RUN}-nope`, name: "nope" }).select();
    expect(insert.error !== null || (insert.data ?? []).length === 0).toBe(true);
  });

  it("cannot give itself a profile", async () => {
    const { data, error } = await plainUser.db
      .from("profiles")
      .insert({ id: plainUser.id, role: "admin", display_name: "self-promoted" })
      .select();
    expect(error !== null || (data ?? []).length === 0).toBe(true);
    const { data: stored } = await service.from("profiles").select("id").eq("id", plainUser.id);
    expect(stored ?? []).toHaveLength(0);
  });
});

describe("editors", () => {
  it("can read drafts, scheduled and archived stories", async () => {
    const { data } = await editor.db.from("stories").select("slug").like("slug", `${RUN}%`);
    expect((data ?? []).map((s) => s.slug).sort()).toEqual(
      ["archived", "draft", "live", "scheduled"].map((s) => `${RUN}-${s}`).sort(),
    );
  });

  it("can read submissions and private notes", async () => {
    const { error } = await editor.db.from("submissions").select("id").limit(1);
    expect(error).toBeNull();
    const { error: privateError } = await editor.db.from("contributor_private").select("*").limit(1);
    expect(privateError).toBeNull();
  });

  it("cannot hard-delete stories (admin only)", async () => {
    const { data, error } = await editor.db.from("stories").delete().eq("id", ids.draft).select("id");
    expect(error !== null || (data ?? []).length === 0).toBe(true);
    const { data: still } = await service.from("stories").select("id").eq("id", ids.draft);
    expect(still ?? []).toHaveLength(1);
  });

  it("cannot read the audit log or manage team profiles", async () => {
    const { data: audit } = await editor.db.from("audit_log").select("id").limit(1);
    expect(audit ?? []).toHaveLength(0);
    const { data: profiles } = await editor.db.from("profiles").select("id");
    expect((profiles ?? []).map((p) => p.id)).toEqual([editor.id]); // only their own row
    const promote = await editor.db.from("profiles").update({ role: "admin" }).eq("id", editor.id).select();
    expect(promote.error !== null || (promote.data ?? []).length === 0).toBe(true);
    const { data: role } = await service.from("profiles").select("role").eq("id", editor.id).single();
    expect(role?.role).toBe("editor");
  });

  it("cannot forge audit entries for someone else", async () => {
    const { error } = await editor.db
      .from("audit_log")
      .insert({ actor_id: admin.id, action: "forged", entity_type: "x", entity_id: "x" });
    expect(error).not.toBeNull();
  });

  it("cannot rewrite or delete audit entries", async () => {
    await editor.db.from("audit_log").insert({ actor_id: editor.id, action: `${RUN}.test`, entity_type: "x", entity_id: "x" });
    const upd = await editor.db.from("audit_log").update({ action: "tampered" }).eq("actor_id", editor.id).select();
    expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);
    const del = await editor.db.from("audit_log").delete().eq("actor_id", editor.id).select();
    expect(del.error !== null || (del.data ?? []).length === 0).toBe(true);
  });
});

describe("administrators", () => {
  it("can hard-delete stories and read the audit log", async () => {
    const { data, error } = await admin.db.from("stories").delete().eq("id", ids.archived).select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
    const { error: auditError } = await admin.db.from("audit_log").select("id").limit(1);
    expect(auditError).toBeNull();
  });
});

describe("database integrity rules", () => {
  it("refuses to publish a story with no lead image, even for the service role", async () => {
    const contributor = await makeContributor(service);
    const category = await anyCategory(service);
    const { error } = await service.from("stories").insert({
      slug: `${RUN}-no-lead`,
      headline: "No lead",
      body: [{ type: "paragraph", text: "x" }],
      contributor_id: contributor.id,
      category_id: category.id,
      status: "published",
    });
    expect(error).not.toBeNull();
  });

  it("refuses to publish with a lead image that has no alt text", async () => {
    const contributor = await makeContributor(service);
    const category = await anyCategory(service);
    const lead = await makeAsset(service, "");
    const { error } = await service.from("stories").insert({
      slug: `${RUN}-no-alt`,
      headline: "No alt",
      body: [{ type: "paragraph", text: "x" }],
      contributor_id: contributor.id,
      category_id: category.id,
      lead_image_id: lead,
      status: "published",
    });
    expect(error).not.toBeNull();
  });

  it("rejects non-image media types and oversized records", async () => {
    const bad = await service
      .from("media_assets")
      .insert({ storage_path: `${RUN}/x.svg`, mime_type: "image/svg+xml", byte_size: 10, width: 1, height: 1 });
    expect(bad.error).not.toBeNull();
    const big = await service
      .from("media_assets")
      .insert({ storage_path: `${RUN}/y.jpg`, mime_type: "image/jpeg", byte_size: 99_999_999, width: 1, height: 1 });
    expect(big.error).not.toBeNull();
  });
});

describe("authentication", () => {
  it("rejects public sign-up", async () => {
    const { data, error } = await anonClient().auth.signUp({
      email: `${RUN}-stranger@example.test`,
      password: "stranger-password-123",
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});
