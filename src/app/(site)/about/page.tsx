import { pageMetadata, SitePage } from "@/components/site/page-view";

export async function generateMetadata() {
  return pageMetadata("about", "/about");
}

export default function AboutPage() {
  return <SitePage slug="about" withCta />;
}
