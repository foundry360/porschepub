import { AdminHeading } from "@/components/admin/ui";
import { StoryEditorLoader } from "../editor-loader";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "New story" };

export default function NewStoryPage() {
  return (
    <>
      <AdminHeading title="New story" description="Drafts are private until you publish them." />
      <StoryEditorLoader id={null} />
    </>
  );
}
