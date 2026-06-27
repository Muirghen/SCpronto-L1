"use client";

import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui";
import { addToLibrary, removeFromLibrary } from "@/app/apps/actions";
import type { AppTile } from "@/lib/types";

export function BrowseGrid({
  apps,
  inLibrary,
}: {
  apps: AppTile[];
  inLibrary: string[];
}) {
  const [query, setQuery] = useState("");
  const owned = new Set(inLibrary);

  const q = query.trim().toLowerCase();
  const visible = q
    ? apps.filter((a) =>
        `${a.name} ${a.description ?? ""}`.toLowerCase().includes(q),
      )
    : apps;

  return (
    <div>
      <div className="mb-6 max-w-md">
        <SearchBar value={query} onChange={setQuery} placeholder="Search the catalog…" />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-card border border-dashed border-tan/60 bg-white/50 p-12 text-center">
          <p className="text-espresso/60">
            {q
              ? `No apps match “${query.trim()}”.`
              : "No apps in the catalog yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((app) => {
            const added = owned.has(app.id);
            return (
              <div
                key={app.id}
                className="animate-fade-in flex h-full flex-col rounded-card border border-tan/40 bg-white/80 p-5 transition hover:-translate-y-0.5 hover:border-logo/60 hover:shadow-md"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cream text-2xl">
                  <AppIcon app={app} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-espresso">
                  {app.name}
                </h3>
                {app.description && (
                  <p className="mt-1 text-sm text-espresso/60">{app.description}</p>
                )}
                <div className="mt-auto pt-4">
                  {added ? (
                    <form action={removeFromLibrary}>
                      <input type="hidden" name="app_id" value={app.id} />
                      <Button
                        variant="ghost"
                        className="w-full text-sm"
                        aria-label={`Remove ${app.name} from your library`}
                      >
                        ✓ In library — Remove
                      </Button>
                    </form>
                  ) : (
                    <form action={addToLibrary}>
                      <input type="hidden" name="app_id" value={app.id} />
                      <Button
                        className="w-full text-sm"
                        aria-label={`Add ${app.name} to your library`}
                      >
                        + Add to library
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
