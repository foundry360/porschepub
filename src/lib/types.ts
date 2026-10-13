import type { Block } from "@/lib/content/blocks";

/** Presentation-ready shapes returned by the content layer. */

export type MediaImage = {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  credit: string | null;
};

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type TagSummary = { id: string; slug: string; name: string };

export type ContributorSummary = {
  id: string;
  slug: string;
  name: string;
  descriptor: string | null;
  hasProfile: boolean;
  avatar: MediaImage | null;
};

export type ContributorProfile = ContributorSummary & {
  bio: string | null;
  expertise: string[];
  websiteUrl: string | null;
  socialUrl: string | null;
  updatedAt: string;
};

export type StorySummary = {
  id: string;
  slug: string;
  headline: string;
  subtitle: string | null;
  summary: string | null;
  format: string;
  readingMinutes: number;
  publishedAt: string;
  category: CategorySummary | null;
  contributor: ContributorSummary | null;
  leadImage: MediaImage | null;
};

export type StoryDetail = StorySummary & {
  blocks: Block[];
  images: Record<string, MediaImage>;
  tags: TagSummary[];
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrlOverride: string | null;
  ogImage: MediaImage | null;
  updatedAt: string;
  status: "draft" | "published" | "archived";
};

export type PageContent = {
  id: string;
  slug: string;
  kind: "general" | "about" | "legal";
  title: string;
  summary: string | null;
  blocks: Block[];
  images: Record<string, MediaImage>;
  legalReviewed: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type HomepageData = {
  hero: { kicker: string; headline: string; intro: string };
  featured: StorySummary | null;
  editorsPicks: StorySummary[];
  latest: StorySummary[];
  contributors: ContributorSummary[];
  categories: CategorySummary[];
};
