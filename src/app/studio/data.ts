import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Design, Profile } from "@/lib/types";

export type Person = { id: string; full_name: string | null; email: string };

export type StudioData = {
  meId: string;
  email: string;
  isAdmin: boolean;
  designs: Design[];
  people: Person[];
  shares: { design_id: string; shared_user_id: string }[];
};

/**
 * Shared loader for the Studio hub and editor routes: authenticates, then
 * pulls the user's designs (owned + shared via RLS), colleagues to share
 * with, and current share memberships. Redirects if signed out or disabled.
 */
export async function loadStudio(): Promise<StudioData> {
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
    .order("updated_at", { ascending: false })
    .returns<Design[]>();

  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true })
    .returns<Person[]>();

  const { data: shares } = await supabase
    .from("design_shares")
    .select("design_id, shared_user_id")
    .returns<{ design_id: string; shared_user_id: string }[]>();

  return {
    meId: user.id,
    email: profile?.email ?? user.email ?? "",
    isAdmin: profile?.role === "admin",
    designs: designs ?? [],
    people: (people ?? []).filter((p) => p.id !== user.id),
    shares: shares ?? [],
  };
}
