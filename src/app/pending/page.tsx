import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/auth/actions";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, full_name")
    .eq("id", user.id)
    .single<Pick<Profile, "status" | "full_name">>();

  // Already approved — send them in. Disabled accounts stay on this page.
  if (profile?.status === "active") redirect("/apps");

  const disabled = profile?.status === "disabled";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Logo size={56} withWordmark />
        </div>
        <div className="rounded-card border border-tan/40 bg-white/70 p-8 shadow-sm">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-logo/15 text-2xl">
            {disabled ? "🚫" : "⏳"}
          </span>
          <h1 className="font-serif text-2xl font-bold text-espresso">
            {disabled ? "Account disabled" : "Pending confirmation"}
          </h1>
          <p className="mt-2 text-espresso/60">
            {disabled
              ? "Your access has been turned off. Contact an administrator if you think this is a mistake."
              : "Thanks for registering! An administrator needs to confirm your account before you can sign in. You'll be able to access the portal once you're approved."}
          </p>
          <form action={signOut} className="mt-6">
            <button className="rounded-lg border border-tan/60 px-4 py-2.5 text-sm font-semibold text-espresso transition hover:bg-tan/10 active:scale-[0.97]">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
