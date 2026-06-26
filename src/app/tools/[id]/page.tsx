import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import type { AppTile, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Host page for embedded tools. Each embedded app gets its own panel here.
 * Add a real implementation per tool by switching on the app's id/name.
 */
export default async function ToolPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (me?.status === "pending") redirect("/pending");
  if (me?.status === "disabled") redirect("/apps");

  const { data: app } = await supabase
    .from("apps")
    .select("*")
    .eq("id", params.id)
    .single<AppTile>();

  return (
    <div className="min-h-screen">
      <Header
        isAdmin={me?.role === "admin"}
        email={me?.email ?? ""}
        fullName={me?.full_name}
        avatarUrl={me?.avatar_url}
        active="library"
      />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Link href="/apps" className="text-sm font-semibold text-orange-light">
          ← Back to apps
        </Link>

        {!app ? (
          <p className="mt-6 text-espresso/60">Tool not found.</p>
        ) : (
          <>
            <h1 className="mt-4 font-serif text-3xl font-bold text-espresso">
              {app.icon_emoji} {app.name}
            </h1>
            {app.description && (
              <p className="mt-1 text-espresso/60">{app.description}</p>
            )}

            {/* If the embedded tool points at a URL, frame it; otherwise show a
                placeholder where its custom UI will live. */}
            {app.url ? (
              <iframe
                src={app.url}
                className="mt-6 h-[70vh] w-full rounded-card border border-tan/40 bg-white"
                title={app.name}
              />
            ) : (
              <div className="mt-6 rounded-card border border-dashed border-tan/60 bg-white/50 p-12 text-center text-espresso/60">
                This embedded tool doesn&apos;t have a UI yet. Wire it up in{" "}
                <code className="rounded bg-tan/20 px-1.5 py-0.5">
                  src/app/tools/[id]/page.tsx
                </code>
                .
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
