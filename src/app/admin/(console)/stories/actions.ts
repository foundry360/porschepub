"use server";

import { redirect } from "next/navigation";
import { requireEditor } from "@/server/auth/session";
import { deleteStory, parseStoryInput, saveStory, type SavedStory } from "@/server/editorial/stories";
import { invalidateStory } from "@/server/editorial/revalidate";
import { logger } from "@/server/logger";

export type StoryActionResult =
  | { ok: true; story: SavedStory; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const SUCCESS_MESSAGE = {
  save: "Saved.",
  publish: "Published. The story is live (or scheduled for its publish time).",
  unpublish: "Unpublished. The story has been removed from the public site.",
  archive: "Archived.",
  restore: "Restored to draft.",
} as const;

/**
 * Save a story and optionally change its lifecycle state.
 * The payload comes from the browser and is treated as untrusted: it is fully
 * validated here, and the database re-checks permissions via RLS.
 */
export async function saveStoryAction(payload: unknown): Promise<StoryActionResult> {
  const { db, userId } = await requireEditor();

  const parsed = parseStoryInput(payload);
  if (!parsed.ok) return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };

  try {
    const result = await saveStory(db, userId, parsed.data);
    if (!result.ok) return { ok: false, error: result.error, fieldErrors: result.fieldErrors };

    invalidateStory(result.data.slug, result.data.previousSlug);
    return { ok: true, story: result.data, message: SUCCESS_MESSAGE[parsed.data.intent] };
  } catch (error) {
    logger.error("admin.story_save_failed", { intent: parsed.data.intent }, error);
    return { ok: false, error: "Something went wrong saving this story. Your changes were not lost in the editor; try again." };
  }
}

export async function deleteStoryAction(storyId: string): Promise<{ ok: false; error: string }> {
  const { db, userId } = await requireEditor();
  if (!/^[0-9a-f-]{36}$/i.test(storyId)) return { ok: false, error: "Invalid story." };

  const result = await deleteStory(db, userId, storyId);
  if (!result.ok) return { ok: false, error: result.error };
  invalidateStory(result.data.slug);
  redirect("/admin/stories?deleted=1");
}
