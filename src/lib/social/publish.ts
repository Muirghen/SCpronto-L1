// Thin wrapper around the Meta Graph API for publishing a single image
// post from the Scheduler to a Facebook Page or an Instagram professional
// account. Both require a Page access token with the right permissions,
// and Instagram specifically requires the image to be reachable at a
// public URL (the Scheduler's design/upload images already live in a
// public Supabase Storage bucket).

const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type PublishResult = { ok: true; postId: string } | { ok: false; error: string };

async function graphFetch(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  const res = await fetch(url, {
    method: "POST",
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    const message = json?.error?.message || `Graph API error (${res.status})`;
    throw new Error(message);
  }
  return json;
}

export async function publishToFacebook(
  pageId: string,
  pageAccessToken: string,
  imageUrl: string,
  caption: string,
): Promise<PublishResult> {
  try {
    const json = await graphFetch(`${pageId}/photos`, {
      url: imageUrl,
      caption,
      access_token: pageAccessToken,
    });
    return { ok: true, postId: json.post_id || json.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function publishToInstagram(
  igUserId: string,
  pageAccessToken: string,
  imageUrl: string,
  caption: string,
): Promise<PublishResult> {
  try {
    // Step 1: create a media container.
    const container = await graphFetch(`${igUserId}/media`, {
      image_url: imageUrl,
      caption,
      access_token: pageAccessToken,
    });

    // Step 2: publish the container.
    const published = await graphFetch(`${igUserId}/media_publish`, {
      creation_id: container.id,
      access_token: pageAccessToken,
    });

    return { ok: true, postId: published.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

type SchedulablePost = {
  id: string;
  channel: "instagram" | "facebook" | "x";
  caption: string;
  image_url: string | null;
};

type Credentials = {
  fb_page_id: string | null;
  fb_page_access_token: string | null;
  ig_user_id: string | null;
};

// Shared by the Scheduler's "Publish now" action and the cron route:
// publishes one post to its channel and writes the result back.
// `supabase` only needs `.from(table).update(...).eq(...)`.
export async function publishScheduledPost(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  post: SchedulablePost,
  creds: Credentials | null,
) {
  if (!post.image_url) {
    await supabase
      .from("scheduled_posts")
      .update({ status: "failed", error: "No image attached — upload one before publishing." })
      .eq("id", post.id);
    return;
  }

  if (post.channel === "x") {
    await supabase
      .from("scheduled_posts")
      .update({ status: "failed", error: "X publishing isn't connected yet." })
      .eq("id", post.id);
    return;
  }

  if (!creds?.fb_page_access_token) {
    await supabase
      .from("scheduled_posts")
      .update({ status: "failed", error: "No social account credentials configured." })
      .eq("id", post.id);
    return;
  }

  const result =
    post.channel === "facebook"
      ? creds.fb_page_id
        ? await publishToFacebook(creds.fb_page_id, creds.fb_page_access_token, post.image_url, post.caption)
        : { ok: false as const, error: "No Facebook Page ID configured." }
      : creds.ig_user_id
        ? await publishToInstagram(creds.ig_user_id, creds.fb_page_access_token, post.image_url, post.caption)
        : { ok: false as const, error: "No Instagram account ID configured." };

  if (result.ok) {
    await supabase
      .from("scheduled_posts")
      .update({
        status: "posted",
        error: null,
        [post.channel === "facebook" ? "fb_post_id" : "ig_post_id"]: result.postId,
      })
      .eq("id", post.id);
  } else {
    await supabase
      .from("scheduled_posts")
      .update({ status: "failed", error: result.error })
      .eq("id", post.id);
  }
}
