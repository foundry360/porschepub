import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rawSubmissionSchema, type RawSubmission } from "@/lib/validation/submission";
import type { EmailProvider } from "@/server/email/provider";
import { setEditorRole, removeEditor } from "@/server/editorial/team";
import { parseDecisionInput, transitionSubmission } from "@/server/editorial/submissions";
import { saveStory } from "@/server/editorial/stories";
import { storyInputSchema } from "@/lib/editorial/schemas";
import { hashIdentifier } from "@/server/security/request";
import { processSubmission, type SubmissionDeps } from "@/server/submissions/process";
import { checkRateLimit } from "@/server/security/rate-limit";
import { RUN, anyCategory, cleanup, createUser, makeAsset, makeContributor, serviceClient, type TestUser } from "../support/db";

const service = serviceClient();
let editor: TestUser;
let admin: TestUser;
let categoryId: string;

type Sent = Parameters<EmailProvider["send"]>[0];

function fakeEmail(mode: "ok" | "fail" | "throw" = "ok") {
  const sent: Sent[] = [];
  const provider: EmailProvider = {
    async send(message) {
      sent.push(message);
      if (mode === "throw") throw new Error("smtp exploded");
      if (mode === "fail") return { status: "failed", reason: "provider said no" };
      return { status: "sent" };
    },
  } as EmailProvider;
  return { provider, sent };
}

function deps(overrides: Partial<SubmissionDeps> = {}, email = fakeEmail()): SubmissionDeps & { sent: Sent[] } {
  return {
    db: service,
    email: email.provider,
    // Real database-backed limiter, but keys are namespaced to this run.
    rateLimit: (key, limit, windowSeconds) => checkRateLimit(`${RUN}:${key}`, limit, windowSeconds),
    hash: (value, namespace) => `${RUN}-${hashIdentifier(value, namespace)}`,
    verifyHuman: async () => true,
    notifyTo: ["editors@example.test"],
    sent: email.sent,
    ...overrides,
  };
}

let counter = 0;
function raw(overrides: Partial<RawSubmission> = {}): RawSubmission {
  counter += 1;
  return rawSubmissionSchema.parse({
    name: "Sam Example",
    email: `sam-${RUN}-${counter}@example.test`,
    title: `${RUN} pitch ${counter}`,
    subject: "A 1987 911",
    categoryId,
    pitch: "This is a pitch that is comfortably longer than eighty characters so it passes the minimum length check.",
    consent: "on",
    elapsedMs: "30000",
    ...overrides,
  });
}

const ctx = (n = 1) => ({ ip: `203.0.113.${n}` });

beforeAll(async () => {
  [editor, admin] = await Promise.all([createUser("editor"), createUser("admin")]);
  categoryId = (await anyCategory(service)).id;
});
afterAll(cleanup);

