import { AdminHeading } from "@/components/admin/ui";
import { ContributorForm } from "@/components/admin/contributor-form";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "New contributor" };

export default function NewContributorPage() {
  return (
    <>
      <AdminHeading title="New contributor" />
      <ContributorForm
        avatar={null}
        values={{
          name: "",
          slug: "",
          descriptor: "",
          bio: "",
          expertise: "",
          websiteUrl: "",
          socialUrl: "",
          profileVisible: false,
          isHighlighted: false,
          email: "",
          notes: "",
        }}
      />
    </>
  );
}
