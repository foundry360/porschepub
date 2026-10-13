/**
 * Development / test seed. FICTIONAL CONTENT ONLY.
 *
 *   npm run seed:dev
 *
 * Safety:
 *   - refuses to run unless SEED_ALLOW=local AND the Supabase URL is localhost
 *   - uses generated abstract placeholder images (no third-party photography)
 *   - never runs as part of migrations or deployment
 *   - idempotent: re-running updates the same rows (matched by slug / email)
 */
import sharp from "sharp";
import { isLocalUrl, serviceClient } from "./lib/env";

const { url, db } = serviceClient();

if (process.env.SEED_ALLOW !== "local" || !isLocalUrl(url)) {
  console.error("Refusing to seed: requires SEED_ALLOW=local and a localhost Supabase URL.");
  process.exit(1);
}

const DEV_PASSWORD = "dev-password-123456";

type Palette = [string, string, string];
const palettes: Palette[] = [
  ["#2b2a28", "#8c3b2e", "#d9b9a8"],
  ["#1c2430", "#5f7d95", "#e8e1d3"],
  ["#3b3226", "#b08d57", "#f0e6d2"],
  ["#202820", "#6b8f71", "#e3e0d0"],
  ["#2a1f2d", "#8d6a9f", "#efe3ea"],
  ["#30302e", "#9a9a94", "#f2efe8"],
  ["#2e2320", "#c06b4b", "#f4e4d6"],
  ["#161616", "#7a2a24", "#d8d1c3"],
];

