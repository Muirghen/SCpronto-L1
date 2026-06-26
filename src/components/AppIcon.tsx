import type { AppTile } from "@/lib/types";

/**
 * Renders an app's icon: the brand image at icon_url when set, otherwise the
 * emoji fallback. The emoji inherits the parent's font size.
 */
export function AppIcon({
  app,
  imgClassName = "h-7 w-7 object-contain",
}: {
  app: Pick<AppTile, "icon_url" | "icon_emoji" | "name">;
  imgClassName?: string;
}) {
  if (app.icon_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={app.icon_url} alt={`${app.name} logo`} className={imgClassName} />;
  }
  return <>{app.icon_emoji ?? "🔗"}</>;
}
