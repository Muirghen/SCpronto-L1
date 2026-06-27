"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AppTile } from "@/lib/types";
import { AppIcon } from "@/components/AppIcon";
import { SearchBar } from "@/components/SearchBar";
import { reorderLibrary } from "@/app/apps/actions";

type Layout = "grid" | "list";

export function LibraryGrid({ apps }: { apps: AppTile[] }) {
  const [items, setItems] = useState(apps);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<Layout>("grid");
  const [, startTransition] = useTransition();

  // Default to the vertical list on portrait (tall) monitors.
  useEffect(() => {
    if (window.matchMedia("(orientation: portrait)").matches) setLayout("list");
  }, []);

  const q = query.trim().toLowerCase();
  const visible = q
    ? items.filter((a) =>
        `${a.name} ${a.description ?? ""}`.toLowerCase().includes(q),
      )
    : items;

  // Set when a drag just finished so the click that follows pointer-up doesn't
  // open the app. Cleared once consumed (or after a short timeout as a guard).
  const suppressClickRef = useRef(false);

  // A short drag threshold so a normal click still opens the app.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    suppressClickRef.current = false;
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 300);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((a) => a.id === active.id);
    const newIndex = items.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(() => {
      reorderLibrary(next.map((a) => a.id));
    });
  }

  function onCardClick(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      e.preventDefault();
      suppressClickRef.current = false;
    }
  }

  const activeApp = items.find((a) => a.id === activeId) ?? null;
  const list = layout === "list";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="min-w-0 max-w-md flex-1">
          <SearchBar value={query} onChange={setQuery} placeholder="Search your library…" />
        </div>
        <LayoutToggle value={layout} onChange={setLayout} />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-card border border-dashed border-tan/60 bg-white/50 p-8 text-center text-espresso/60">
          {q ? `No apps match “${query.trim()}”.` : "Your library is empty."}
        </p>
      ) : (
        <DndContext
          id="library-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={visible.map((a) => a.id)}
            strategy={list ? verticalListSortingStrategy : rectSortingStrategy}
          >
            <div
              className={
                list
                  ? "flex flex-col gap-3"
                  : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              }
            >
              {visible.map((app) => (
                <SortableCard key={app.id} app={app} list={list} onCardClick={onCardClick} />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeApp ? <CardFace app={activeApp} list={list} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function LayoutToggle({ value, onChange }: { value: Layout; onChange: (l: Layout) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-tan/40 bg-white/70 p-0.5">
      {(["grid", "list"] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          aria-label={`${l} view`}
          aria-pressed={value === l}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
            value === l ? "bg-espresso text-cream" : "text-espresso/60 hover:bg-tan/15"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {l === "grid" ? (
              <>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </>
            ) : (
              <>
                <path d="M8 6h13M8 12h13M8 18h13" />
                <path d="M3 6h.01M3 12h.01M3 18h.01" />
              </>
            )}
          </svg>
        </button>
      ))}
    </div>
  );
}

function SortableCard({
  app,
  list,
  onCardClick,
}: {
  app: AppTile;
  list: boolean;
  onCardClick: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-card border-2 border-dashed border-logo/40 bg-logo/5 ${
          list ? "min-h-[72px]" : "min-h-[150px]"
        }`}
      />
    );
  }

  const href = app.kind === "link" && app.url ? app.url : `/tools/${app.id}`;
  const external = app.kind === "link" && !!app.url;

  return (
    <a
      ref={setNodeRef}
      style={style}
      href={href}
      onClick={onCardClick}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...attributes}
      {...listeners}
      className="block cursor-grab touch-none select-none transition active:cursor-grabbing hover:-translate-y-0.5"
    >
      <CardFace app={app} list={list} />
    </a>
  );
}

// Presentational tile face — shared by the grid item and the drag overlay.
function CardFace({
  app,
  list,
  dragging,
}: {
  app: AppTile;
  list?: boolean;
  dragging?: boolean;
}) {
  const shell = `rounded-card border bg-white/85 transition ${
    dragging
      ? "cursor-grabbing border-logo/60 shadow-xl"
      : "animate-fade-in border-tan/40 hover:-translate-y-0.5 hover:border-logo/60 hover:shadow-md"
  }`;

  if (list) {
    return (
      <div className={`flex items-center gap-4 p-3.5 ${shell}`}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream text-xl">
          <AppIcon app={app} imgClassName="h-6 w-6 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-base font-semibold text-espresso">{app.name}</h3>
          {app.description && (
            <p className="truncate text-sm text-espresso/60">{app.description}</p>
          )}
        </div>
        <span className="shrink-0 text-sm font-semibold text-orange-light">Open →</span>
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-[150px] flex-col p-4 ${shell}`}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-cream text-xl">
        <AppIcon app={app} imgClassName="h-6 w-6 object-contain" />
      </div>
      <h3 className="font-serif text-base font-semibold text-espresso">{app.name}</h3>
      {app.description && (
        <p className="mt-1 line-clamp-2 text-sm text-espresso/60">{app.description}</p>
      )}
    </div>
  );
}
