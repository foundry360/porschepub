import type { Metadata } from "next";
import type { ReactNode } from "react";
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
        title="Tell your"
        emphasis="story."
        description="We publish first-person stories about the people behind Porsche. Share yours below."
      />
      <div className="grid gap-14 pb-12 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-7">
          <SubmissionForm
            categories={categories.map((category) => ({ id: category.id, name: category.name }))}
            turnstileSiteKey={turnstileSiteKey}
          />
        </div>
        <aside aria-labelledby="what-happens-next" className="lg:col-span-4 lg:col-start-9">
          <div className="rounded-[20px] border border-line p-6 sm:p-8">
            <h2 id="what-happens-next" className="eyebrow eyebrow-slash text-stone">
              What happens next
            </h2>
            <ol className="mt-6 space-y-6">
              {STEPS.map((step, index) => (
                <li key={step} className="grid grid-cols-[2.25rem_1fr] gap-3 text-[1rem] leading-relaxed text-charcoal">
                  <span className="font-display text-[1.6rem] italic leading-none text-accent">{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <section aria-labelledby="faq-heading" className="mt-16 border-t border-line pt-6 sm:mt-24">
        <h2 id="faq-heading" className="font-headline text-[clamp(2.2rem,4.5vw,3.75rem)]">
          Questions, <em>answered.</em>
        </h2>
        <div className="mt-10 max-w-4xl">
          {FAQ.map((item) => (
            <details key={item.question} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[1.2rem] font-medium tracking-[-0.01em] sm:text-[1.4rem] [&::-webkit-details-marker]:hidden">
                {item.question}
                <span aria-hidden className="text-[1.6rem] leading-none text-accent transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="max-w-2xl pb-7 text-[1.05rem] leading-relaxed text-stone">{item.answer}</div>
            </details>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}

const STEPS = [
  "An editor reads your pitch.",
  "If it’s a fit, we’ll email you to talk it through.",
  "Nothing is published without your agreement.",
];

const FAQ: Array<{ question: string; answer: ReactNode }> = [
  {
    question: "Who can submit?",
    answer:
      "Anyone with a first-person Porsche story: owners, racers, restorers, designers, mechanics and enthusiasts. You don’t need to own a car today.",
  },
  {
    question: "Do I need to be a writer?",
    answer:
      "No. Tell us what happened in your own words. If we take the story forward, an editor works with you on shaping it.",
  },
  {
    question: "Does my car need to be rare?",
    answer:
      "Not at all. We look for a specific car, place or moment and an honest account of what it meant, whatever the model.",
  },
  {
    question: "Who sees my details?",
    answer: (
      <>
        Your name and email are visible only to our editorial team and are used to reply to you. Read the{" "}
        <Link href="/privacy" className="link-underline text-ink">
          privacy policy
        </Link>
        .
      </>
    ),
  },
];
