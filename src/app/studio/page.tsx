import { Header } from "@/components/Header";
import { StudioHome } from "@/components/StudioHome";
import { loadStudio } from "./data";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const { meId, email, isAdmin, designs, people } = await loadStudio();

  return (
    <div className="min-h-screen">
      <Header isAdmin={isAdmin} email={email} active="studio" />
      <StudioHome meId={meId} designs={designs} people={people} />
    </div>
  );
}
