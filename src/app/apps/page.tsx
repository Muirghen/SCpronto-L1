import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { AppIcon } from "@/components/AppIcon";
import type { AppTile, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
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

  if (profile?.status === "disabled") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h1 className="font-serif text-2xl font-bold text-espresso">
            Account disabled
          </h1>
          <p className="mt-2 text-espresso/60">
            Your access has been turned off. Contact an administrator if you
            think this is a mistake.
          </p>
        </div>
      </main>
    );
  }

  const { data: apps } = await supabase
    .from("apps")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<AppTile[]>();

  return (
    <div className="min-h-screen">
      <Header
        isAdmin={profile?.role === "admin"}
        email={profile?.email ?? user.email ?? ""}
        active="apps"
      />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-espresso">
            Apps &amp; Tools
          </h1>
          <p className="mt-1 text-espresso/60">
            Everything the SC Pronto team has access to.
          </p>
        </div>

        {!apps || apps.length === 0 ? (
          <div className="rounded-card border border-dashed border-tan/60 bg-white/50 p-12 text-center">
            <p className="text-espresso/60">
              No apps yet.{" "}
              {profile?.role === "admin"
                ? "Head to the Admin page to add the first one."
                : "Check back soon — an admin will add tools here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AppCard({ app }: { app: AppTile }) {
  const inner = (
    <div className="group flex h-full flex-col rounded-card border border-tan/40 bg-white/80 p-5 transition hover:-translate-y-0.5 hover:border-logo/60 hover:shadow-md">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cream text-2xl">
        <AppIcon app={app} />
      </div>
      <h3 className="font-serif text-lg font-semibold text-espresso">
        {app.name}
      </h3>
      {app.description && (
        <p className="mt-1 text-sm text-espresso/60">{app.description}</p>
      )}
      <span className="mt-auto pt-4 text-sm font-semibold text-orange-light">
        {app.kind === "embedded" ? "Open tool" : "Open"} →
      </span>
    </div>
  );

  if (app.kind === "link" && app.url) {
    return (
      <a href={app.url} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  // Embedded tools route internally by id.
  return <a href={`/tools/${app.id}`}>{inner}</a>;
}
