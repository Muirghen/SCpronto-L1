"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

/** Add a catalog app to the current user's library, at the end of the order. */
export async function addToLibrary(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const appId = String(formData.get("app_id") ?? "");
  if (!appId) throw new Error("Missing app id.");

  // Place new additions after everything already in the library.
  const { data: last } = await supabase
    .from("user_apps")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from("user_apps")
    .upsert(
      { user_id: userId, app_id: appId, sort_order: nextOrder },
      { onConflict: "user_id,app_id", ignoreDuplicates: true },
    );
  if (error) throw error;

  revalidatePath("/apps");
  revalidatePath("/browse");
}

/** Remove an app from the current user's library. */
export async function removeFromLibrary(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const appId = String(formData.get("app_id") ?? "");
  if (!appId) throw new Error("Missing app id.");

  const { error } = await supabase
    .from("user_apps")
    .delete()
    .eq("user_id", userId)
    .eq("app_id", appId);
  if (error) throw error;

  revalidatePath("/apps");
  revalidatePath("/browse");
}

/** Persist a new ordering for the current user's library. */
export async function reorderLibrary(orderedAppIds: string[]) {
  const { supabase, userId } = await requireUser();

  const rows = orderedAppIds.map((appId, index) => ({
    user_id: userId,
    app_id: appId,
    sort_order: index,
  }));

  const { error } = await supabase
    .from("user_apps")
    .upsert(rows, { onConflict: "user_id,app_id" });
  if (error) throw error;

  revalidatePath("/apps");
}
