import { parseEmbedInput, type Block, type BlockType } from "@/lib/content/blocks";

/**
 * Loose, editable representation of a block used only inside the browser
 * editor. It is converted to the strict `Block` model on save, where empty
 * blocks are dropped; the server validates again.
 */
export type EditorBlock = {
  key: string;
  type: BlockType;
  text: string;
  level: 2 | 3;
  attribution: string;
  assetId: string;
  layout: "inline" | "wide" | "full";
  caption: string;
  ordered: boolean;
  itemsText: string;
  embedInput: string;
  embedTitle: string;
};

let counter = 0;
/** Unique key for blocks created by user interaction (client only, never during render). */
export function newKey(): string {
  counter += 1;
  return `new-${Math.random().toString(36).slice(2, 8)}-${counter}`;
}

export function emptyEditorBlock(type: BlockType): EditorBlock {
  return {
    key: newKey(),
    type,
    text: "",
    level: 2,
    attribution: "",
    assetId: "",
    layout: "inline",
    caption: "",
    ordered: false,
    itemsText: "",
    embedInput: "",
    embedTitle: "",
  };
}

export function toEditorBlocks(blocks: Block[]): EditorBlock[] {
  // Keys for blocks that exist on first render must be deterministic (index based):
  // this runs during server rendering AND hydration, and random keys would
  // produce a hydration mismatch on `id`/`htmlFor` attributes.
  return blocks.map((block, index) => {
    const base = { ...emptyEditorBlock(block.type), key: `init-${index}` };
    switch (block.type) {
      case "paragraph":
        return { ...base, text: block.text };
      case "heading":
        return { ...base, text: block.text, level: block.level };
      case "quote":
      case "pullquote":
        return { ...base, text: block.text, attribution: block.attribution ?? "" };
      case "image":
        return { ...base, assetId: block.assetId, layout: block.layout, caption: block.caption ?? "" };
      case "list":
        return { ...base, ordered: block.ordered, itemsText: block.items.join("\n") };
      case "divider":
        return base;
      case "embed":
        return {
          ...base,
          embedInput:
            block.provider === "youtube"
              ? `https://www.youtube.com/watch?v=${block.videoId}`
              : `https://vimeo.com/${block.videoId}`,
          embedTitle: block.title,
          caption: block.caption ?? "",
        };
    }
  });
}

export type ConversionIssue = { index: number; message: string };

/** Convert editor blocks to strict blocks, dropping blank ones and reporting bad ones. */
export function fromEditorBlocks(blocks: EditorBlock[]): { body: Block[]; issues: ConversionIssue[] } {
  const body: Block[] = [];
  const issues: ConversionIssue[] = [];
  blocks.forEach((block, index) => {
    const label = `Block ${index + 1}`;
    switch (block.type) {
      case "paragraph":
        if (block.text.trim()) body.push({ type: "paragraph", text: block.text.trim() });
        break;
      case "heading":
        if (block.text.trim()) body.push({ type: "heading", level: block.level, text: block.text.trim() });
        break;
      case "quote":
      case "pullquote": {
        if (!block.text.trim()) break;
        const attribution = block.attribution.trim();
        body.push({
          type: block.type,
          text: block.text.trim(),
          ...(attribution ? { attribution } : {}),
        });
        break;
      }
      case "image":
        if (!block.assetId) {
          issues.push({ index, message: `${label}: choose an image or remove the block.` });
        } else {
          const caption = block.caption.trim();
          body.push({ type: "image", assetId: block.assetId, layout: block.layout, ...(caption ? { caption } : {}) });
        }
        break;
      case "list": {
        const items = block.itemsText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
        if (items.length > 0) body.push({ type: "list", ordered: block.ordered, items });
        break;
      }
      case "divider":
        body.push({ type: "divider" });
        break;
      case "embed": {
        if (!block.embedInput.trim()) break;
        const parsed = parseEmbedInput(block.embedInput);
        if (!parsed) {
          issues.push({ index, message: `${label}: paste a YouTube or Vimeo link.` });
        } else if (!block.embedTitle.trim()) {
          issues.push({ index, message: `${label}: add a title describing the video.` });
        } else {
          const caption = block.caption.trim();
          body.push({
            type: "embed",
            provider: parsed.provider,
            videoId: parsed.videoId,
            title: block.embedTitle.trim(),
            ...(caption ? { caption } : {}),
          });
        }
        break;
      }
    }
  });
  return { body, issues };
}
