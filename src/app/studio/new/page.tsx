import { StudioEditor } from "@/components/StudioEditor";
import { loadStudio } from "../data";

export const dynamic = "force-dynamic";

export default async function NewDesignPage() {
  const { meId, designs, people, shares } = await loadStudio();

  return (
    <div className="h-screen">
      <StudioEditor
        initialDesigns={designs}
        meId={meId}
        people={people}
        initialShares={shares}
      />
    </div>
  );
}
