import Link from "next/link";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { NotificationBell } from "./NotificationBell";
import { signOut } from "@/app/auth/actions";

export function Header({
  isAdmin,
  email,
  fullName,
  avatarUrl,
  active,
}: {
  isAdmin: boolean;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  active: "library" | "browse" | "admin" | "studio" | "profile";
}) {
  const link = (href: string, label: string, key: typeof active) => (
    <Link
      href={href}
      className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium transition active:scale-95 sm:px-3 ${
        active === key
          ? "bg-espresso text-cream"
          : "text-espresso/70 hover:bg-tan/10"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-tan/30 bg-cream/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <Link href="/apps" className="transition hover:opacity-80">
          <Logo size={32} withWordmark />
        </Link>

        <nav className="no-scrollbar flex max-w-full items-center gap-0.5 overflow-x-auto text-sm sm:gap-1">
          {link("/apps", "My Library", "library")}
          {link("/browse", "Browse", "browse")}
          {link("/studio", "Studio", "studio")}
          {isAdmin && link("/admin", "Admin", "admin")}

          <span className="mx-1 hidden h-5 w-px bg-tan/30 sm:inline-block" />

          <NotificationBell />

          <Link
            href="/profile"
            title="Your profile"
            className={`flex shrink-0 items-center gap-2 rounded-full p-0.5 pr-2 transition hover:bg-tan/10 ${
              active === "profile" ? "bg-tan/15" : ""
            }`}
          >
            <Avatar name={fullName} email={email} url={avatarUrl} size={28} />
            <span className="hidden max-w-[10rem] truncate text-espresso/70 lg:inline">
              {fullName?.trim() || email}
            </span>
          </Link>

          <form action={signOut}>
            <button className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-orange-light transition hover:bg-logo/10 active:scale-95 sm:px-3">
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
