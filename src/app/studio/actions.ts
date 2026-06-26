"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Design } from "@/lib/types";

const IMAGE_BUCKET = "design-images";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

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

  // On update we never touch user_id (a shared collaborator must not become
  // the owner); RLS decides whether they may write. On insert we set owner.
  const fields = {
    name,
    format_key: input.formatKey,
    data: input.data,
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? supabase.from("designs").update(fields).eq("id", input.id)
    : supabase.from("designs").insert({ ...fields, user_id: userId });

  const { data, error } = await query.select("*").single<Design>();
  if (error) throw error;

  revalidatePath("/studio");
  return data;
}

/**
 * Upload an image to the public design-images bucket and return its URL.
 * Stored under the user's own folder so RLS limits writes to that user.
 */
export async function uploadDesignImage(
  form: FormData,
): Promise<{ url: string }> {
  const { supabase, userId } = await requireUser();

  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("No image provided.");
  if (!file.type.startsWith("image/")) {
    throw new Error("That file isn't an image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 10 MB).");
  }

  const ext =
    (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "png";
  const path = `${userId}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

/** Replace the set of users a design is shared with (owner only). */
export async function shareDesign(
  designId: string,
  userIds: string[],
): Promise<void> {
  const { supabase } = await requireUser();

  // Clear existing shares, then add the selected ones.
  const { error: delErr } = await supabase
    .from("design_shares")
    .delete()
    .eq("design_id", designId);
  if (delErr) throw delErr;

  if (userIds.length) {
    const rows = userIds.map((uid) => ({
      design_id: designId,
      shared_user_id: uid,
    }));
    const { error: insErr } = await supabase.from("design_shares").insert(rows);
    if (insErr) throw insErr;
  }

  revalidatePath("/studio");
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
