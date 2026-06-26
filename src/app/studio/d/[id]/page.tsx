import { notFound } from "next/navigation";
import { StudioEditor } from "@/components/StudioEditor";
import { loadStudio } from "../../data";

export const dynamic = "force-dynamic";

export default async function EditDesignPage({
  params,
}: {
  params: { id: string };
}) {
  const { meId, designs, people, shares } = await loadStudio();

  // The design must be visible to this user (RLS already filtered the list).
  if (!designs.some((d) => d.id === params.id)) notFound();

  return (
    <div className="h-screen">
      <StudioEditor
        initialDesigns={designs}
        meId={meId}
        people={people}
        initialShares={shares}
        openId={params.id}
      />
    </div>
  );
}
