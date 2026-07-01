import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publishScheduledPost } from "@/lib/social/publish";
import type { ScheduledPost } from "@/lib/types";

export const dynamic = "force-dynamic";

// Vercel Cron hits this on a schedule (see vercel.json). It uses the
// service-role key to bypass RLS — there's no logged-in user in this
// context, since it runs server-side on a timer rather than per-request.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: due } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("status", "scheduled")
    .in("channel", ["facebook", "instagram"])
    .lte("scheduled_at", new Date().toISOString())
    .limit(20)
    .returns<ScheduledPost[]>();

  if (!due || due.length === 0) {
    return NextResponse.json({ published: 0 });
  }

  const { data: creds } = await supabase
    .from("social_accounts")
    .select("fb_page_id, fb_page_access_token, ig_user_id")
    .eq("id", 1)
    .maybeSingle();

  for (const post of due) {
    await publishScheduledPost(supabase, post, creds ?? null);
  }

  return NextResponse.json({ published: due.length });
}
