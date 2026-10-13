"use client";

import { useMemo, useState } from "react";
import { savePageAction } from "@/app/admin/(console)/pages/actions";
import type { Block } from "@/lib/content/blocks";
import { fromEditorBlocks, toEditorBlocks, type EditorBlock } from "@/lib/editorial/editor-blocks";
import { BlockEditor } from "./block-editor";
import { fieldError, FormBanner, SubmitButton, useActionForm } from "./form-controls";
import type { ImageInfo } from "./image-field";
import { Card, Field, inputClass, Notice } from "./ui";

export function PageForm({
  page,
  images,
}: {
  page: {
    id: string;
    slug: string;
    kind: "general" | "about" | "legal";
    title: string;
    summary: string;
    body: Block[];
    legalReviewed: boolean;
    isPublished: boolean;
    seoTitle: string;
    seoDescription: string;
  };
  images: Record<string, ImageInfo>;
}) {
  const { state, onSubmit, pending } = useActionForm(savePageAction);
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => toEditorBlocks(page.body));
  const [known, setKnown] = useState(images);
  const converted = useMemo(() => fromEditorBlocks(blocks), [blocks]);
  const err = (name: string) => fieldError(state, name);

  return (
    <form onSubmit={onSubmit} className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]" noValidate>
      <input type="hidden" name="id" value={page.id} />
      <input type="hidden" name="body" value={JSON.stringify(converted.body)} />

      <div className="min-w-0 space-y-5">
        <FormBanner state={state} />
        {converted.issues.length > 0 ? <Notice tone="warning">{converted.issues.map((i) => i.message).join(" ")}</Notice> : null}
        <Field label="Title" htmlFor="title" required error={err("title")}>
          <input id="title" name="title" defaultValue={page.title} maxLength={160} className={`${inputClass} font-display text-[1.6rem]`} />
        </Field>
        <Field label="Summary" htmlFor="summary" error={err("summary")}>
          <textarea id="summary" name="summary" rows={2} defaultValue={page.summary} maxLength={500} className={inputClass} />
        </Field>
        <BlockEditor
          blocks={blocks}
          onChange={setBlocks}
          images={known}
          onImageKnown={(image) => setKnown((prev) => ({ ...prev, [image.id]: image }))}
          label="Page content"
        />
        {err("body") ? <p role="alert" className="text-[0.85rem] font-medium text-accent">{err("body")}</p> : null}
        <SubmitButton pending={pending}>Save page</SubmitButton>
      </div>

      <aside className="space-y-5">
        <Card title="Visibility">
          <label className="flex items-center gap-2 text-[0.9rem]">
            <input type="checkbox" name="isPublished" defaultChecked={page.isPublished} />
            Published at <code className="text-[0.8rem]">/{page.slug}</code>
          </label>
        </Card>
        {page.kind === "legal" ? (
          <Card title="Legal review">
            <label className="flex items-start gap-2 text-[0.9rem]">
              <input type="checkbox" name="legalReviewed" defaultChecked={page.legalReviewed} className="mt-1" />
              <span>
                A qualified legal reviewer has approved this text
                <span className="block text-[0.8rem] text-stone">
                  Draft policy text is shipped as a starting point only. Don’t tick this until counsel has reviewed it for your
                  jurisdiction and actual data practices.
                </span>
              </span>
            </label>
          </Card>
        ) : null}
        <Card title="Search">
          <div className="space-y-4">
            <Field label="SEO title" htmlFor="seoTitle" error={err("seoTitle")}>
              <input id="seoTitle" name="seoTitle" defaultValue={page.seoTitle} maxLength={120} className={inputClass} />
            </Field>
            <Field label="Meta description" htmlFor="seoDescription" error={err("seoDescription")}>
              <textarea id="seoDescription" name="seoDescription" rows={3} defaultValue={page.seoDescription} maxLength={320} className={inputClass} />
            </Field>
          </div>
        </Card>
      </aside>
    </form>
  );
}
