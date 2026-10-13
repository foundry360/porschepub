import { z } from "zod";
import { cleanText, countLinks, normalizeEmail, normalizePublicUrl } from "./text";

export const SUBMISSION_LIMITS = {
  name: { min: 2, max: 120 },
  title: { min: 4, max: 200 },
  subject: { min: 2, max: 200 },
  pitch: { min: 80, max: 5000 },
  additionalInfo: { max: 3000 },
  maxLinksInText: 3,
} as const;

/**
 * Optional photos. The browser downsizes each photo before sending so the whole
 * request stays well under the hosting platform's ~4.5 MB body limit; the server
 * re-checks everything and re-encodes the files.
 */
export const SUBMISSION_IMAGE_LIMITS = {
  maxCount: 4,
  maxBytesEach: 1024 * 1024,
  maxTotalBytes: 3.6 * 1024 * 1024,
  maxEdge: 2000,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export type SubmissionFieldName =
  | "images"
  | "name"
  | "email"
  | "title"
  | "subject"
  | "categoryId"
  | "pitch"
  | "portfolioUrl"
  | "additionalInfo"
  | "consent";

/** Raw field values as they arrive from a <form>. Everything is optional text. */
export const rawSubmissionSchema = z.object({
  name: z.string().max(1000).default(""),
  email: z.string().max(1000).default(""),
  title: z.string().max(2000).default(""),
  subject: z.string().max(2000).default(""),
  categoryId: z.string().max(100).default(""),
  pitch: z.string().max(20000).default(""),
  portfolioUrl: z.string().max(2000).default(""),
  additionalInfo: z.string().max(20000).default(""),
  consent: z.string().max(20).default(""),
  /** Honeypot: real users never see or fill this field. */
  website: z.string().max(1000).default(""),
  /** Milliseconds between form render and submit (client-reported). */
  elapsedMs: z.string().max(20).default(""),
  turnstileToken: z.string().max(4096).default(""),
});

export type RawSubmission = z.infer<typeof rawSubmissionSchema>;

export type ValidSubmission = {
  name: string;
  email: string;
  title: string;
  subject: string;
  categoryId: string | null;
  pitch: string;
  portfolioUrl: string | null;
  additionalInfo: string | null;
};

export type SubmissionFieldErrors = Partial<Record<SubmissionFieldName, string>>;

export type SubmissionValidation =
  | { ok: true; data: ValidSubmission }
  | { ok: false; errors: SubmissionFieldErrors };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate and normalise a submission. Pure and synchronous so the exact same
 * rules run in the browser (for fast feedback) and on the server (authoritative).
 */
export function validateSubmission(raw: RawSubmission): SubmissionValidation {
  const errors: SubmissionFieldErrors = {};
  const L = SUBMISSION_LIMITS;

  const name = cleanText(raw.name);
  if (name.length < L.name.min) errors.name = "Please enter your name.";
  else if (name.length > L.name.max) errors.name = `Please keep your name under ${L.name.max} characters.`;

  const email = normalizeEmail(raw.email);
  if (!email) errors.email = "Please enter a valid email address.";

  const title = cleanText(raw.title);
  if (title.length < L.title.min) errors.title = "Please give your story a working title.";
  else if (title.length > L.title.max) errors.title = `Please keep the title under ${L.title.max} characters.`;

  const subject = cleanText(raw.subject);
  if (subject.length < L.subject.min) errors.subject = "Tell us which Porsche or subject the story is about.";
  else if (subject.length > L.subject.max) errors.subject = `Please keep this under ${L.subject.max} characters.`;

  const categoryRaw = cleanText(raw.categoryId);
  let categoryId: string | null = null;
  if (categoryRaw.length === 0) errors.categoryId = "Please choose the category that fits best.";
  else if (!UUID.test(categoryRaw)) errors.categoryId = "Please choose a category from the list.";
  else categoryId = categoryRaw.toLowerCase();

  const pitch = cleanText(raw.pitch, { multiline: true });
  if (pitch.length < L.pitch.min) {
    errors.pitch = `Please tell us a little more (at least ${L.pitch.min} characters).`;
  } else if (pitch.length > L.pitch.max) {
    errors.pitch = `Please keep your story under ${L.pitch.max} characters.`;
  } else if (countLinks(pitch) > L.maxLinksInText) {
    errors.pitch = "Please keep links to a minimum. You can add more detail once we reply.";
  }

  let portfolioUrl: string | null = null;
  const portfolioRaw = cleanText(raw.portfolioUrl);
  if (portfolioRaw.length > 0) {
    portfolioUrl = normalizePublicUrl(portfolioRaw);
    if (!portfolioUrl) errors.portfolioUrl = "Please enter a valid web address, such as https://example.com.";
  }

  const additionalRaw = cleanText(raw.additionalInfo, { multiline: true });
  let additionalInfo: string | null = null;
  if (additionalRaw.length > L.additionalInfo.max) {
    errors.additionalInfo = `Please keep this under ${L.additionalInfo.max} characters.`;
  } else if (countLinks(additionalRaw) > L.maxLinksInText) {
    errors.additionalInfo = "Please keep links to a minimum.";
  } else if (additionalRaw.length > 0) {
    additionalInfo = additionalRaw;
  }

  if (raw.consent !== "on" && raw.consent !== "true") {
    errors.consent = "Please confirm that you accept the submission terms.";
  }

  if (Object.keys(errors).length > 0 || !email) return { ok: false, errors };

  return {
    ok: true,
    data: { name, email, title, subject, categoryId, pitch, portfolioUrl, additionalInfo },
  };
}

/** Convert FormData to the raw shape without trusting any field type. */
export function rawSubmissionFromFormData(formData: FormData): RawSubmission {
  const out: Record<string, string> = {};
  for (const key of Object.keys(rawSubmissionSchema.shape)) {
    const value = formData.get(key);
    out[key] = typeof value === "string" ? value : "";
  }
  return rawSubmissionSchema.parse(out);
}

/** Heuristic bot signals. Returns a reason string, or null for a likely human. */
export function detectBotSignals(raw: RawSubmission, minFillSeconds: number): string | null {
  if (raw.website.trim().length > 0) return "honeypot";
  const elapsed = Number.parseInt(raw.elapsedMs, 10);
  // Timing is reported by client script. Without JavaScript it is absent, which
  // is not treated as a bot signal (rate limiting still applies).
  if (Number.isFinite(elapsed) && elapsed < minFillSeconds * 1000) return "too-fast";
  return null;
}
