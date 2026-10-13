import { describe, expect, it } from "vitest";
import { bodySchema } from "@/lib/content/blocks";
import { emptyEditorBlock, fromEditorBlocks, toEditorBlocks } from "@/lib/editorial/editor-blocks";

const ASSET = "6f1c2c0a-3c1f-4b8e-9d55-0a1b2c3d4e5f";

describe("editor block conversion", () => {
  it("round-trips every block type", () => {
    const body = bodySchema.parse([
      { type: "paragraph", text: "P" },
      { type: "heading", level: 3, text: "H" },
      { type: "quote", text: "Q", attribution: "A" },
      { type: "pullquote", text: "PQ" },
      { type: "image", assetId: ASSET, layout: "wide", caption: "Cap" },
      { type: "list", ordered: true, items: ["a", "b"] },
      { type: "divider" },
      { type: "embed", provider: "youtube", videoId: "dQw4w9WgXcQ", title: "T", caption: "C" },
    ]);
    const { body: out, issues } = fromEditorBlocks(toEditorBlocks(body));
    expect(issues).toEqual([]);
    expect(out).toEqual(body);
  });

  it("produces deterministic keys for initial blocks (hydration-safe)", () => {
    const body = bodySchema.parse([{ type: "paragraph", text: "x" }, { type: "divider" }]);
    expect(toEditorBlocks(body).map((b) => b.key)).toEqual(["init-0", "init-1"]);
    expect(toEditorBlocks(body).map((b) => b.key)).toEqual(["init-0", "init-1"]);
  });

  it("drops blank text blocks instead of failing validation", () => {
    const blocks = [emptyEditorBlock("paragraph"), { ...emptyEditorBlock("paragraph"), text: "kept" }, emptyEditorBlock("list")];
    const { body, issues } = fromEditorBlocks(blocks);
    expect(issues).toEqual([]);
    expect(body).toEqual([{ type: "paragraph", text: "kept" }]);
  });

  it("reports an image block with no image", () => {
    const { issues } = fromEditorBlocks([emptyEditorBlock("image")]);
    expect(issues).toHaveLength(1);
  });

  it("reports embeds that aren't YouTube/Vimeo links or lack a title", () => {
    const bad = { ...emptyEditorBlock("embed"), embedInput: "https://evil.example/x", embedTitle: "t" };
    expect(fromEditorBlocks([bad]).issues).toHaveLength(1);
    const noTitle = { ...emptyEditorBlock("embed"), embedInput: "https://youtu.be/dQw4w9WgXcQ" };
    expect(fromEditorBlocks([noTitle]).issues).toHaveLength(1);
  });

  it("always yields a body that passes the strict schema", () => {
    const blocks = [
      { ...emptyEditorBlock("paragraph"), text: "  padded  " },
      { ...emptyEditorBlock("list"), itemsText: "one\n\n  two  \n" },
      { ...emptyEditorBlock("quote"), text: "q", attribution: "   " },
    ];
    const { body } = fromEditorBlocks(blocks);
    expect(() => bodySchema.parse(body)).not.toThrow();
    expect(body[1]).toEqual({ type: "list", ordered: false, items: ["one", "two"] });
    expect(body[2]).toEqual({ type: "quote", text: "q" });
  });
});
