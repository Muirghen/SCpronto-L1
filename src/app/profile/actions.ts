"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

/** Upload a new avatar image, store it, and point the profile at its URL. */
export async function uploadAvatar(form: FormData): Promise<void> {
  const { supabase, userId } = await requireUser();

  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("No image provided.");
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("Image is too large (max 5 MB).");

  const ext =
    (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "png";
  const path = `${userId}/${randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: data.publicUrl })
    .eq("id", userId);
  if (error) throw error;

  revalidatePath("/profile");
  revalidatePath("/", "layout");
}

/** Remove the custom avatar and fall back to the initial. */
export async function removeAvatar(): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);
  if (error) throw error;
  revalidatePath("/profile");
  revalidatePath("/", "layout");
}

/** Update the user's display name. */
export async function updateName(form: FormData): Promise<void> {
  const { supabase, userId } = await requireUser();
  const fullName = String(form.get("full_name") ?? "").trim();
  if (!fullName) throw new Error("Name can't be empty.");
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);
  if (error) throw error;
  revalidatePath("/profile");
  revalidatePath("/", "layout");
}
