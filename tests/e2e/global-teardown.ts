import { createClient } from "@supabase/supabase-js";
import { loadState } from "./state";

export default async function globalTeardown() {
  let state;
  try {
    state = loadState();
  } catch {
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) return;
  const service = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const run = state.run;

  const { data: photos } = await service
    .from("submission_images")
    .select("storage_path, submissions!inner(title)")
    .like("submissions.title", `${run}%`);
  if (photos?.length) await service.storage.from("submission-images").remove(photos.map((p) => p.storage_path));

  await service.from("stories").delete().like("slug", `${run}%`);
  await service.from("submissions").delete().like("title", `${run}%`);
  await service.from("contributors").delete().like("slug", `${run}%`);
  await service.from("rate_limits").delete().like("key", "login:%");
  await service.from("tags").delete().like("slug", `${run}%`);

  // Uploaded fixture images (alt text carries the run id).
  const { data: assets } = await service.from("media_assets").select("id, storage_path").like("alt_text", `${run}%`);
  if (assets?.length) {
    await service.storage.from("editorial-media").remove(assets.map((a) => a.storage_path));
    await service.from("media_assets").delete().in("id", assets.map((a) => a.id));
  }

  const { data } = await service.auth.admin.listUsers({ perPage: 200 });
  for (const user of data?.users ?? []) {
    if (user.email?.startsWith(run)) await service.auth.admin.deleteUser(user.id);
  }
}
