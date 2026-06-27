import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Design, Profile, ScheduledPost } from "@/lib/types";

export type SchedulerData = {
  meId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  designs: Design[];
  posts: ScheduledPost[];
};

/**
 * Loader for the Publisher/Scheduler route: authenticates, then pulls the
 * user's saved designs (to attach as post images) and their scheduled posts.
 * RLS limits posts to the signed-in user. Mirrors loadStudio's auth gating.
 */
export async function loadScheduler(): Promise<SchedulerData> {
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

  const { data: designs } = await supabase
    .from("designs")
    .select("*")
    .order("updated_at", { ascending: false })
    .returns<Design[]>();

  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("*")
    .order("scheduled_at", { ascending: true })
    .returns<ScheduledPost[]>();

  return {
    meId: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isAdmin: profile?.role === "admin",
    designs: designs ?? [],
    posts: posts ?? [],
  };
}
