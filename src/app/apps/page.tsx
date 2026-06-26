import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { LibraryGrid } from "@/components/LibraryGrid";
import type { AppTile, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

type LibraryRow = { sort_order: number; apps: AppTile | null };

export default async function LibraryPage() {
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

  const { data: rows } = await supabase
    .from("user_apps")
    .select("sort_order, apps(*)")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .returns<LibraryRow[]>();

  const apps = (rows ?? [])
    .map((r) => r.apps)
    .filter((a): a is AppTile => Boolean(a));

  return (
    <div className="min-h-screen">
      <Header
        isAdmin={profile?.role === "admin"}
        email={profile?.email ?? user.email ?? ""}
        fullName={profile?.full_name}
        avatarUrl={profile?.avatar_url}
        active="library"
      />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-espresso">
            My Library
          </h1>
          <p className="mt-1 text-espresso/60">
            Your apps and tools. Drag a tile to reorder — your layout is saved.
          </p>
        </div>

        {apps.length === 0 ? (
          <div className="rounded-card border border-dashed border-tan/60 bg-white/50 p-12 text-center">
            <p className="text-espresso/60">
              Your library is empty.{" "}
              <Link
                href="/browse"
                className="font-semibold text-orange-light hover:underline"
              >
                Browse the catalog
              </Link>{" "}
              to add apps.
            </p>
          </div>
        ) : (
          <LibraryGrid apps={apps} />
        )}
      </main>
    </div>
  );
}