async function makeImage(index: number, width: number, height: number, label: string) {
  const [dark, mid, light] = palettes[index % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="0.55" stop-color="${mid}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${dark}" stop-opacity="0"/>
      <stop offset="1" stop-color="${dark}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${width * 0.72}" cy="${height * 0.36}" r="${height * 0.2}" fill="${light}" fill-opacity="0.35"/>
  <path d="M0 ${height * 0.72} C ${width * 0.3} ${height * 0.58}, ${width * 0.6} ${height * 0.86}, ${width} ${height * 0.64} L ${width} ${height} L 0 ${height} Z" fill="url(#road)"/>
  <path d="M${width * 0.08} ${height * 0.9} L ${width * 0.92} ${height * 0.78}" stroke="${light}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="14 18"/>
  <text x="${width * 0.04}" y="${height * 0.95}" font-family="sans-serif" font-size="${Math.round(height * 0.028)}" fill="${light}" fill-opacity="0.6">${label}</text>
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

async function ensureUser(email: string, role: "admin" | "editor", displayName: string) {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = list?.users.find((candidate) => candidate.email === email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({ email, password: DEV_PASSWORD, email_confirm: true });
    if (error || !data.user) throw error;
    user = data.user;
  }
  const { error } = await db.from("profiles").upsert({ id: user.id, role, display_name: displayName });
  if (error) throw error;
  return user.id;
}

async function ensureAsset(
  key: string,
  index: number,
  alt: string,
  opts: { width?: number; height?: number; caption?: string; createdBy: string },
) {
  const width = opts.width ?? 2000;
  const height = opts.height ?? 1250;
  const storagePath = `dev-seed/${key}.jpg`;

  const { data: existing } = await db
    .from("media_assets")
    .select("id")
    .eq("bucket", "editorial-media")
    .eq("storage_path", storagePath)
    .maybeSingle();
  if (existing) return existing.id;

  const buffer = await makeImage(index, width, height, "Development placeholder");
  const { error: uploadError } = await db.storage
    .from("editorial-media")
    .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });
  if (uploadError) throw uploadError;

  const { data, error } = await db
    .from("media_assets")
    .insert({
      storage_path: storagePath,
      mime_type: "image/jpeg",
      byte_size: buffer.length,
      width,
      height,
      alt_text: alt,
      caption: opts.caption ?? null,
      credit: "Generated placeholder (development only)",
      created_by: opts.createdBy,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

const contributorsSeed = [
  {
    slug: "alex-example",
    name: "Alex Example",
    descriptor: "Fictional collector",
    bio: "Fictional development contributor. Alex collects air-cooled cars and writes about the patience that takes.",
    expertise: ["Air-cooled 911", "Collecting"],
    highlighted: true,
  },
  {
    slug: "morgan-sample",
    name: "Morgan Sample",
    descriptor: "Fictional restorer",
    bio: "Fictional development contributor. Morgan runs an imaginary workshop and likes long, slow projects.",
    expertise: ["Restoration", "Bodywork"],
    highlighted: true,
  },
  {
    slug: "riley-placeholder",
    name: "Riley Placeholder",
    descriptor: "Fictional club racer",
    bio: "Fictional development contributor who races at an imaginary circuit.",
    expertise: ["Motorsport"],
    highlighted: true,
  },
];

function story(
  slug: string,
  headline: string,
  subtitle: string,
  summary: string,
  categorySlug: string,
  contributorSlug: string,
  daysAgo: number,
  tags: string[],
  imageIndex: number,
) {
  return { slug, headline, subtitle, summary, categorySlug, contributorSlug, daysAgo, tags, imageIndex };
}

const storiesSeed = [
  story("the-car-i-almost-sold", "The car I almost sold", "A garage, a deadline, and a change of heart.", "Fictional development story about nearly letting go of a long-owned car.", "ownership", "alex-example", 2, ["air-cooled"], 0),
  story("a-winter-in-the-workshop", "A winter in the workshop", "What a restoration teaches you about waiting.", "Fictional development story about a slow restoration project.", "restoration", "morgan-sample", 5, ["workshop"], 1),
  story("twelve-laps-at-dusk", "Twelve laps at dusk", "The last session of the season.", "Fictional development story about a club race weekend.", "motorsport", "riley-placeholder", 9, ["club-racing"], 2),
  story("the-road-to-the-coast", "The road to the coast", "A long drive with no deadline.", "Fictional development story about a coastal road trip.", "road-stories", "alex-example", 14, ["road-trip"], 3),
  story("why-i-started-collecting", "Why I started collecting", "It began with a single poster.", "Fictional development story about how a collection begins.", "collecting", "alex-example", 20, ["air-cooled"], 4),
  story("drawing-the-line", "Drawing the line", "On proportion, restraint and a pencil.", "Fictional development story about design and proportion.", "design-engineering", "morgan-sample", 27, ["design"], 5),
  story("my-fathers-passenger-seat", "My father's passenger seat", "Learning to love a car from the side.", "Fictional development story about family and cars.", "personal-journeys", "riley-placeholder", 33, ["family"], 6),
  story("rebuilding-a-gearbox-by-hand", "Rebuilding a gearbox by hand", "Forty hours, one set of tools.", "Fictional development story about mechanical craft.", "restoration", "morgan-sample", 41, ["workshop"], 7),
];

function bodyFor(headline: string, imageIds: string[]) {
  return [
    { type: "paragraph", text: `This is fictional development content for **${headline}**. It exists only to exercise layouts, pagination and search in a local environment.` },
    { type: "paragraph", text: "The *first-person* voice matters. A story should feel like someone is telling it across a table, with the details that only they would remember." },
    { type: "heading", level: 2, text: "Where it begins" },
    { type: "paragraph", text: "Every car has a moment when it stopped being an object and became part of a life. For some it is the first drive; for others, the first repair. This paragraph is padding in the shape of an anecdote." },
    { type: "image", assetId: imageIds[1], layout: "wide", caption: "A generated placeholder used to test wide image layouts." },
    { type: "pullquote", text: "A car is only ever as interesting as the person who kept it running.", attribution: "Fictional pull quote" },
    { type: "paragraph", text: "Another paragraph follows, long enough to wrap across several lines on a phone and a desktop, so the measure, leading and rhythm of the page can be judged by eye. Typography is the first thing a reader feels and the last thing they notice." },
    { type: "quote", text: "You don't own a car like this. You look after it for the next person.", attribution: "Fictional attribution" },
    { type: "list", ordered: false, items: ["A short list item to test spacing", "Another with a [link](https://example.com) to test safe links"] },
    { type: "image", assetId: imageIds[2], layout: "inline" },
    { type: "heading", level: 2, text: "What stayed with me" },
    { type: "paragraph", text: "The ending of a story is often quieter than the beginning. It is a drive home, a closed garage door, a light left on." },
  ];
}

async function main() {
  console.log(`Seeding ${url} (local)`);
  const adminId = await ensureUser("admin@example.test", "admin", "Dev Admin");
  await ensureUser("editor@example.test", "editor", "Dev Editor");

  const { data: categories } = await db.from("categories").select("id, slug");
  const categoryId = new Map((categories ?? []).map((row) => [row.slug, row.id]));

  const contributorIds = new Map<string, string>();
  for (const [index, c] of contributorsSeed.entries()) {
    const avatar = await ensureAsset(`avatar-${c.slug}`, index + 3, `Abstract placeholder portrait for ${c.name}`, {
      width: 800,
      height: 1000,
      createdBy: adminId,
    });
    const { data, error } = await db
      .from("contributors")
      .upsert(
        {
          slug: c.slug,
          name: c.name,
          descriptor: c.descriptor,
          bio: c.bio,
          expertise: c.expertise,
          avatar_asset_id: avatar,
          profile_visible: true,
          is_highlighted: c.highlighted,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) throw error;
    contributorIds.set(c.slug, data.id);
  }

  const tagIds = new Map<string, string>();
  for (const tag of new Set(storiesSeed.flatMap((s) => s.tags))) {
    const { data, error } = await db
      .from("tags")
      .upsert({ slug: tag, name: tag.replace(/-/g, " ") }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw error;
    tagIds.set(tag, data.id);
  }

  const storyIds: string[] = [];
  for (const s of storiesSeed) {
    const lead = await ensureAsset(`lead-${s.slug}`, s.imageIndex, `Abstract warm-toned placeholder artwork for “${s.headline}”`, { createdBy: adminId, caption: "Generated placeholder image." });
    const inlineA = await ensureAsset(`inline-a-${s.slug}`, s.imageIndex + 1, "Abstract placeholder landscape used to test wide image layouts", { createdBy: adminId });
    const inlineB = await ensureAsset(`inline-b-${s.slug}`, s.imageIndex + 2, "Abstract placeholder used to test inline image layouts", { createdBy: adminId });
    const body = bodyFor(s.headline, [lead, inlineA, inlineB]);
    const bodyText = body
      .map((block) => ("text" in block ? block.text : "items" in block ? (block.items as string[]).join(" ") : ""))
      .join("\n");

    const publishedAt = new Date(Date.now() - s.daysAgo * 86_400_000).toISOString();
    const { data, error } = await db
      .from("stories")
      .upsert(
        {
          slug: s.slug,
          headline: s.headline,
          subtitle: s.subtitle,
          summary: s.summary,
          body,
          body_text: bodyText,
          reading_minutes: 2,
          contributor_id: contributorIds.get(s.contributorSlug),
          category_id: categoryId.get(s.categorySlug),
          lead_image_id: lead,
          status: "published",
          published_at: publishedAt,
          created_by: adminId,
          updated_by: adminId,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) throw error;
    storyIds.push(data.id);

    await db.from("story_tags").delete().eq("story_id", data.id);
    const rows = s.tags.map((tag) => ({ story_id: data.id, tag_id: tagIds.get(tag) as string }));
    if (rows.length) {
      const { error: tagError } = await db.from("story_tags").insert(rows);
      if (tagError) throw tagError;
    }
  }

  // Homepage placements: first story featured, next three as editors' picks.
  await db.from("homepage_placements").delete().neq("section", "none");
  await db.from("homepage_placements").insert([
    { section: "featured", story_id: storyIds[2], position: 0 },
    { section: "editors_picks", story_id: storyIds[0], position: 0 },
    { section: "editors_picks", story_id: storyIds[1], position: 1 },
    { section: "editors_picks", story_id: storyIds[3], position: 2 },
  ]);

  console.log(`Seeded ${storyIds.length} stories, ${contributorIds.size} contributors.`);
  console.log(`Dev logins: admin@example.test / editor@example.test  password: ${DEV_PASSWORD}`);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
