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

  const { data: designs } = await supabase
    .from("designs")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .returns<Design[]>();

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

        <StudioEditor initialDesigns={designs ?? []} />
      </main>
    </div>
  );
}
