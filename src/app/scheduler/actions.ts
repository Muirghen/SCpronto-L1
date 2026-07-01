"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validatePost, isChannelKey } from "@/lib/scheduler/channels";
import { publishScheduledPost } from "@/lib/social/publish";
import type { PostStatus, ScheduledPost } from "@/lib/types";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

export type SavePostInput = {
  id?: string;
  channel: string;
  caption: string;
  scheduledAt: string;
  designId?: string | null;
  imageUrl?: string | null;
  status?: PostStatus;
};

/** Create or update a scheduled post (owner only, enforced by RLS). */
export async function savePost(input: SavePostInput): Promise<ScheduledPost> {
  const { supabase, userId } = await requireUser();

  const draft = {
    channel: input.channel,
    caption: input.caption ?? "",
    scheduled_at: input.scheduledAt,
    design_id: input.designId ?? null,
    image_url: input.imageUrl ?? null,
  };

  const { ok, errors } = validatePost(draft);
  if (!ok) throw new Error(errors.join(" "));
  if (!isChannelKey(input.channel)) throw new Error("Unknown channel.");

  const fields = {
    channel: input.channel,
    caption: draft.caption,
    scheduled_at: input.scheduledAt,
    design_id: draft.design_id,
    image_url: draft.image_url,
    status: input.status ?? "scheduled",
  };

  const query = input.id
    ? supabase
        .from("scheduled_posts")
        .update(fields)
        .eq("id", input.id)
        .eq("user_id", userId)
    : supabase
        .from("scheduled_posts")
        .insert({ ...fields, user_id: userId });

  const { data, error } = await query.select("*").single<ScheduledPost>();
  if (error) throw error;

  revalidatePath("/scheduler");
  return data;
}

/** Flip a post's status (e.g. mark it posted) without re-validating image. */
export async function setPostStatus(
  id: string,
  status: PostStatus,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("scheduled_posts")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/scheduler");
}

/**
 * Publish a post to its channel right now (Facebook/Instagram only — X
 * isn't connected yet). Looks up the shared org credentials via a
 * security-definer RPC so no employee needs direct access to the token.
 */
export async function publishPost(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { data: post, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single<ScheduledPost>();
  if (error) throw error;

  const { data: creds } = await supabase.rpc("social_credentials").single<{
    fb_page_id: string | null;
    fb_page_access_token: string | null;
    ig_user_id: string | null;
  }>();

  await publishScheduledPost(supabase, post, creds ?? null);
  revalidatePath("/scheduler");
}

/** Delete a scheduled post. */
export async function deletePost(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("scheduled_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/scheduler");
}
