import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { StudioEditor } from "@/components/StudioEditor";
import type { Design, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (profile?.status === "disabled") redirect("/apps");

  // RLS returns designs the user owns *and* designs shared with them.
  const { data: designs } = await supabase
    .from("designs")
    .select("*")
    .order("updated_at", { ascending: false })
    .returns<Design[]>();

  // Colleagues to share with, and the current share memberships.
  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true })
    .returns<{ id: string; full_name: string | null; email: string }[]>();

  const { data: shares } = await supabase
    .from("design_shares")
    .select("design_id, shared_user_id")
    .returns<{ design_id: string; shared_user_id: string }[]>();

  return (
    <div className="min-h-screen">
      <Header
        isAdmin={profile?.role === "admin"}
        email={profile?.email ?? user.email ?? ""}
        active="studio"
      />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-espresso">
            Social Studio
          </h1>
          <p className="mt-1 text-espresso/60">
            Design graphics for your social posts — pick a format, drop in your
            logo and text, then download.
          </p>
        </div>

        <StudioEditor
          initialDesigns={designs ?? []}
          meId={user.id}
          people={(people ?? []).filter((p) => p.id !== user.id)}
          initialShares={shares ?? []}
        />
      </main>
    </div>
  );
}
