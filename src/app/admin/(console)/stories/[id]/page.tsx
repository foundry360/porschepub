import { AdminHeading } from "@/components/admin/ui";
import { StoryEditorLoader } from "../editor-loader";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Edit story" };

export default async function EditStoryPage({ params, searchParams }: PageProps<"/admin/stories/[id]">) {
  const { id } = await params;
  const { created } = await searchParams;
  return (
    <>
      <AdminHeading title="Edit story" />
      <StoryEditorLoader id={id} justCreated={Boolean(created)} />
    </>
  );
}
