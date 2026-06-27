import "server-only";

/**
 * Best-effort email to all active admins when a new account needs approval.
 *
 * Requires these env vars (set them in Vercel); if any are missing this is a
 * no-op, so in-app notifications still work without email configured:
 *   - RESEND_API_KEY          (https://resend.com)
 *   - NOTIFY_FROM_EMAIL       e.g. "SC Pronto <noreply@yourdomain.com>"
 *   - SUPABASE_SERVICE_ROLE_KEY  (Supabase → Project Settings → API)
 *   - NEXT_PUBLIC_SUPABASE_URL   (already set)
 * Optional: NEXT_PUBLIC_SITE_URL for an absolute "Review" link.
 */
export async function emailAdminsPendingApproval(newUser: {
  name: string;
  email: string;
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!resendKey || !from || !serviceKey || !supabaseUrl) return;

  // Read active admin emails with the service role (bypasses RLS).
  const res = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=email&role=eq.admin&status=eq.active`,
    {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: "no-store",
    },
  );
  if (!res.ok) return;
  const admins = (await res.json()) as { email: string }[];
  const to = admins.map((a) => a.email).filter(Boolean);
  if (to.length === 0) return;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const reviewLink = site ? `${site}/admin` : "the Admin page";
  const name = newUser.name || newUser.email;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "New account pending approval",
      html:
        `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(newUser.email)}) ` +
        `just registered for the SC Pronto portal and is waiting for approval.</p>` +
        (site
          ? `<p><a href="${site}/admin">Review in Admin →</a></p>`
          : `<p>Approve them on ${reviewLink}.</p>`),
    }),
  });
}

/**
 * Best-effort confirmation email to a user once an admin approves their
 * account (status pending/disabled -> active). No-op if RESEND_API_KEY /
 * NOTIFY_FROM_EMAIL aren't set, so approval still works without email.
 */
export async function emailUserApproved(user: {
  name: string;
  email: string;
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;
  if (!resendKey || !from || !user.email) return;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const name = user.name || user.email;
  const cta = site
    ? `<p><a href="${site}/studio">Open SC Pronto →</a></p>`
    : "";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [user.email],
      subject: "Your SC Pronto account is approved",
      html:
        `<p>Hi ${escapeHtml(name)},</p>` +
        `<p>Your SC Pronto account has been approved. You can now sign in ` +
        `and start using the portal.</p>` +
        cta,
    }),
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}
