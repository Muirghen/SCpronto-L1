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
  active: "apps" | "admin";
}) {
  return (
    <header className="border-b border-tan/30 bg-cream/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/apps">
          <Logo size={34} withWordmark />
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/apps"
            className={`rounded-lg px-3 py-1.5 font-medium ${
              active === "apps"
                ? "bg-espresso text-cream"
                : "text-espresso/70 hover:bg-tan/10"
            }`}
          >
            Apps
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
