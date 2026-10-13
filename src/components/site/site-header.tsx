import Link from "next/link";
import { brand } from "@/config/brand";
import { pillClass } from "@/components/ui/pill";
import { navigation } from "@/config/site";
import { paths } from "@/lib/urls";
import { listCategories } from "@/server/content/public";
import { logger } from "@/server/logger";
import { MenuDialog } from "./menu-dialog";
import { ThemeToggle } from "./theme";
import { Wordmark } from "./wordmark";

export async function loadNavCategories() {
  try {
    return await listCategories();
  } catch (error) {
    // Navigation must never take the whole site down.
    logger.error("nav.categories_failed", undefined, error);
    return [];
  }
}

export async function SiteHeader() {
  const categories = await loadNavCategories();

  return (
    <header className="on-black sticky top-0 z-30 border-b border-line bg-black">
      <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between px-5 sm:h-20 sm:px-8">
        <Wordmark />
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href={paths.tellYourStory()} className={pillClass("outline", "whitespace-nowrap !px-5 !py-2.5 max-sm:hidden")}>
            Tell Your Story
          </Link>
          <ThemeToggle className="w-11 justify-center rounded-full border border-line hover:border-accent" />
          <MenuDialog
          items={navigation.primary}
          categories={categories.map((category) => ({
            label: category.name,
            href: paths.category(category.slug),
          }))}
          social={brand.social}
          />
        </div>
      </div>
    </header>
  );
}
