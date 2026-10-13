import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { PageContainer, PageIntro } from "@/components/ui/misc";
import { listCategories } from "@/server/content/public";
import { SubmissionForm } from "./submission-form";

export const metadata: Metadata = {
  title: "Tell Your Story",
  description: `Pitch a first-person story to ${brand.name}. Owners, racers, restorers, designers and enthusiasts welcome.`,
  alternates: { canonical: "/tell-your-story" },
};

export default async function TellYourStoryPage() {
  const categories = await listCategories();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined;

  return (
    <PageContainer>
      <PageIntro
        eyebrow="Contribute"
        title="Tell your story"
        description="We publish first-person stories about the people behind Porsche. Pitch yours below."
      />
      <div className="grid gap-14 pb-12 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-7">
          <SubmissionForm
            categories={categories.map((category) => ({ id: category.id, name: category.name }))}
            turnstileSiteKey={turnstileSiteKey}
          />
        </div>
        <aside className="space-y-8 text-[0.95rem] leading-relaxed text-charcoal lg:col-span-4 lg:col-start-9">
          <section aria-labelledby="what-we-look-for">
            <h2 id="what-we-look-for" className="font-display text-2xl">
              What we look for
            </h2>
            <p className="mt-3">
              A specific car, place or moment, told in your own voice, and honest about what it meant.
              You don&rsquo;t need to be a professional writer.
            </p>
          </section>
          <section aria-labelledby="what-happens-next">
            <h2 id="what-happens-next" className="font-display text-2xl">
              What happens next
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>An editor reads your pitch.</li>
              <li>If it&rsquo;s a fit, we&rsquo;ll email you to talk through it.</li>
              <li>Nothing is published without your agreement.</li>
            </ol>
          </section>
          <section aria-labelledby="your-details">
            <h2 id="your-details" className="font-display text-2xl">
              Your details
            </h2>
            <p className="mt-3">
              Your name and email are visible only to our editorial team and are used to reply to you.
              Read the{" "}
              <Link href="/privacy" className="link-underline">
                privacy policy
              </Link>
              .
            </p>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
