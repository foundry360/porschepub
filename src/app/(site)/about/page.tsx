import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/story/block-renderer";
import { pageMetadata } from "@/components/site/page-view";
import { CameraIcon } from "@/components/ui/camera-icon";
import { EditorialImage } from "@/components/ui/editorial-image";
import { PageContainer } from "@/components/ui/misc";
import { Pill } from "@/components/ui/pill";
import { formatDate } from "@/lib/dates";
import type { MediaImage, StorySummary } from "@/lib/types";
import { paths } from "@/lib/urls";
import { getPage, listStories } from "@/server/content/public";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("about", "/about");
}

/** Used only when published stories do not yet supply enough photographs. */
const LIBRARY: MediaImage[] = [
  {
    id: "about-targa",
    url: "/images/hero-porsche-911-targa-sunset-3200.jpg",
    width: 3200,
    height: 2133,
    alt: "A Porsche 911 Targa in warm evening light",
    caption: null,
    credit: "Jonathan Rathgeb / Unsplash",
  },
  {
    id: "about-spyder",
    url: "/images/hero-porsche-550-spyder-mille-miglia-3200.jpg",
    width: 3200,
    height: 2133,
    alt: "A Porsche 550 Spyder on an open road",
    caption: null,
    credit: "Marco Piccinelli / Unsplash",
  },
];

type Figure = {
  image: MediaImage;
  href: string | null;
  label: string | null;
};

function figuresFor(stories: readonly StorySummary[]): Figure[] {
  const fromStories: Figure[] = stories.flatMap((story) =>
    story.leadImage
      ? [{ image: story.leadImage, href: paths.story(story.slug), label: story.headline }]
      : [],
  );
  const seen = new Set(fromStories.map((figure) => figure.image.url));
  const extras: Figure[] = LIBRARY.filter((image) => !seen.has(image.url)).map((image) => ({
    image,
    href: null,
    label: null,
  }));
  return [...fromStories, ...extras].slice(0, 5);
}

function PhotoCredit({ credit, className = "" }: { credit: string | null; className?: string }) {
  if (!credit) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] ${className}`}>
      <CameraIcon />
      {credit}
    </span>
  );
}

function AboutPhoto({
  figure,
  sizes,
  aspect,
  priority = false,
}: {
  figure: Figure;
  sizes: string;
  aspect: string;
  priority?: boolean;
}) {
  const image = (
    <EditorialImage
      image={figure.image}
      sizes={sizes}
      aspect={aspect}
      priority={priority}
      reveal={false}
      className="rounded-lg"
    />
  );

  return (
    <figure>
      {figure.href ? (
        <Link href={figure.href} className="block">
          {image}
        </Link>
      ) : (
        image
      )}
      {figure.label || figure.image.credit ? (
        <figcaption className="mt-3 space-y-1.5">
          {figure.label && figure.href ? (
            <Link href={figure.href} className="block text-[1.02rem] leading-snug text-charcoal hover:text-accent">
              {figure.label}
            </Link>
          ) : null}
          <PhotoCredit credit={figure.image.credit} className="text-stone" />
        </figcaption>
      ) : null}
    </figure>
  );
}

export default async function AboutPage() {
  const page = await getPage("about");
  if (!page) notFound();

  const stories = await listStories({ page: 1, pageSize: 8 });
  const figures = figuresFor(stories.items);
  const lead = figures[0] ?? null;
  const gallery = figures.slice(1, -1);
  const cta = figures.at(-1) ?? null;
  const galleryFromStories = gallery.some((figure) => figure.href);

  return (
    <>
      <PageContainer>
        <div className="grid items-end gap-10 pt-16 sm:pt-24 lg:grid-cols-12 lg:gap-x-16">
          <div className="animate-fade-up lg:col-span-6">
            <h1 className="font-headline text-[clamp(3.2rem,8vw,7rem)]">{page.title}</h1>
            {page.summary ? (
              <p className="mt-8 max-w-xl text-[clamp(1.15rem,1.6vw,1.45rem)] leading-snug text-stone">
                {page.summary}
              </p>
            ) : null}
          </div>
          {lead ? (
            <div className="lg:col-span-6">
              <AboutPhoto
                figure={lead}
                sizes="(min-width: 1024px) 42vw, 100vw"
                aspect="3/2"
                priority
              />
            </div>
          ) : null}
        </div>
      </PageContainer>

      {gallery.length > 0 ? (
        <PageContainer className="mt-20 sm:mt-28">
          <div className="border-t border-line pt-6">
            <p className="eyebrow eyebrow-slash text-stone">{galleryFromStories ? "From the stories" : "Photography"}</p>
          </div>
          <ul
            className={`mt-8 grid gap-10 ${gallery.length > 1 ? "sm:grid-cols-2" : ""} ${gallery.length > 2 ? "lg:grid-cols-3" : ""}`}
          >
            {gallery.map((figure) => (
              <li key={figure.image.id}>
                <AboutPhoto figure={figure} sizes="(min-width: 1024px) 30vw, 100vw" aspect="3/2" />
              </li>
            ))}
          </ul>
        </PageContainer>
      ) : null}

      <PageContainer narrow className="mt-20 sm:mt-28">
        <BlockRenderer blocks={page.blocks} images={page.images} variant="page" />
        <p className="mt-14 border-t border-line pt-5 text-[0.8rem] text-stone">
          Last updated {formatDate(page.updatedAt)}
        </p>
      </PageContainer>

      {cta ? (
        <section aria-labelledby="about-cta-heading" className="submit-cta on-dark mt-20 bg-ink text-paper">
          <div className="grid lg:grid-cols-2">
            <div className="relative min-h-[22rem]">
              <figure className="absolute inset-0 overflow-hidden">
                <Image
                  src={cta.image.url}
                  alt={cta.image.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
                {cta.image.credit ? (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-5 pb-5 pt-16 sm:px-8">
                    <PhotoCredit credit={cta.image.credit} className="text-paper/85" />
                  </figcaption>
                ) : null}
              </figure>
            </div>
            <div className="flex flex-col justify-center px-5 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-28">
              <p className="eyebrow eyebrow-slash text-paper/70">Contribute</p>
              <h2 id="about-cta-heading" className="font-headline mt-5 max-w-xl text-[clamp(2.6rem,5vw,4.75rem)]">
                Send the story <em>in your own voice.</em>
              </h2>
              <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-paper/75">
                An editor reads every pitch. Nothing is published until you agree to it.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Pill href={paths.tellYourStory()} variant="inverse">
                  Share your story
                </Pill>
                <Link href={paths.stories()} className="eyebrow border-b border-paper/60 pb-1 text-paper hover:border-paper">
                  Read the stories
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
