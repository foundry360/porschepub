"use client";

/* eslint-disable @next/next/no-img-element -- admin thumbnail */
import { useState } from "react";
import type { BlockType } from "@/lib/content/blocks";
import { emptyEditorBlock, type EditorBlock } from "@/lib/editorial/editor-blocks";
import { MediaPicker, type PickedImage } from "./media-picker";
import { buttonSecondaryClass, inputClass } from "./ui";
import type { ImageInfo } from "./image-field";

const TYPE_LABEL: Record<BlockType, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  quote: "Quote",
  pullquote: "Pull quote",
  image: "Image",
  list: "List",
  divider: "Divider",
  embed: "Video",
};

const ADD_ORDER: BlockType[] = ["paragraph", "heading", "image", "quote", "pullquote", "list", "embed", "divider"];

export function BlockEditor({
  blocks,
  onChange,
  images,
  onImageKnown,
  label = "Story body",
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  images: Record<string, ImageInfo>;
  onImageKnown: (image: ImageInfo) => void;
  label?: string;
}) {
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const update = (key: string, patch: Partial<EditorBlock>) =>
    onChange(blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const remove = (key: string) => onChange(blocks.filter((b) => b.key !== key));
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const add = (type: BlockType, at?: number) => {
    const next = [...blocks];
    next.splice(at ?? next.length, 0, emptyEditorBlock(type));
    onChange(next);
  };

  return (
    <div>
      <p className="mb-2 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-charcoal" id="body-label">
        {label}
      </p>
      <ol aria-labelledby="body-label" className="space-y-3">
        {blocks.length === 0 ? (
          <li className="border border-dashed border-line bg-surface px-5 py-8 text-center text-stone">
            Nothing here yet. Add a paragraph to begin.
          </li>
        ) : null}
        {blocks.map((block, index) => (
          <li key={block.key} className="border border-line bg-surface">
            <div className="flex items-center justify-between gap-2 border-b border-line bg-paper-deep px-3 py-1.5">
              <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-stone">
                {index + 1}. {TYPE_LABEL[block.type]}
              </span>
              <span className="flex gap-1 text-[0.8rem]">
                <IconButton label={`Move block ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                  ↑
                </IconButton>
                <IconButton label={`Move block ${index + 1} down`} disabled={index === blocks.length - 1} onClick={() => move(index, 1)}>
                  ↓
                </IconButton>
                <IconButton label={`Remove block ${index + 1}`} onClick={() => remove(block.key)}>
                  ✕
                </IconButton>
              </span>
            </div>
            <div className="space-y-3 p-3">
              <BlockFields
                block={block}
                index={index}
                images={images}
                update={(patch) => update(block.key, patch)}
                chooseImage={() => setPickerFor(block.key)}
              />
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4" role="group" aria-label="Add a block">
        <p className="mb-2 text-[0.78rem] text-stone">Add a block</p>
        <div className="flex flex-wrap gap-2">
          {ADD_ORDER.map((type) => (
            <button key={type} type="button" onClick={() => add(type)} className={buttonSecondaryClass}>
              + {TYPE_LABEL[type]}
            </button>
          ))}
        </div>
      </div>

      <MediaPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={(image: PickedImage) => {
          onImageKnown(image);
          if (pickerFor) update(pickerFor, { assetId: image.id });
          setPickerFor(null);
        }}
      />
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="h-8 w-8 border border-line bg-surface hover:border-ink disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-accent"
    >
      {children}
    </button>
  );
}

function BlockFields({
  block,
  index,
  images,
  update,
  chooseImage,
}: {
  block: EditorBlock;
  index: number;
  images: Record<string, ImageInfo>;
  update: (patch: Partial<EditorBlock>) => void;
  chooseImage: () => void;
}) {
  const id = `block-${block.key}`;
  switch (block.type) {
    case "paragraph":
      return (
        <div>
          <label htmlFor={id} className="sr-only">
            Paragraph {index + 1}
          </label>
          <textarea
            id={id}
            rows={Math.max(4, Math.min(14, Math.ceil(block.text.length / 90) + 2))}
            value={block.text}
            onChange={(e) => update({ text: e.target.value })}
            maxLength={8000}
            className={`${inputClass} font-serif text-[1.05rem] leading-relaxed`}
          />
          <p className="mt-1 text-[0.75rem] text-stone">
            Formatting: **bold**, *italic*, [link text](https://example.com)
          </p>
        </div>
      );
    case "heading":
      return (
        <div className="flex gap-2">
          <label htmlFor={`${id}-level`} className="sr-only">
            Heading level
          </label>
          <select
            id={`${id}-level`}
            value={block.level}
            onChange={(e) => update({ level: Number(e.target.value) === 3 ? 3 : 2 })}
            className={`${inputClass} w-32`}
          >
            <option value={2}>Section</option>
            <option value={3}>Subsection</option>
          </select>
          <label htmlFor={id} className="sr-only">
            Heading text
          </label>
          <input id={id} value={block.text} onChange={(e) => update({ text: e.target.value })} maxLength={200} className={`${inputClass} font-display text-[1.2rem]`} />
        </div>
      );
    case "quote":
    case "pullquote":
      return (
        <div className="space-y-2">
          <label htmlFor={id} className="sr-only">
            Quote text
          </label>
          <textarea id={id} rows={3} value={block.text} onChange={(e) => update({ text: e.target.value })} maxLength={block.type === "pullquote" ? 400 : 2000} className={`${inputClass} font-serif italic`} />
          <label htmlFor={`${id}-attr`} className="sr-only">
            Attribution
          </label>
          <input id={`${id}-attr`} value={block.attribution} onChange={(e) => update({ attribution: e.target.value })} placeholder="Attribution (optional). Only attribute quotes someone actually said." maxLength={160} className={inputClass} />
        </div>
      );
    case "image": {
      const image = block.assetId ? images[block.assetId] : undefined;
      return (
        <div className="space-y-3">
          {image ? (
            <div className="flex items-start gap-4">
              <img src={image.url} alt={image.alt} className="h-24 w-32 border border-line object-cover" />
              <p className="text-[0.85rem] text-stone">
                {image.alt || <span className="font-medium text-accent">No alt text. Add it in the media library.</span>}
              </p>
            </div>
          ) : block.assetId ? (
            <p className="text-[0.85rem] text-stone">Image selected.</p>
          ) : null}
          <button type="button" onClick={chooseImage} className={buttonSecondaryClass}>
            {block.assetId ? "Change image" : "Choose image"}
          </button>
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <div>
              <label htmlFor={`${id}-layout`} className="mb-1 block text-[0.75rem] text-stone">
                Layout
              </label>
              <select id={`${id}-layout`} value={block.layout} onChange={(e) => update({ layout: e.target.value as EditorBlock["layout"] })} className={inputClass}>
                <option value="inline">Inline</option>
                <option value="wide">Wide</option>
                <option value="full">Full width</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-caption`} className="mb-1 block text-[0.75rem] text-stone">
                Caption (overrides the library caption)
              </label>
              <input id={`${id}-caption`} value={block.caption} onChange={(e) => update({ caption: e.target.value })} maxLength={500} className={inputClass} />
            </div>
          </div>
        </div>
      );
    }
    case "list":
      return (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[0.85rem]">
            <input type="checkbox" checked={block.ordered} onChange={(e) => update({ ordered: e.target.checked })} />
            Numbered list
          </label>
          <label htmlFor={id} className="sr-only">
            List items, one per line
          </label>
          <textarea id={id} rows={5} value={block.itemsText} onChange={(e) => update({ itemsText: e.target.value })} placeholder="One item per line" className={inputClass} />
        </div>
      );
    case "divider":
      return <hr className="border-line" />;
    case "embed":
      return (
        <div className="space-y-2">
          <label htmlFor={id} className="mb-1 block text-[0.75rem] text-stone">
            YouTube or Vimeo link
          </label>
          <input id={id} value={block.embedInput} onChange={(e) => update({ embedInput: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" className={inputClass} />
          <label htmlFor={`${id}-title`} className="mb-1 block text-[0.75rem] text-stone">
            Video title (for screen readers)
          </label>
          <input id={`${id}-title`} value={block.embedTitle} onChange={(e) => update({ embedTitle: e.target.value })} maxLength={200} className={inputClass} />
          <label htmlFor={`${id}-caption`} className="mb-1 block text-[0.75rem] text-stone">
            Caption (optional)
          </label>
          <input id={`${id}-caption`} value={block.caption} onChange={(e) => update({ caption: e.target.value })} maxLength={500} className={inputClass} />
          <p className="text-[0.75rem] text-stone">Videos use privacy-enhanced embeds (youtube-nocookie.com, Vimeo do-not-track) and load lazily as the reader scrolls to them.</p>
        </div>
      );
  }
}