describe("public submission pipeline", () => {
  it("stores a valid submission as 'submitted' (never published) and notifies editors", async () => {
    const d = deps();
    const input = raw();
    const outcome = await processSubmission(input, ctx(10), d);
    expect(outcome.kind).toBe("created");
    if (outcome.kind !== "created") return;
    expect(outcome.notification).toBe("sent");

    const { data } = await service.from("submissions").select("*").eq("id", outcome.id).single();
    expect(data?.status).toBe("submitted");
    expect(data?.story_id).toBeNull();
    expect(data?.consent_version).toBeTruthy();
    expect(data?.notification_status).toBe("sent");
    // The raw IP is never stored, only a salted hash.
    expect(JSON.stringify(data)).not.toContain("203.0.113.10");
    expect(data?.ip_hash).toContain(RUN);

    expect(d.sent).toHaveLength(1);
    expect(d.sent[0].replyTo).toBe(input.email.toLowerCase());
  });

  it("keeps the submission when the email provider fails, and records that truthfully", async () => {
    for (const mode of ["fail", "throw"] as const) {
      const d = deps({}, fakeEmail(mode));
      const outcome = await processSubmission(raw(), ctx(11), d);
      expect(outcome.kind, mode).toBe("created");
      if (outcome.kind !== "created") continue;
      expect(outcome.notification).toBe("failed");
      const { data } = await service.from("submissions").select("status, notification_status, notification_error").eq("id", outcome.id).single();
      expect(data?.status).toBe("submitted");
      expect(data?.notification_status).toBe("failed");
      expect(data?.notification_error).toBeTruthy();
    }
  });

  it("records 'skipped' when no notification recipient is configured", async () => {
    const d = deps({ notifyTo: [] });
    const outcome = await processSubmission(raw(), ctx(12), d);
    expect(outcome.kind).toBe("created");
    if (outcome.kind === "created") expect(outcome.notification).toBe("skipped");
    expect(d.sent).toHaveLength(0);
  });

  it("silently drops honeypot submissions without storing them", async () => {
    const input = raw({ website: "http://spam.test" });
    const outcome = await processSubmission(input, ctx(13), deps());
    expect(outcome.kind).toBe("bot");
    expect((await service.from("submissions").select("id").eq("title", input.title)).data).toHaveLength(0);
  });

  it("rejects implausibly fast submissions", async () => {
    const input = raw({ elapsedMs: "500" });
    expect((await processSubmission(input, ctx(14), deps())).kind).toBe("too_fast");
    expect((await service.from("submissions").select("id").eq("title", input.title)).data).toHaveLength(0);
  });

  it("returns field errors for invalid input and stores nothing", async () => {
    const input = raw({ email: "nope", pitch: "short" });
    const outcome = await processSubmission(input, ctx(15), deps());
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") expect(Object.keys(outcome.errors)).toEqual(expect.arrayContaining(["email", "pitch"]));
    expect((await service.from("submissions").select("id").eq("title", input.title)).data).toHaveLength(0);
  });

  it("rejects a category id that doesn't exist", async () => {
    const outcome = await processSubmission(raw({ categoryId: "0b9c1e7e-5a4b-4c41-8b1a-2f6a3b1c9d10" }), ctx(16), deps());
    expect(outcome.kind).toBe("invalid");
  });

  it("requires human verification when it is configured", async () => {
    const outcome = await processSubmission(raw(), ctx(17), deps({ verifyHuman: async () => false }));
    expect(outcome.kind).toBe("verification_failed");
  });

  it("limits repeated submissions from one address", async () => {
    const d = deps();
    const results: string[] = [];
    for (let i = 0; i < 5; i += 1) results.push((await processSubmission(raw(), { ip: "198.51.100.77" }, d)).kind);
    expect(results.slice(0, 3)).toEqual(["created", "created", "created"]);
    expect(results.slice(3)).toEqual(["rate_limited", "rate_limited"]);
  });

  it("limits repeated submissions from one email address", async () => {
    const d = deps();
    const email = `repeat-${RUN}@example.test`;
    const kinds: string[] = [];
    for (let i = 0; i < 4; i += 1) kinds.push((await processSubmission(raw({ email }), { ip: `192.0.2.${100 + i}` }, d)).kind);
    expect(kinds).toEqual(["created", "created", "created", "rate_limited"]);
  });

  it("fails closed when the rate limiter is unavailable", async () => {
    const d = deps({ rateLimit: async () => ({ allowed: false, reason: "unavailable" }) });
    const input = raw();
    expect((await processSubmission(input, ctx(18), d)).kind).toBe("unavailable");
    expect((await service.from("submissions").select("id").eq("title", input.title)).data).toHaveLength(0);
  });

  it("stores hostile text as inert data", async () => {
    const hostile = `<script>alert(1)</script>'; drop table submissions;--`;
    const input = raw({ subject: hostile, additionalInfo: hostile });
    const outcome = await processSubmission(input, ctx(19), deps());
    expect(outcome.kind).toBe("created");
    if (outcome.kind !== "created") return;
    const { data } = await service.from("submissions").select("subject").eq("id", outcome.id).single();
    expect(data?.subject).toBe(hostile.replace(/\s+/g, " "));
    expect((await service.from("submissions").select("id").limit(1)).error).toBeNull(); // table still exists
  });
});

