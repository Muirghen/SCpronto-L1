import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui";
import { addToLibrary, removeFromLibrary } from "@/app/apps/actions";
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

        {!apps || apps.length === 0 ? (
          <div className="rounded-card border border-dashed border-tan/60 bg-white/50 p-12 text-center">
            <p className="text-espresso/60">
              No apps in the catalog yet.{" "}
              {profile?.role === "admin"
                ? "Add the first one from the Admin page."
                : "Check back soon — an admin will add tools here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => {
              const added = inLibrary.has(app.id);
              return (
                <div
                  key={app.id}
                  className="animate-fade-in flex h-full flex-col rounded-card border border-tan/40 bg-white/80 p-5 transition hover:-translate-y-0.5 hover:border-logo/60 hover:shadow-md"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cream text-2xl">
                    <AppIcon app={app} />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-espresso">
                    {app.name}
                  </h3>
                  {app.description && (
                    <p className="mt-1 text-sm text-espresso/60">
                      {app.description}
                    </p>
                  )}
                  <div className="mt-auto pt-4">
                    {added ? (
                      <form action={removeFromLibrary}>
                        <input type="hidden" name="app_id" value={app.id} />
                        <Button
                          variant="ghost"
                          className="w-full text-sm"
                          aria-label={`Remove ${app.name} from your library`}
                        >
                          ✓ In library — Remove
                        </Button>
                      </form>
                    ) : (
                      <form action={addToLibrary}>
                        <input type="hidden" name="app_id" value={app.id} />
                        <Button
                          className="w-full text-sm"
                          aria-label={`Add ${app.name} to your library`}
                        >
                          + Add to library
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
