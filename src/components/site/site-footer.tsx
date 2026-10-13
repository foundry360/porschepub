import Link from "next/link";
import { cacheLife } from "next/cache";
import { brand } from "@/config/brand";
import { navigation } from "@/config/site";
import { paths } from "@/lib/urls";
import { loadNavCategories } from "./site-header";
import { Wordmark } from "./wordmark";

async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export async function SiteFooter() {
  const categories = await loadNavCategories();

  return (
    <footer className="on-dark mt-24 bg-ink text-paper">
      <div className="mx-auto grid max-w-[88rem] gap-14 px-5 py-16 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Wordmark inverted />
          <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-paper/75">{brand.tagline}.</p>
          <Link
            href={paths.tellYourStory()}
            className="mt-8 inline-block border border-paper/60 px-5 py-3 text-sm tracking-wide text-paper transition-colors hover:bg-paper hover:text-ink"
          >
            Tell your story
          </Link>
        </div>

        <nav aria-label="Footer" className="lg:col-span-3">
          <p className="eyebrow text-mist">Publication</p>
          <ul className="mt-4 space-y-2">
            {navigation.footer.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-[0.95rem] text-paper/85 hover:text-paper">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Categories" className="lg:col-span-4">
          <p className="eyebrow text-mist">Categories</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={paths.category(category.slug)}
                  className="text-[0.95rem] text-paper/85 hover:text-paper"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-6 px-5 py-8 text-[0.8rem] text-paper/70 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl space-y-2">
            <p>
              © <CurrentYear /> {brand.publisher}. All rights reserved.
            </p>
            <p>{brand.disclaimer}</p>
          </div>
          <div className="flex flex-col gap-4 md:items-end">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {navigation.legal.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-paper">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href={paths.feed()} className="hover:text-paper">
                  RSS
                </a>
              </li>
            </ul>
            {brand.social.length > 0 ? (
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {brand.social.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-paper"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {brand.contactEmail ? (
              <a href={`mailto:${brand.contactEmail}`} className="hover:text-paper">
                {brand.contactEmail}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
