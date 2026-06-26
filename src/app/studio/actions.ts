"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Design } from "@/lib/types";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

/** Create or update a saved design. Returns the stored row. */
export async function saveDesign(input: {
  id?: string;
  name: string;
  formatKey: string;
  data: unknown;
}): Promise<Design> {
  const { supabase, userId } = await requireUser();
  const name = input.name.trim() || "Untitled design";

  const row = {
    user_id: userId,
    name,
    format_key: input.formatKey,
    data: input.data,
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? supabase.from("designs").update(row).eq("id", input.id).eq("user_id", userId)
    : supabase.from("designs").insert(row);

  const { data, error } = await query.select("*").single<Design>();
  if (error) throw error;

  revalidatePath("/studio");
  return data;
}

/** Delete a saved design. */
export async function deleteDesign(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("designs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/studio");
}
