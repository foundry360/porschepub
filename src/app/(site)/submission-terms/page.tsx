import { pageMetadata, SitePage } from "@/components/site/page-view";

export async function generateMetadata() {
  return pageMetadata("submission-terms", "/submission-terms");
}

export default function SubmissionTermsPage() {
  return <SitePage slug="submission-terms" />;
}
