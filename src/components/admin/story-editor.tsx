"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteStoryAction, saveStoryAction } from "@/app/admin/(console)/stories/actions";
import type { Block } from "@/lib/content/blocks";
import { fromEditorBlocks, toEditorBlocks, type EditorBlock } from "@/lib/editorial/editor-blocks";
import { slugify } from "@/lib/slug";
import { blockingIssues, storyLifecycle, storyReadiness } from "@/lib/workflow";
import { BlockEditor } from "./block-editor";
import { ImageField, type ImageInfo } from "./image-field";
import {
  Badge,
  buttonClass,
  buttonDangerClass,
  buttonSecondaryClass,
  Card,
  Field,
  describedBy,
  inputClass,
  LifecycleBadge,
  Notice,
} from "./ui";

export type StoryEditorInitial = {
  id: string | null;
  slug: string;
  headline: string;
  subtitle: string;
  summary: string;
  body: Block[];
  categoryId: string;
  contributorId: string;
  leadImageId: string;
  ogImageId: string;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  seoTitle: string;
  seoDescription: string;
  canonicalUrlOverride: string;
  tags: string[];
  relatedIds: string[];
};

type Option = { id: string; name: string };

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function StoryEditor({
  initial,
  categories,
  contributors,
  tagSuggestions,
  otherStories,
  images: initialImages,
  isAdmin,
  initialMessage,
}: {
  initial: StoryEditorInitial;
  categories: Option[];
  contributors: Option[];
  tagSuggestions: string[];
  otherStories: Array<{ id: string; headline: string; status: string }>;
  images: Record<string, ImageInfo>;
  isAdmin: boolean;
  /** Shown once on load, e.g. after the first save redirects here. */
  initialMessage?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [id, setId] = useState(initial.id);
  const [status, setStatus] = useState(initial.status);
  const [publishedAt, setPublishedAt] = useState(toLocalInput(initial.publishedAt));
  const [headline, setHeadline] = useState(initial.headline);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [summary, setSummary] = useState(initial.summary);
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => toEditorBlocks(initial.body));
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [contributorId, setContributorId] = useState(initial.contributorId);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [relatedIds, setRelatedIds] = useState<string[]>(initial.relatedIds);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [canonical, setCanonical] = useState(initial.canonicalUrlOverride);

  const [images, setImages] = useState<Record<string, ImageInfo>>(initialImages);
  const [leadId, setLeadId] = useState(initial.leadImageId);
  const [ogId, setOgId] = useState(initial.ogImageId);

  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    initialMessage ? { tone: "success", text: initialMessage } : null,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const markDirty = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setDirty(true);
  };
  const rememberImage = (image: ImageInfo) => setImages((prev) => ({ ...prev, [image.id]: image }));

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const { body: previewBody } = useMemo(() => fromEditorBlocks(blocks), [blocks]);
  const lead = leadId ? images[leadId] : undefined;
  const readiness = useMemo(
    () =>
      storyReadiness({
        slug: slug || slugify(headline, 80),
        headline,
        summary: summary || null,
        bodyBlockCount: previewBody.length,
        contributorId: contributorId || null,
        categoryId: categoryId || null,
        leadImageId: leadId || null,
        leadImageAlt: lead?.alt ?? null,
        seoDescription: seoDescription || null,
      }),
    [slug, headline, summary, previewBody.length, contributorId, categoryId, leadId, lead?.alt, seoDescription],
  );
  const blockers = blockingIssues(readiness);

  const scheduledForFuture = storyLifecycle("published", fromLocalInput(publishedAt) || null) === "scheduled";
  const lifecycle = storyLifecycle(status, fromLocalInput(publishedAt) || null);

  function submit(intent: "save" | "publish" | "unpublish" | "archive" | "restore") {
    setMessage(null);
    setFieldErrors({});

    const { body, issues } = fromEditorBlocks(blocks);
    if (issues.length > 0) {
      setMessage({ tone: "error", text: issues.map((i) => i.message).join(" ") });
      return;
    }
    if (intent === "publish" && blockers.length > 0) {
      setMessage({ tone: "error", text: `Not ready to publish: ${blockers.map((b) => b.message).join(" ")}` });
      return;
    }

    startTransition(async () => {
      const result = await saveStoryAction({
        id: id ?? undefined,
        intent,
        headline,
        slug,
        subtitle,
        summary,
        body,
        categoryId,
        contributorId,
        leadImageId: leadId,
        ogImageId: ogId,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        relatedIds,
        seoTitle,
        seoDescription,
        canonicalUrlOverride: canonical,
        publishedAt: fromLocalInput(publishedAt),
      });

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setDirty(false);
      setStatus(result.story.status);
      setSlug(result.story.slug);
      setSlugTouched(true);
      setPublishedAt(toLocalInput(result.story.publishedAt));
      setMessage({ tone: "success", text: result.message });
      if (!id) {
        setId(result.story.id);
        router.replace(`/admin/stories/${result.story.id}?created=1`);
      } else {
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!id) return;
    if (!window.confirm("Permanently delete this story? This cannot be undone. Archiving is usually safer.")) return;
    startTransition(async () => {
      const result = await deleteStoryAction(id);
      if (result && !result.ok) setMessage({ tone: "error", text: result.error });
    });
  }

  const err = (name: string) => fieldErrors[name];
  const liveUrl = status === "published" && slug ? `/stories/${slug}` : null;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-6">
        {message ? (
          <div aria-live="polite">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        ) : null}

        <Field label="Headline" htmlFor="headline" required error={err("headline")}>
          <input
            id="headline"
            value={headline}
            onChange={(e) => {
              markDirty(setHeadline)(e.target.value);
              if (!slugTouched && !id) setSlug(slugify(e.target.value, 80));
            }}
            maxLength={200}
            aria-invalid={Boolean(err("headline"))}
            aria-describedby={describedBy("headline", undefined, err("headline"))}
            className={`${inputClass} font-display text-[1.7rem] leading-tight`}
          />
        </Field>
        <Field label="Subtitle" htmlFor="subtitle" error={err("subtitle")}>
          <input id="subtitle" value={subtitle} onChange={(e) => markDirty(setSubtitle)(e.target.value)} maxLength={300} className={inputClass} />
        </Field>
        <Field
          label="Summary"
          htmlFor="summary"
          hint="One or two sentences for cards, search results and social sharing."
          error={err("summary")}
        >
          <textarea id="summary" rows={3} value={summary} onChange={(e) => markDirty(setSummary)(e.target.value)} maxLength={500} className={inputClass} />
        </Field>

        <BlockEditor
          blocks={blocks}
          onChange={(next) => {
            setBlocks(next);
            setDirty(true);
          }}
          images={images}
          onImageKnown={rememberImage}
        />
        {err("body") ? <p role="alert" className="text-[0.85rem] font-medium text-danger">{err("body")}</p> : null}
      </div>

      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <Card title="Publishing">
          <div className="mb-4 flex items-center gap-2">
            <LifecycleBadge lifecycle={id ? lifecycle : "draft"} />
            {dirty ? <Badge tone="accent">Unsaved changes</Badge> : null}
          </div>

          <Field
            label="Publish date"
            htmlFor="publishedAt"
            hint="Leave empty to publish immediately. A future date schedules the story."
            error={err("publishedAt")}
          >
            <input
              id="publishedAt"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => markDirty(setPublishedAt)(e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => submit("save")} className={buttonSecondaryClass}>
              {pending ? "Saving…" : "Save"}
            </button>
            {status !== "published" && status !== "archived" ? (
              <button type="button" disabled={pending} onClick={() => submit("publish")} className={buttonClass}>
                {scheduledForFuture ? "Schedule" : "Publish"}
              </button>
            ) : null}
            {status === "published" ? (
              <>
                <button type="button" disabled={pending} onClick={() => submit("publish")} className={buttonClass}>
                  Update live story
                </button>
                <button type="button" disabled={pending} onClick={() => submit("unpublish")} className={buttonSecondaryClass}>
                  Unpublish
                </button>
              </>
            ) : null}
            {status === "archived" ? (
              <button type="button" disabled={pending} onClick={() => submit("restore")} className={buttonSecondaryClass}>
                Restore to draft
              </button>
            ) : (
              id && (
                <button type="button" disabled={pending} onClick={() => submit("archive")} className={buttonSecondaryClass}>
                  Archive
                </button>
              )
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-[0.85rem]">
            {id ? (
              <Link href={`/admin/stories/${id}/preview`} target="_blank" rel="noopener" className="underline underline-offset-4">
                Preview
              </Link>
            ) : (
              <span className="text-stone">Save to enable preview</span>
            )}
            {liveUrl ? (
              <Link href={liveUrl} target="_blank" rel="noopener" className="underline underline-offset-4">
                View live
              </Link>
            ) : null}
          </div>
          {id && isAdmin ? (
            <button type="button" onClick={onDelete} disabled={pending} className={`${buttonDangerClass} mt-4`}>
              Delete permanently
            </button>
          ) : null}
        </Card>

        <Card title="Checklist">
          {readiness.length === 0 ? (
            <p className="text-[0.9rem] text-emerald-800">Everything needed to publish is in place.</p>
          ) : (
            <ul className="space-y-2 text-[0.88rem]">
              {readiness.map((issue) => (
                <li key={`${issue.field}-${issue.message}`} className="flex gap-2">
                  <span aria-hidden className={issue.blocking ? "text-danger" : "text-stone"}>
                    {issue.blocking ? "●" : "○"}
                  </span>
                  <span>
                    <span className="sr-only">{issue.blocking ? "Required: " : "Suggested: "}</span>
                    {issue.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Details">
          <div className="space-y-4">
            <Field label="Contributor" htmlFor="contributorId" error={err("contributorId")}>
              <select id="contributorId" value={contributorId} onChange={(e) => markDirty(setContributorId)(e.target.value)} className={inputClass}>
                <option value="">Choose…</option>
                {contributors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category" htmlFor="categoryId" error={err("categoryId")}>
              <select id="categoryId" value={categoryId} onChange={(e) => markDirty(setCategoryId)(e.target.value)} className={inputClass}>
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tags" htmlFor="tags" hint="Comma-separated. New tags are created automatically." error={err("tags")}>
              <input id="tags" list="tag-suggestions" value={tags} onChange={(e) => markDirty(setTags)(e.target.value)} className={inputClass} />
              <datalist id="tag-suggestions">
                {tagSuggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
            <ImageField
              label="Lead image"
              value={leadId ? (images[leadId] ?? { id: leadId, url: "", alt: "" }) : null}
              warnMissingAlt
              onChange={(image) => {
                if (image) rememberImage(image);
                setLeadId(image?.id ?? "");
                setDirty(true);
              }}
            />
            {err("leadImageId") ? <p role="alert" className="text-[0.85rem] font-medium text-danger">{err("leadImageId")}</p> : null}
          </div>
        </Card>

        <Card title="Related stories">
          <p className="mb-2 text-[0.8rem] text-stone">Up to 6. If none are chosen, related stories are picked automatically.</p>
          <div className="max-h-52 space-y-1 overflow-y-auto border border-line p-2">
            {otherStories.length === 0 ? <p className="text-[0.85rem] text-stone">No other stories yet.</p> : null}
            {otherStories.map((s) => (
              <label key={s.id} className="flex items-start gap-2 text-[0.85rem]">
                <input
                  type="checkbox"
                  checked={relatedIds.includes(s.id)}
                  disabled={!relatedIds.includes(s.id) && relatedIds.length >= 6}
                  onChange={(e) => {
                    setRelatedIds((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)));
                    setDirty(true);
                  }}
                  className="mt-1"
                />
                <span>
                  {s.headline || "Untitled"} <span className="text-stone">({s.status})</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card title="Search & social">
          <div className="space-y-4">
            <Field label="URL slug" htmlFor="slug" hint={id ? "Changing a live story’s slug keeps the old address working via redirect." : "Generated from the headline; edit if needed."} error={err("slug")}>
              <input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  markDirty(setSlug)(e.target.value.toLowerCase());
                }}
                aria-invalid={Boolean(err("slug"))}
                aria-describedby={describedBy("slug", "hint", err("slug"))}
                className={inputClass}
              />
            </Field>
            <Field label="SEO title" htmlFor="seoTitle" hint="Optional. Defaults to the headline." error={err("seoTitle")}>
              <input id="seoTitle" value={seoTitle} onChange={(e) => markDirty(setSeoTitle)(e.target.value)} maxLength={120} className={inputClass} />
            </Field>
            <Field label="Meta description" htmlFor="seoDescription" hint={`${seoDescription.length}/320. Defaults to the summary.`} error={err("seoDescription")}>
              <textarea id="seoDescription" rows={3} value={seoDescription} onChange={(e) => markDirty(setSeoDescription)(e.target.value)} maxLength={320} className={inputClass} />
            </Field>
            <Field label="Canonical URL override" htmlFor="canonical" hint="Only for stories first published elsewhere. Must be https." error={err("canonicalUrlOverride")}>
              <input id="canonical" value={canonical} onChange={(e) => markDirty(setCanonical)(e.target.value)} maxLength={500} className={inputClass} />
            </Field>
            <ImageField
              label="Social share image (optional)"
              value={ogId ? (images[ogId] ?? { id: ogId, url: "", alt: "" }) : null}
              onChange={(image) => {
                if (image) rememberImage(image);
                setOgId(image?.id ?? "");
                setDirty(true);
              }}
            />
          </div>
        </Card>
      </aside>
    </div>
  );
}
