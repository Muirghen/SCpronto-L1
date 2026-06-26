"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { Icon, type IconName } from "@/components/studio/Icon";
import { DesignThumb } from "@/components/studio/DesignThumb";
import { deleteDesign } from "@/app/studio/actions";
import { FORMATS } from "@/lib/studio/templates";
import type { Design } from "@/lib/types";
import type { Person } from "@/app/studio/data";

function formatLabel(key: string) {
  return FORMATS.find((f) => f.key === key)?.label ?? key;
}

export function StudioHome({
  meId,
  designs,
  people,
}: {
  meId: string;
  designs: Design[];
  people: Person[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const owned = designs.filter((d) => d.user_id === meId);
  const sharedWithMe = designs.filter((d) => d.user_id !== meId);
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));

  function onDelete(id: string, name: string) {
    if (!window.confirm(`Delete “${name}”? This can't be undone.`)) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteDesign(id);
      router.refresh();
      setDeletingId(null);
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-espresso">Studio</h1>
        <p className="mt-1 text-espresso/60">
          Your hub for everything visual and social — design, schedule, and post.
        </p>
      </div>

      {/* ---- apps ---- */}
      <section className="mb-12">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tan">
          Apps
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AppCard
            icon="image"
            title="Social Studio"
            desc="Design posts, stories and thumbnails with templates, shapes and your brand."
            href="/studio/new"
          />
          <AppCard
            icon="calendar"
            title="Scheduler"
            desc="Plan a content calendar and queue your designs to go out automatically."
            soon
          />
          <AppCard
            icon="send"
            title="Publisher"
            desc="Post straight to Instagram, Facebook and X from your saved designs."
            soon
          />
        </div>
      </section>

      {/* ---- your designs ---- */}
      <section className="mb-12">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-tan">
            Your designs
          </h2>
          <Link
            href="/studio/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-logo px-3 py-1.5 text-sm font-semibold text-cream transition hover:bg-orange-light"
          >
            <Icon name="plus" size={16} /> New design
          </Link>
        </div>

        {owned.length === 0 ? (
          <Link
            href="/studio/new"
            className="flex flex-col items-center justify-center rounded-card border border-dashed border-tan/60 bg-white/50 p-12 text-center transition hover:border-logo"
          >
            <Icon name="plus" size={28} className="text-tan" />
            <p className="mt-2 text-espresso/60">
              No designs yet. Create your first one.
            </p>
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {owned.map((d) => (
              <DesignCard
                key={d.id}
                design={d}
                busy={pending && deletingId === d.id}
                onDelete={() => onDelete(d.id, d.name)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- shared with me ---- */}
      {sharedWithMe.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tan">
            Shared with you
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {sharedWithMe.map((d) => (
              <DesignCard
                key={d.id}
                design={d}
                sharedBy={peopleById[d.user_id]?.full_name?.split(" ")[0] ?? "a colleague"}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function AppCard({
  icon, title, desc, href, soon,
}: {
  icon: IconName; title: string; desc: string; href?: string; soon?: boolean;
}) {
  const inner = (
    <div
      className={clsx(
        "flex h-full flex-col rounded-card border p-5 transition",
        soon
          ? "border-tan/40 bg-white/40"
          : "border-tan/40 bg-white/70 hover:border-logo hover:shadow-sm",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-logo/10 text-logo">
          <Icon name={icon} size={24} />
        </span>
        <div>
          <h3 className="font-semibold text-espresso">{title}</h3>
          {soon && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-tan">
              Coming soon
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm text-espresso/60">{desc}</p>
    </div>
  );

  if (soon || !href) return <div className="opacity-75">{inner}</div>;
  return <Link href={href}>{inner}</Link>;
}

function DesignCard({
  design, onDelete, busy, sharedBy,
}: {
  design: Design;
  onDelete?: () => void;
  busy?: boolean;
  sharedBy?: string;
}) {
  return (
    <div
      className={clsx(
        "group overflow-hidden rounded-card border border-tan/40 bg-white/70 transition hover:border-logo hover:shadow-sm",
        busy && "pointer-events-none opacity-50",
      )}
    >
      <Link href={`/studio/d/${design.id}`} className="block">
        <DesignThumb design={design} />
      </Link>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <Link
            href={`/studio/d/${design.id}`}
            className="block truncate text-sm font-medium text-espresso/90 hover:text-orange-light"
          >
            {design.name}
          </Link>
          <span className="text-[11px] text-tan">
            {sharedBy ? `From ${sharedBy}` : formatLabel(design.format_key)}
          </span>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            title="Delete"
            aria-label={`Delete ${design.name}`}
            className="shrink-0 rounded p-1 text-tan opacity-0 transition hover:bg-logo/10 hover:text-orange-light group-hover:opacity-100"
          >
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
