import { clsx } from "@/lib/clsx";

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-espresso/80">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-lg border border-tan/50 bg-white px-3.5 py-2.5 text-espresso placeholder:text-tan focus:border-logo focus:outline-none"
      />
    </label>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: {
  variant?: "primary" | "ghost" | "dark";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100",
        variant === "primary" &&
          "bg-logo text-cream hover:bg-orange-light",
        variant === "dark" && "bg-espresso text-cream hover:bg-espresso/90",
        variant === "ghost" &&
          "border border-tan/60 text-espresso hover:bg-tan/10",
        className,
      )}
    />
  );
}

export function Alert({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div
      className={clsx(
        "rounded-lg border px-3.5 py-2.5 text-sm",
        kind === "error"
          ? "border-logo/40 bg-logo/10 text-orange-light"
          : "border-tan/50 bg-tan/10 text-espresso",
      )}
    >
      {children}
    </div>
  );
}
