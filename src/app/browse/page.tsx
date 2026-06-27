import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { BrowseGrid } from "@/components/BrowseGrid";
import type { AppTile, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
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

  if (profile?.status === "pending") redirect("/pending");
  if (profile?.status === "disabled") redirect("/apps");

  const { data: apps } = await supabase
    .from("apps")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<AppTile[]>();

  const { data: mine } = await supabase
    .from("user_apps")
    .select("app_id")
    .eq("user_id", user.id)
    .returns<{ app_id: string }[]>();

  const inLibrary = new Set((mine ?? []).map((r) => r.app_id));

  return (
    <div className="min-h-screen">
      <Header
        isAdmin={profile?.role === "admin"}
        email={profile?.email ?? user.email ?? ""}
        fullName={profile?.full_name}
        avatarUrl={profile?.avatar_url}
        active="browse"
      />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-espresso">
            Browse apps
          </h1>
          <p className="mt-1 text-espresso/60">
            Everything the SC Pronto team makes available. Add what you need to
            your library.
          </p>
        </div>

        <BrowseGrid apps={apps ?? []} inLibrary={Array.from(inLibrary)} />
      </main>
    </div>
  );
}
