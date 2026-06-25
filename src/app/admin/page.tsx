import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Field, Button } from "@/components/ui";
import type { AppTile, Profile } from "@/lib/types";
import {
  setRole,
  setStatus,
  createApp,
  deleteApp,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (me?.role !== "admin") redirect("/apps");

  const { data: people } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Profile[]>();

  const { data: apps } = await supabase
    .from("apps")
    .select("*")
    .order("sort_order", { ascending: true })
    .returns<AppTile[]>();

  return (
    <div className="min-h-screen">
      <Header isAdmin email={me.email} active="admin" />

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">
            Admin
          </h1>
          <p className="mt-1 text-espresso/60">
            Appoint admins, manage employee access, and curate the app catalog.
          </p>
        </div>

        {/* ---------------- People ---------------- */}
        <section>
          <h2 className="mb-4 font-serif text-xl font-semibold text-espresso">
            Employees &amp; admins
          </h2>
          <div className="overflow-hidden rounded-card border border-tan/40 bg-white/70">
            <table className="w-full text-left text-sm">
              <thead className="bg-espresso text-cream">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tan/30">
                {people?.map((p) => {
                  const isSelf = p.id === me.id;
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium text-espresso">
                        {p.full_name || "—"}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-tan">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-espresso/70">{p.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            p.role === "admin"
                              ? "bg-logo/15 text-orange-light"
                              : "bg-tan/15 text-espresso/70"
                          }`}
                        >
                          {p.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${
                            p.status === "active"
                              ? "text-espresso/70"
                              : "text-orange-light"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {p.role === "admin" ? (
                            <form action={setRole}>
                              <input type="hidden" name="user_id" value={p.id} />
                              <input type="hidden" name="role" value="employee" />
                              <Button
                                variant="ghost"
                                className="px-2.5 py-1 text-xs"
                                disabled={isSelf}
                              >
                                Revoke admin
                              </Button>
                            </form>
                          ) : (
                            <form action={setRole}>
                              <input type="hidden" name="user_id" value={p.id} />
                              <input type="hidden" name="role" value="admin" />
                              <Button
                                variant="dark"
                                className="px-2.5 py-1 text-xs"
                              >
                                Make admin
                              </Button>
                            </form>
                          )}
                          <form action={setStatus}>
                            <input type="hidden" name="user_id" value={p.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={p.status === "active" ? "disabled" : "active"}
                            />
                            <Button
                              variant="ghost"
                              className="px-2.5 py-1 text-xs"
                              disabled={isSelf && p.status === "active"}
                            >
                              {p.status === "active" ? "Disable" : "Enable"}
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------- Apps ---------------- */}
        <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="mb-4 font-serif text-xl font-semibold text-espresso">
              App catalog
            </h2>
            {!apps || apps.length === 0 ? (
              <p className="rounded-card border border-dashed border-tan/60 bg-white/50 p-8 text-center text-espresso/60">
                No apps yet — add your first one on the right.
              </p>
            ) : (
              <ul className="space-y-3">
                {apps.map((app) => (
                  <li
                    key={app.id}
                    className="flex items-center gap-4 rounded-card border border-tan/40 bg-white/70 p-4"
                  >
                    <span className="text-2xl">{app.icon_emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-espresso">{app.name}</p>
                      <p className="truncate text-sm text-espresso/60">
                        {app.kind === "link" ? app.url : "Embedded tool"}
                      </p>
                    </div>
                    <form action={deleteApp}>
                      <input type="hidden" name="app_id" value={app.id} />
                      <Button variant="ghost" className="px-2.5 py-1 text-xs">
                        Remove
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-4 font-serif text-xl font-semibold text-espresso">
              Add an app
            </h2>
            <form
              action={createApp}
              className="space-y-3 rounded-card border border-tan/40 bg-white/70 p-5"
            >
              <Field label="Name" name="name" placeholder="Drive" required />
              <Field
                label="Description"
                name="description"
                placeholder="Shared company files"
              />
              <div className="grid grid-cols-[80px_1fr] gap-3">
                <Field label="Icon" name="icon_emoji" placeholder="📁" />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-espresso/80">
                    Type
                  </span>
                  <select
                    name="kind"
                    className="w-full rounded-lg border border-tan/50 bg-white px-3.5 py-2.5 text-espresso focus:border-logo focus:outline-none"
                  >
                    <option value="link">External link</option>
                    <option value="embedded">Embedded tool</option>
                  </select>
                </label>
              </div>
              <Field
                label="URL (for external links)"
                name="url"
                type="url"
                placeholder="https://drive.google.com"
              />
              <Field
                label="Sort order"
                name="sort_order"
                type="number"
                defaultValue={0}
              />
              <Button type="submit" className="w-full">
                Add app
              </Button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
