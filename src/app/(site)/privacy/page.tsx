import { pageMetadata, SitePage } from "@/components/site/page-view";

export async function generateMetadata() {
  return pageMetadata("privacy", "/privacy");
}

export default function PrivacyPage() {
  return <SitePage slug="privacy" />;
}
