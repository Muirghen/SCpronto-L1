import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { ProfileCard } from "@/components/ProfileCard";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
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

  if (!profile) redirect("/login");
  if (profile.status === "pending") redirect("/pending");

  return (
    <div className="min-h-screen">
      <Header
        isAdmin={profile.role === "admin"}
        email={profile.email}
        fullName={profile.full_name}
        avatarUrl={profile.avatar_url}
        active="profile"
      />

      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-espresso">Your profile</h1>
          <p className="mt-1 text-espresso/60">
            Update your photo and display name.
          </p>
        </div>

        <ProfileCard profile={profile} />

        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-card border border-tan/40 bg-white/50 p-6 text-sm">
          <div>
            <dt className="text-espresso/50">Email</dt>
            <dd className="mt-0.5 font-medium text-espresso">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-espresso/50">Role</dt>
            <dd className="mt-0.5 font-medium capitalize text-espresso">{profile.role}</dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
