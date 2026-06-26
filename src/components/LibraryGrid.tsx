"use client";

import { useRef, useState, useTransition } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AppTile } from "@/lib/types";
import { AppIcon } from "@/components/AppIcon";
import { reorderLibrary } from "@/app/apps/actions";

export function LibraryGrid({ apps }: { apps: AppTile[] }) {
  const [items, setItems] = useState(apps);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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
    // A drag happened — swallow the click the browser fires on pointer-up.
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 300);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((a) => a.id === active.id);
    const newIndex = items.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    // Persist the new order in the background.
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

  return (
    <DndContext
      id="library-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={items.map((a) => a.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((app) => (
            <SortableCard key={app.id} app={app} onCardClick={onCardClick} />
          ))}
        </div>
      </SortableContext>

      {/* The lifted card follows the cursor while dragging. */}
      <DragOverlay>
        {activeApp ? <CardFace app={activeApp} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableCard({
  app,
  onCardClick,
}: {
  app: AppTile;
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

  // While this card is the one being dragged, leave a dashed drop slot behind.
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-[112px] rounded-card border-2 border-dashed border-logo/40 bg-logo/5"
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
      <CardFace app={app} />
    </a>
  );
}

// Presentational tile face — shared by the grid item and the drag overlay.
function CardFace({ app, dragging }: { app: AppTile; dragging?: boolean }) {
  return (
    <div
      title={app.description ?? app.name}
      className={`flex h-full min-h-[112px] flex-col items-center justify-center gap-2 rounded-card border bg-white/85 p-3 text-center transition ${
        dragging
          ? "cursor-grabbing border-logo/60 shadow-xl"
          : "border-tan/40 hover:border-logo/60 hover:shadow-md"
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cream text-xl">
        <AppIcon app={app} imgClassName="h-6 w-6 object-contain" />
      </div>
      <span className="w-full truncate text-sm font-semibold text-espresso">
        {app.name}
      </span>
    </div>
  );
}
