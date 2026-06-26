import { clsx } from "@/lib/clsx";

// Warm brand-ish palette for the initial fallback.
const COLORS = ["#D85A30", "#A8451F", "#E8743F", "#C9A06A", "#7C4A2A", "#3A1A0E"];

function pick(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

/**
 * A user's avatar: their uploaded image when present, otherwise a coloured
 * circle with the first letter of their name (or email).
 */
export function Avatar({
  name,
  email,
  url,
  size = 36,
  className,
}: {
  name?: string | null;
  email?: string | null;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const label = (name?.trim() || email?.trim() || "?").charAt(0).toUpperCase();
  const ring = "ring-1 ring-black/5";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name || email || "avatar"}
        width={size}
        height={size}
        className={clsx("shrink-0 rounded-full object-cover", ring, className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-cream",
        ring,
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: pick(name || email || "?"),
        fontSize: Math.round(size * 0.42),
      }}
    >
      {label}
    </span>
  );
}
