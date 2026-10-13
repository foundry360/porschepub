"use server";

import { errorState, formString, okState, type FormState } from "@/lib/editorial/form-state";
import { requireEditor } from "@/server/auth/session";
import { invalidateHomepage } from "@/server/editorial/revalidate";
import { parseHeroInput, saveHeroSetting, saveHomepagePlacements } from "@/server/editorial/site";
import { logger } from "@/server/logger";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveHeroAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await requireEditor();
  const parsed = parseHeroInput({
    kicker: formString(formData, "kicker"),
    headline: formString(formData, "headline"),
    intro: formString(formData, "intro"),
  });
  if (!parsed.ok) return errorState(parsed.error, parsed.fieldErrors);
  try {
    const result = await saveHeroSetting(db, userId, parsed.data);
    if (!result.ok) return errorState(result.error);
    invalidateHomepage();
    return okState("Hero text saved.");
  } catch (error) {
    logger.error("admin.hero_save_failed", {}, error);
    return errorState("Something went wrong saving the hero text.");
  }
}

export async function savePlacementsAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await requireEditor();

  const featured = formString(formData, "featuredId");
  if (featured && !UUID.test(featured)) return errorState("Invalid featured story.");
  const picks = formData
    .getAll("pickId")
    .filter((value): value is string => typeof value === "string" && UUID.test(value));

  try {
    const result = await saveHomepagePlacements(db, userId, featured || null, picks);
    if (!result.ok) return errorState(result.error);
    invalidateHomepage();
    return okState("Homepage selections saved.");
  } catch (error) {
    logger.error("admin.placements_save_failed", {}, error);
    return errorState("Something went wrong saving the homepage selections.");
  }
}
