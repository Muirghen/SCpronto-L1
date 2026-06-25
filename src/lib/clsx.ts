/** Tiny classnames helper — joins truthy string args with spaces. */
export function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
