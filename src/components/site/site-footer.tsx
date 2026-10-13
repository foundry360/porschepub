import Link from "next/link";
import { cacheLife } from "next/cache";
import { brand } from "@/config/brand";
import { navigation } from "@/config/site";
import { paths } from "@/lib/urls";
import { loadNavCategories } from "./site-header";

async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export async function SiteFooter() {
  const categories = await loadNavCategories();

  const nameParts = brand.name.trim().split(/\s+/);
  const lastWord = nameParts.length > 1 ? nameParts.pop() : null;

  return (
    <footer className="site-footer on-dark bg-ink text-paper">
      <div className="mx-auto max-w-[88rem] px-5 pb-10 pt-20 sm:px-8 sm:pt-28">
        <Link href="/" aria-label={`${brand.name}, home`} className="font-headline block text-[clamp(3rem,11vw,10.5rem)] leading-[0.92]">
          {lastWord ? (
            <>
              {nameParts.join(" ")} <em>{lastWord}</em>
            </>
          ) : (
            brand.name
          )}
        </Link>
        <p className="mt-6 max-w-md text-[1rem] leading-relaxed text-paper/70">{brand.tagline}.</p>

        <div className="mt-16 grid gap-10 border-t border-white/15 pt-10 md:grid-cols-12">
          <nav aria-label="Footer" className="md:col-span-5">
            <ul className="flex flex-wrap gap-x-7 gap-y-3">
              {navigation.footer.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-[0.95rem] text-paper/85 transition-colors hover:text-[#f4c9c5]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {categories.length > 0 ? (
            <nav aria-label="Categories" className="md:col-span-7">
              <p className="eyebrow eyebrow-slash text-paper/60">Categories</p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={paths.category(category.slug)}
                      className="text-[0.9rem] text-paper/75 transition-colors hover:text-paper"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>

        <div className="mt-14 flex flex-col gap-6 text-[0.8rem] text-paper/65 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl space-y-2">
            <p>
              © <CurrentYear /> {brand.publisher}. All rights reserved.
            </p>
            <p>{brand.disclaimer}</p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
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
              {brand.social.map((item) => (
                <li key={item.href}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="hover:text-paper">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
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
