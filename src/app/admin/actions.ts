"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Role, Status } from "@/lib/types";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || profile?.status !== "active") {
    throw new Error("Admin access required.");
  }
  return { supabase, userId: user.id };
}

export async function setRole(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const targetId = String(formData.get("user_id"));
  const role = String(formData.get("role")) as Role;

  // Don't let an admin demote themselves (avoids locking out the portal).
  if (targetId === userId && role !== "admin") {
    throw new Error("You can't remove your own admin role.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", targetId);
  if (error) throw error;

  revalidatePath("/admin");
}

export async function setStatus(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const targetId = String(formData.get("user_id"));
  const status = String(formData.get("status")) as Status;

  if (targetId === userId && status === "disabled") {
    throw new Error("You can't disable your own account.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", targetId);
  if (error) throw error;

  revalidatePath("/admin");
}

export async function createApp(formData: FormData) {
  const { supabase } = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");

  const kind = (String(formData.get("kind")) || "link") as "link" | "embedded";
  const url = String(formData.get("url") ?? "").trim() || null;

  if (kind === "link" && !url) {
    throw new Error("A link app needs a URL.");
  }

  const { error } = await supabase.from("apps").insert({
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    url,
    icon_emoji: String(formData.get("icon_emoji") ?? "").trim() || "🔗",
    icon_url: String(formData.get("icon_url") ?? "").trim() || null,
    kind,
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  });
  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath("/apps");
}

export async function deleteApp(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("app_id"));

  const { error } = await supabase.from("apps").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath("/apps");
}
