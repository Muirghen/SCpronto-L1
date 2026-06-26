import Link from "next/link";
import { Logo } from "./Logo";
import { signOut } from "@/app/auth/actions";

export function Header({
  isAdmin,
  email,
  active,
}: {
  isAdmin: boolean;
  email: string;
  active: "library" | "browse" | "admin" | "studio";
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-tan/30 bg-cream/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <Link href="/apps" className="transition hover:opacity-80">
          <Logo size={32} withWordmark />
        </Link>

        <nav className="no-scrollbar flex max-w-full items-center gap-0.5 overflow-x-auto text-sm sm:gap-1">
          <Link
            href="/apps"
            className={`rounded-lg px-3 py-1.5 font-medium ${
              active === "library"
                ? "bg-espresso text-cream"
                : "text-espresso/70 hover:bg-tan/10"
            }`}
          >
            My Library
          </Link>
          <Link
            href="/browse"
            className={`rounded-lg px-3 py-1.5 font-medium ${
              active === "browse"
                ? "bg-espresso text-cream"
                : "text-espresso/70 hover:bg-tan/10"
            }`}
          >
            Browse
          </Link>
          <Link
            href="/studio"
            className={`rounded-lg px-3 py-1.5 font-medium ${
              active === "studio"
                ? "bg-espresso text-cream"
                : "text-espresso/70 hover:bg-tan/10"
            }`}
          >
            Studio
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={`rounded-lg px-3 py-1.5 font-medium ${
                active === "admin"
                  ? "bg-espresso text-cream"
                  : "text-espresso/70 hover:bg-tan/10"
              }`}
            >
              Admin
            </Link>
          )}
          <span className="mx-2 hidden text-espresso/50 sm:inline">{email}</span>
          <form action={signOut}>
            <button className="rounded-lg px-3 py-1.5 font-medium text-orange-light hover:bg-logo/10">
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
