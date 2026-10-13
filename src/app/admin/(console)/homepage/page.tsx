import { HeroForm, PlacementsForm } from "@/components/admin/homepage-forms";
import { AdminHeading, Card } from "@/components/admin/ui";
import { brand } from "@/config/brand";
import { requireEditor } from "@/server/auth/session";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Homepage" };

export default async function HomepageAdmin() {
  const { db } = await requireEditor();
  const nowIso = new Date().toISOString();

  const [stories, placements, hero] = await Promise.all([
    db
      .from("stories")
      .select("id, headline")
      .eq("status", "published")
      .lte("published_at", nowIso)
      .order("published_at", { ascending: false })
      .limit(200),
    db.from("homepage_placements").select("section, story_id, position").order("position"),
    db.from("site_settings").select("value").eq("key", "home.hero").maybeSingle(),
  ]);

  const value = (hero.data?.value ?? {}) as Partial<{ kicker: string; headline: string; intro: string }>;
  const featured = placements.data?.find((p) => p.section === "featured")?.story_id ?? "";
  const picks = (placements.data ?? []).filter((p) => p.section === "editors_picks").map((p) => p.story_id);

  return (
    <>
      <AdminHeading title="Homepage" description="Control the hero text and which stories lead the homepage." />
      <div className="grid gap-8 lg:grid-cols-2">
        <Card title="Hero">
          <HeroForm
            hero={{
              kicker: value.kicker ?? brand.heroDefaults.kicker,
              headline: value.headline ?? brand.heroDefaults.headline,
              intro: value.intro ?? brand.heroDefaults.intro,
            }}
          />
        </Card>
        <Card title="Story selections">
          <PlacementsForm stories={stories.data ?? []} featuredId={featured} pickIds={picks} />
        </Card>
      </div>
    </>
  );
}
