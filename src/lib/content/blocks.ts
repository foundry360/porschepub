import { z } from "zod";
import { inlineToPlainText } from "./inline";

/**
 * Structured story/page body model.
 *
 * Bodies are an ordered array of typed blocks. There is intentionally no raw
 * HTML block. Embeds are restricted to an allow-list of providers and stored as
 * identifiers (never as markup), so the renderer builds the iframe URL itself.
 *
 * New formats (audio, galleries, interviews) are added as new block types
 * without touching existing content.
 */

const text = (max: number) => z.string().trim().min(1).max(max);

export const paragraphBlock = z.object({
  type: z.literal("paragraph"),
  text: text(8000),
});

export const headingBlock = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3)]),
  text: text(200),
});

export const quoteBlock = z.object({
  type: z.literal("quote"),
  text: text(2000),
  attribution: z.string().trim().max(160).optional(),
});

export const pullquoteBlock = z.object({
  type: z.literal("pullquote"),
  text: text(400),
  attribution: z.string().trim().max(160).optional(),
});

export const imageBlock = z.object({
  type: z.literal("image"),
  assetId: z.string().uuid(),
  layout: z.enum(["inline", "wide", "full"]).default("inline"),
  /** Overrides the asset's default caption for this placement only. */
  caption: z.string().trim().max(500).optional(),
});

export const listBlock = z.object({
  type: z.literal("list"),
  ordered: z.boolean().default(false),
  items: z.array(text(1000)).min(1).max(50),
});

export const dividerBlock = z.object({ type: z.literal("divider") });

export const EMBED_PROVIDERS = ["youtube", "vimeo"] as const;

export const embedBlock = z.object({
  type: z.literal("embed"),
  provider: z.enum(EMBED_PROVIDERS),
  /** Provider video id only, e.g. "dQw4w9WgXcQ" or "76979871". */
  videoId: z.string().trim().regex(/^[A-Za-z0-9_-]{4,40}$/),
  title: text(200),
  caption: z.string().trim().max(500).optional(),
});

export const blockSchema = z.discriminatedUnion("type", [
  paragraphBlock,
  headingBlock,
  quoteBlock,
  pullquoteBlock,
  imageBlock,
  listBlock,
  dividerBlock,
  embedBlock,
]);

export const bodySchema = z.array(blockSchema).max(500);

export type Block = z.infer<typeof blockSchema>;
export type ImageBlock = z.infer<typeof imageBlock>;
export type Body = z.infer<typeof bodySchema>;
export type BlockType = Block["type"];

export const BLOCK_TYPES: BlockType[] = [
  "paragraph",
  "heading",
  "quote",
  "pullquote",
  "image",
  "list",
  "divider",
  "embed",
];

/**
 * Parse a stored body leniently for rendering. Blocks that no longer validate
 * are skipped (and counted) rather than crashing a public page.
 */
export function parseBodyForRender(raw: unknown): { blocks: Block[]; skipped: number } {
  if (!Array.isArray(raw)) return { blocks: [], skipped: 0 };
  const blocks: Block[] = [];
  let skipped = 0;
  for (const candidate of raw) {
    const parsed = blockSchema.safeParse(candidate);
    if (parsed.success) blocks.push(parsed.data);
    else skipped += 1;
  }
  return { blocks, skipped };
}

/** Strict parse used on every write path. */
export function parseBodyStrict(raw: unknown): Body {
  return bodySchema.parse(raw);
}

export function embedUrl(block: Extract<Block, { type: "embed" }>): string {
  if (block.provider === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(block.videoId)}`;
  }
  return `https://player.vimeo.com/video/${encodeURIComponent(block.videoId)}?dnt=1`;
}

/** Extract a provider video id from a pasted URL (or accept a bare id). */
export function parseEmbedInput(
  input: string,
): { provider: (typeof EMBED_PROVIDERS)[number]; videoId: string } | null {
  const value = input.trim();
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1);
      return /^[A-Za-z0-9_-]{4,40}$/.test(id) ? { provider: "youtube", videoId: id } : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const id = url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop() ?? "";
      return /^[A-Za-z0-9_-]{4,40}$/.test(id) ? { provider: "youtube", videoId: id } : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean).pop() ?? "";
      return /^\d{4,20}$/.test(id) ? { provider: "vimeo", videoId: id } : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function blocksToPlainText(blocks: readonly Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
      case "heading":
        parts.push(inlineToPlainText(block.text));
        break;
      case "quote":
      case "pullquote":
        parts.push(inlineToPlainText(block.text));
        if (block.attribution) parts.push(block.attribution);
        break;
      case "list":
        parts.push(...block.items.map(inlineToPlainText));
        break;
      case "image":
        if (block.caption) parts.push(block.caption);
        break;
      case "embed":
        parts.push(block.title);
        if (block.caption) parts.push(block.caption);
        break;
      case "divider":
        break;
    }
  }
  return parts.join("\n").replace(/\s+\n/g, "\n").trim();
}

const WORDS_PER_MINUTE = 220;

export function countWords(plainText: string): number {
  const matches = plainText.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return matches ? matches.length : 0;
}

/** Estimated reading time in whole minutes, never less than one. */
export function estimateReadingMinutes(plainText: string, imageCount = 0): number {
  const words = countWords(plainText);
  const seconds = (words / WORDS_PER_MINUTE) * 60 + imageCount * 8;
  return Math.min(240, Math.max(1, Math.ceil(seconds / 60)));
}

export function collectImageAssetIds(blocks: readonly Block[]): string[] {
  const ids = new Set<string>();
  for (const block of blocks) {
    if (block.type === "image") ids.add(block.assetId);
  }
  return [...ids];
}

/** First paragraph text, used as a last-resort description. */
export function firstParagraph(blocks: readonly Block[]): string | null {
  for (const block of blocks) {
    if (block.type === "paragraph") return inlineToPlainText(block.text);
  }
  return null;
}
