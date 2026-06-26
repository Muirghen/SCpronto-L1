import { Header } from "@/components/Header";
import { StudioHome } from "@/components/StudioHome";
import { loadStudio } from "./data";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const { meId, email, fullName, avatarUrl, isAdmin, designs, people } = await loadStudio();

  return (
    <div className="min-h-screen">
      <Header isAdmin={isAdmin} email={email} fullName={fullName} avatarUrl={avatarUrl} active="studio" />
      <StudioHome meId={meId} designs={designs} people={people} />
    </div>
  );
}
