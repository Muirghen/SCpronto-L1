/**
 * Company-wide settings. The allowed email domain restricts who can register.
 * Override via NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN in the environment if it changes.
 */
export const ALLOWED_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "scpronto.com";

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN.toLowerCase()}`);
}
