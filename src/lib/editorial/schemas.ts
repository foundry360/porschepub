import { z } from "zod";
import { bodySchema } from "@/lib/content/blocks";
import { isValidSlug } from "@/lib/slug";
import { cleanText } from "@/lib/validation/text";

/** Shared field primitives for admin input. Everything is trimmed and cleaned. */
const text = (max: number) => z.string().max(max * 4).transform((v) => cleanText(v)).pipe(z.string().max(max));
const multiline = (max: number) =>
  z.string().max(max * 4).transform((v) => cleanText(v, { multiline: true })).pipe(z.string().max(max));
const optionalText = (max: number) => text(max).transform((v) => (v === "" ? null : v));
const optionalMultiline = (max: number) => multiline(max).transform((v) => (v === "" ? null : v));
const uuid = z.string().uuid();
const optionalUuid = z
  .string()
  .transform((v) => v.trim())
  .transform((v) => (v === "" ? null : v))
  .pipe(uuid.nullable());
const slug = (max = 120) =>
  z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .refine((v) => v === "" || isValidSlug(v, max), "Use lowercase letters, numbers and hyphens only.");
const httpsUrl = z
  .string()
  .transform((v) => v.trim())
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^https:\/\/[^\s]+$/.test(v), "Must be a full https:// address.")
  .refine((v) => v === null || v.length <= 500, "Too long.");

export const storyIntents = ["save", "publish", "unpublish", "archive", "restore"] as const;
export type StoryIntent = (typeof storyIntents)[number];

export const storyInputSchema = z.object({
  id: uuid.optional(),
  intent: z.enum(storyIntents).default("save"),
  headline: text(200).refine((v) => v.length > 0, "A headline is required."),
  slug: slug(120),
  subtitle: optionalText(300),
  summary: optionalMultiline(500),
  body: bodySchema,
  categoryId: optionalUuid,
  contributorId: optionalUuid,
  leadImageId: optionalUuid,
  ogImageId: optionalUuid,
  tags: z.array(text(60).refine((v) => v.length > 0)).max(20).default([]),
  relatedIds: z.array(uuid).max(6).default([]),
  seoTitle: optionalText(120),
  seoDescription: optionalText(320),
  canonicalUrlOverride: httpsUrl,
  /** ISO timestamp, or null to mean "now" on publish. */
  publishedAt: z
    .string()
    .transform((v) => v.trim())
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Enter a valid date and time.")
    .transform((v) => (v === null ? null : new Date(v).toISOString())),
});

export type StoryInput = z.infer<typeof storyInputSchema>;

export const contributorInputSchema = z.object({
  id: uuid.optional(),
  name: text(120).refine((v) => v.length > 0, "A name is required."),
  slug: slug(80),
  descriptor: optionalText(160),
  bio: optionalMultiline(3000),
  avatarAssetId: optionalUuid,
  coverAssetId: optionalUuid,
  expertise: z.array(text(60).refine((v) => v.length > 0)).max(12).default([]),
  websiteUrl: httpsUrl,
  socialUrl: httpsUrl,
  profileVisible: z.boolean().default(false),
  isHighlighted: z.boolean().default(false),
  // Private editorial data (never public).
  email: optionalText(254),
  notes: optionalMultiline(3000),
});
export type ContributorInput = z.infer<typeof contributorInputSchema>;

export const categoryInputSchema = z.object({
  id: uuid.optional(),
  name: text(80).refine((v) => v.length > 0, "A name is required."),
  slug: slug(80),
  description: optionalMultiline(600),
  sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const pageInputSchema = z.object({
  id: uuid,
  title: text(160).refine((v) => v.length > 0, "A title is required."),
  summary: optionalMultiline(500),
  body: bodySchema,
  legalReviewed: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  seoTitle: optionalText(120),
  seoDescription: optionalText(320),
});
export type PageInput = z.infer<typeof pageInputSchema>;

export const mediaMetadataSchema = z.object({
  altText: text(500),
  caption: optionalText(500),
  credit: optionalText(200),
  licenseNote: optionalMultiline(1000),
  sourceNote: optionalMultiline(1000),
});
export type MediaMetadataInput = z.infer<typeof mediaMetadataSchema>;

export const heroSettingSchema = z.object({
  kicker: text(60),
  headline: text(120).refine((v) => v.length > 0, "A headline is required."),
  intro: multiline(300),
});
export type HeroSettingInput = z.infer<typeof heroSettingSchema>;

export const submissionDecisionSchema = z.object({
  submissionId: uuid,
  status: z.enum(["submitted", "in_review", "accepted", "declined", "published"]),
  note: optionalMultiline(2000),
  storyId: optionalUuid,
});
export type SubmissionDecisionInput = z.infer<typeof submissionDecisionSchema>;

/** Flatten Zod issues to `{ "field.path": "message" }` for form display. */
export function flattenIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
