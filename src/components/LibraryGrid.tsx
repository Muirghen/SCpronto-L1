"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
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
  const [, startTransition] = useTransition();

  // A short drag threshold so a normal click still opens the app.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
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

  return (
    <DndContext
      id="library-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((a) => a.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((app) => (
            <SortableCard key={app.id} app={app} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableCard({ app }: { app: AppTile }) {
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
    zIndex: isDragging ? 50 : undefined,
  };

  const href =
    app.kind === "link" && app.url ? app.url : `/tools/${app.id}`;
  const external = app.kind === "link" && !!app.url;

  return (
    <a
      ref={setNodeRef}
      style={style}
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...attributes}
      {...listeners}
      className={`group flex h-full cursor-grab touch-none select-none flex-col rounded-card border bg-white/80 p-5 transition active:cursor-grabbing ${
        isDragging
          ? "border-logo/60 shadow-xl"
          : "border-tan/40 hover:-translate-y-0.5 hover:border-logo/60 hover:shadow-md"
      }`}
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
      <span className="mt-auto pt-4 text-sm font-semibold text-orange-light">
        {app.kind === "embedded" ? "Open tool" : "Open"} →
      </span>
    </a>
  );
}