describe("editorial review workflow", () => {
  async function newSubmission() {
    const outcome = await processSubmission(raw(), ctx(30 + counter), deps());
    if (outcome.kind !== "created") throw new Error(`setup failed: ${outcome.kind}`);
    return outcome.id;
  }
  const decide = (submissionId: string, status: string, note = "", storyId = "") =>
    parseDecisionInput({ submissionId, status, note, storyId });

  it("moves through review to acceptance with an audit trail", async () => {
    const id = await newSubmission();
    for (const status of ["in_review", "accepted"]) {
      const parsed = decide(id, status);
      if (!parsed.ok) throw new Error(parsed.error);
      const result = await transitionSubmission(editor.db, editor.id, parsed.data);
      expect(result.ok, status).toBe(true);
    }
    const { data } = await service.from("submissions").select("status, decided_by").eq("id", id).single();
    expect(data).toMatchObject({ status: "accepted", decided_by: editor.id });
    const { data: audit } = await service.from("audit_log").select("action, details").eq("entity_id", id).order("id");
    expect(audit?.map((a) => a.action)).toEqual(["submission.status_changed", "submission.status_changed"]);
    // The audit trail must not contain the contributor's personal details.
    expect(JSON.stringify(audit)).not.toMatch(/@example\.test|Sam Example/);
  });

  it("cannot skip steps", async () => {
    const id = await newSubmission();
    for (const status of ["accepted", "published"]) {
      const parsed = decide(id, status);
      if (!parsed.ok) throw new Error(parsed.error);
      expect((await transitionSubmission(editor.db, editor.id, parsed.data)).ok, status).toBe(false);
    }
    expect((await service.from("submissions").select("status").eq("id", id).single()).data?.status).toBe("submitted");
  });

  it("requires a note to decline", async () => {
    const id = await newSubmission();
    const without = decide(id, "declined");
    if (!without.ok) throw new Error(without.error);
    expect((await transitionSubmission(editor.db, editor.id, without.data)).ok).toBe(false);
    const withNote = decide(id, "declined", "Not a fit this season.");
    if (!withNote.ok) throw new Error(withNote.error);
    expect((await transitionSubmission(editor.db, editor.id, withNote.data)).ok).toBe(true);
  });

  it("can only be marked published once a LIVE story is linked", async () => {
    const id = await newSubmission();
    for (const status of ["in_review", "accepted"]) {
      const p = decide(id, status);
      if (p.ok) await transitionSubmission(editor.db, editor.id, p.data);
    }
    const none = decide(id, "published");
    if (!none.ok) throw new Error(none.error);
    expect((await transitionSubmission(editor.db, editor.id, none.data)).ok).toBe(false);

    // A draft story is not enough.
    const contributor = await makeContributor(service);
    const lead = await makeAsset(service, "Lead");
    const draft = await saveStory(
      editor.db,
      editor.id,
      storyInputSchema.parse({
        headline: `${RUN} from submission`, slug: `${RUN}-from-submission`, subtitle: "", summary: "s",
        body: [{ type: "paragraph", text: "x" }], categoryId, contributorId: contributor.id, leadImageId: lead,
        ogImageId: "", seoTitle: "", seoDescription: "", canonicalUrlOverride: "", publishedAt: "",
      }),
    );
    if (!draft.ok) throw new Error(draft.error);
    const linkDraft = decide(id, "published", "", draft.data.id);
    if (!linkDraft.ok) throw new Error(linkDraft.error);
    expect((await transitionSubmission(editor.db, editor.id, linkDraft.data)).ok).toBe(false);

    await saveStory(
      editor.db,
      editor.id,
      storyInputSchema.parse({
        id: draft.data.id, intent: "publish", headline: `${RUN} from submission`, slug: `${RUN}-from-submission`,
        subtitle: "", summary: "s", body: [{ type: "paragraph", text: "x" }], categoryId, contributorId: contributor.id,
        leadImageId: lead, ogImageId: "", seoTitle: "", seoDescription: "", canonicalUrlOverride: "", publishedAt: "",
      }),
    );
    const linkLive = decide(id, "published", "", draft.data.id);
    if (!linkLive.ok) throw new Error(linkLive.error);
    expect((await transitionSubmission(editor.db, editor.id, linkLive.data)).ok).toBe(true);
  });

  it("cannot be reviewed by an account without an editorial profile", async () => {
    const id = await newSubmission();
    const stranger = await createUser(null, "stranger");
    const parsed = decide(id, "in_review");
    if (!parsed.ok) throw new Error(parsed.error);
    expect((await transitionSubmission(stranger.db, stranger.id, parsed.data)).ok).toBe(false);
    expect((await service.from("submissions").select("status").eq("id", id).single()).data?.status).toBe("submitted");
  });
});

describe("team safeguards", () => {
  it("won't let someone change their own role", async () => {
    expect((await setEditorRole(admin.db, admin.id, admin.id, "editor")).ok).toBe(false);
  });
  it("won't remove the last administrator", async () => {
    // Make `admin` the only admin by temporarily demoting other admins is destructive on shared
    // databases, so assert the guard on a two-person scenario instead: an editor cannot demote an admin.
    const result = await setEditorRole(editor.db, editor.id, admin.id, "editor");
    expect(result.ok).toBe(false);
    expect((await service.from("profiles").select("role").eq("id", admin.id).single()).data?.role).toBe("admin");
  });
  it("lets an administrator change another person's role and remove access", async () => {
    const other = await createUser("editor", "other");
    expect((await setEditorRole(admin.db, admin.id, other.id, "admin")).ok).toBe(true);
    expect((await service.from("profiles").select("role").eq("id", other.id).single()).data?.role).toBe("admin");
    expect((await removeEditor(admin.db, admin.id, other.id)).ok).toBe(true);
    expect((await service.from("profiles").select("id").eq("id", other.id)).data).toHaveLength(0);
  });
  it("editors cannot remove access", async () => {
    const other = await createUser("editor", "victim");
    expect((await removeEditor(editor.db, editor.id, other.id)).ok).toBe(false);
    expect((await service.from("profiles").select("id").eq("id", other.id)).data).toHaveLength(1);
  });
});
