"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Canvas as FabricCanvas, FabricObject } from "fabric";
import type { Design } from "@/lib/types";
import {
  FORMATS, PALETTE, FONTS, STICKERS, STARTERS,
  GOOGLE_FONTS_HREF, type FormatKey, type Starter,
} from "@/lib/studio/templates";
import { saveDesign, deleteDesign, shareDesign } from "@/app/studio/actions";

const MAX_W = 520;
const MAX_H = 560;
const GRID = 20; // display px

type Person = { id: string; full_name: string | null; email: string };

function displaySize(w: number, h: number) {
  const scale = Math.min(MAX_W / w, MAX_H / h);
  return { dw: Math.round(w * scale), dh: Math.round(h * scale), scale };
}

type Layer = { id: string; name: string; type: string; visible: boolean };

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function StudioEditor({
  initialDesigns,
  meId,
  people,
  initialShares,
}: {
  initialDesigns: Design[];
  meId: string;
  people: Person[];
  initialShares: { design_id: string; shared_user_id: string }[];
}) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const modRef = useRef<typeof import("fabric") | null>(null);
  const restoringRef = useRef(false);
  const snapRef = useRef(false);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  const [formatKey, setFormatKey] = useState<FormatKey>("ig-post");
  const [bgColor, setBgColor] = useState("#FBF4E8");
  const [selKind, setSelKind] = useState<"text" | "image" | "shape" | null>(null);
  const [hasShadow, setHasShadow] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [dims, setDims] = useState({ dw: 0, dh: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [snap, setSnap] = useState(false);
  const [textProps, setTextProps] = useState({
    fontFamily: "Inter", fontSize: 64, fill: "#3A1A0E",
    bold: false, align: "center" as "left" | "center" | "right",
  });

  const [designs, setDesigns] = useState<Design[]>(initialDesigns);
  const [designName, setDesignName] = useState("Untitled design");
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // design_id -> set of user ids it's shared with (owned designs only).
  const [shares, setShares] = useState<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    for (const s of initialShares) {
      (m[s.design_id] ??= []).push(s.shared_user_id);
    }
    return m;
  });
  const [shareOpen, setShareOpen] = useState<string | null>(null);

  const peopleById = useMemo(() => {
    const m: Record<string, Person> = {};
    for (const p of people) m[p.id] = p;
    return m;
  }, [people]);

  const owned = designs.filter((d) => d.user_id === meId);
  const sharedWithMe = designs.filter((d) => d.user_id !== meId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const format = FORMATS.find((f) => f.key === formatKey) ?? FORMATS[0];

  useEffect(() => { snapRef.current = snap; }, [snap]);

  /* ---------------- helpers that read/refresh the canvas ---------------- */

  const refreshLayers = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = canvas.getObjects();
    const list: Layer[] = objs.map((o) => {
      const obj = o as FabricObject & { id?: string; text?: string };
      if (!obj.id) obj.id = uid();
      let name = obj.type ?? "object";
      if (obj.type === "textbox") name = `“${(obj.text ?? "").slice(0, 14)}”`;
      else if (obj.type === "image") name = "Image / logo";
      return { id: obj.id, name, type: obj.type ?? "object", visible: obj.visible !== false };
    });
    setLayers(list.reverse()); // top layer first
  }, []);

  const snapshot = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || restoringRef.current) return;
    const json = JSON.stringify(canvas.toJSON());
    undoStack.current.push(json);
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const syncSelection = useCallback((obj: FabricObject | undefined) => {
    if (!obj) {
      setSelKind(null);
      return;
    }
    setHasShadow(Boolean(obj.shadow));
    setOpacity(Math.round((obj.opacity ?? 1) * 100));
    if (obj.type === "textbox") {
      setSelKind("text");
      const t = obj as unknown as {
        fontFamily: string; fontSize: number; fill: string;
        fontWeight: string | number; textAlign: string;
      };
      setTextProps({
        fontFamily: t.fontFamily || "Inter",
        fontSize: Math.round(t.fontSize || 64),
        fill: typeof t.fill === "string" ? t.fill : "#3A1A0E",
        bold: t.fontWeight === "bold" || t.fontWeight === 700,
        align: (t.textAlign as "left" | "center" | "right") || "center",
      });
    } else {
      setSelKind(obj.type === "image" ? "image" : "shape");
    }
  }, []);

  /* ---------------- init ---------------- */

  useEffect(() => {
    let disposed = false;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_HREF;
    document.head.appendChild(link);

    (async () => {
      const fabric = await import("fabric");
      if (disposed || !canvasElRef.current) return;
      modRef.current = fabric;
      const { dw, dh } = displaySize(format.w, format.h);
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: dw, height: dh, backgroundColor: bgColor,
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;
      setDims({ dw, dh });

      const onSel = () => syncSelection(canvas.getActiveObject() ?? undefined);
      canvas.on("selection:created", onSel);
      canvas.on("selection:updated", onSel);
      canvas.on("selection:cleared", () => setSelKind(null));
      canvas.on("object:added", () => { snapshot(); refreshLayers(); });
      canvas.on("object:modified", () => { snapshot(); refreshLayers(); });
      canvas.on("object:removed", () => { snapshot(); refreshLayers(); });
      // Snap-to-grid while dragging.
      canvas.on("object:moving", (e) => {
        if (!snapRef.current || !e.target) return;
        e.target.set({
          left: Math.round((e.target.left ?? 0) / GRID) * GRID,
          top: Math.round((e.target.top ?? 0) / GRID) * GRID,
        });
      });

      undoStack.current = [JSON.stringify(canvas.toJSON())];
    })();

    return () => {
      disposed = true;
      fabricRef.current?.dispose();
      fabricRef.current = null;
      link.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize when the format changes.
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { dw, dh } = displaySize(format.w, format.h);
    canvas.setDimensions({ width: dw, height: dh });
    setDims({ dw, dh });
    canvas.renderAll();
  }, [format.w, format.h]);

  /* ---------------- undo / redo ---------------- */

  const loadJSON = useCallback(async (json: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    restoringRef.current = true;
    await canvas.loadFromJSON(JSON.parse(json));
    canvas.renderAll();
    restoringRef.current = false;
    setBgColor((canvas.backgroundColor as string) || "#FBF4E8");
    refreshLayers();
    setSelKind(null);
  }, [refreshLayers]);

  const undo = useCallback(() => {
    if (undoStack.current.length <= 1) return;
    const current = undoStack.current.pop()!;
    redoStack.current.push(current);
    loadJSON(undoStack.current[undoStack.current.length - 1]);
  }, [loadJSON]);

  const redo = useCallback(() => {
    const state = redoStack.current.pop();
    if (!state) return;
    undoStack.current.push(state);
    loadJSON(state);
  }, [loadJSON]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault(); undo();
      } else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault(); redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const obj = fabricRef.current?.getActiveObject();
        if (obj && !(obj as unknown as { isEditing?: boolean }).isEditing) {
          e.preventDefault(); deleteSelected();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo]);

  /* ---------------- add objects ---------------- */

  function add(obj: FabricObject) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    (obj as FabricObject & { id?: string }).id = uid();
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    syncSelection(obj);
  }

  function center() {
    const canvas = fabricRef.current!;
    return { left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: "center" as const, originY: "center" as const };
  }

  function addText() {
    const fabric = modRef.current, canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    add(new fabric.Textbox("Your text", {
      ...center(), width: canvas.getWidth() * 0.7,
      fontSize: 64 * (canvas.getWidth() / format.w),
      fontFamily: "Inter", fill: "#3A1A0E", textAlign: "center",
    }));
  }

  function addSticker(emoji: string) {
    const fabric = modRef.current, canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    add(new fabric.Textbox(emoji, {
      ...center(), fontSize: 120 * (canvas.getWidth() / format.w),
      fontFamily: "Arial", textAlign: "center",
    }));
  }

  async function addLogo() {
    const fabric = modRef.current, canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    const img = await fabric.FabricImage.fromURL("/logo.png", { crossOrigin: "anonymous" });
    const target = canvas.getWidth() * 0.4;
    img.scale(target / (img.width ?? target));
    img.set(center());
    add(img);
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const fabric = modRef.current, canvas = fabricRef.current;
      if (!fabric || !canvas) return;
      const img = await fabric.FabricImage.fromURL(String(reader.result));
      const target = canvas.getWidth() * 0.6;
      img.scale(target / (img.width ?? target));
      img.set(center());
      add(img);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function addShape(kind: "rect" | "circle" | "triangle" | "line" | "star") {
    const fabric = modRef.current, canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    const s = canvas.getWidth() * 0.3;
    const common = { ...center(), fill: "#D85A30" };
    if (kind === "rect") add(new fabric.Rect({ ...common, width: s, height: s * 0.7, rx: 8, ry: 8 }));
    else if (kind === "circle") add(new fabric.Circle({ ...common, radius: s / 2 }));
    else if (kind === "triangle") add(new fabric.Triangle({ ...common, width: s, height: s }));
    else if (kind === "line") add(new fabric.Line([0, 0, s, 0], { ...center(), stroke: "#3A1A0E", strokeWidth: 6 }));
    else {
      const pts = starPoints(5, s / 2, s / 4);
      add(new fabric.Polygon(pts, { ...common }));
    }
  }

  /* ---------------- edit selected ---------------- */

  function activeObj() {
    return fabricRef.current?.getActiveObject();
  }

  function updateText(patch: Partial<typeof textProps>) {
    const next = { ...textProps, ...patch };
    setTextProps(next);
    const canvas = fabricRef.current, obj = activeObj();
    if (!canvas || !obj || obj.type !== "textbox") return;
    obj.set({
      fontFamily: next.fontFamily, fontSize: next.fontSize, fill: next.fill,
      fontWeight: next.bold ? "bold" : "normal", textAlign: next.align,
    });
    canvas.renderAll();
    snapshot();
  }

  function toggleShadow() {
    const fabric = modRef.current, canvas = fabricRef.current, obj = activeObj();
    if (!fabric || !canvas || !obj) return;
    const on = !obj.shadow;
    obj.set("shadow", on ? new fabric.Shadow({ color: "rgba(0,0,0,0.35)", blur: 22, offsetX: 0, offsetY: 10 }) : null);
    setHasShadow(on);
    canvas.renderAll();
    snapshot();
  }

  function deleteSelected() {
    const canvas = fabricRef.current, obj = activeObj();
    if (!canvas || !obj) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
    setSelKind(null);
  }

  /* ---------------- layers ---------------- */

  function findById(id: string) {
    return fabricRef.current?.getObjects().find(
      (o) => (o as FabricObject & { id?: string }).id === id,
    );
  }
  function selectLayer(id: string) {
    const canvas = fabricRef.current, obj = findById(id);
    if (!canvas || !obj) return;
    canvas.setActiveObject(obj);
    canvas.renderAll();
    syncSelection(obj);
  }
  function toggleVisible(id: string) {
    const canvas = fabricRef.current, obj = findById(id);
    if (!canvas || !obj) return;
    obj.visible = obj.visible === false;
    canvas.renderAll();
    refreshLayers();
  }

  function onLayersReorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldI = layers.findIndex((l) => l.id === active.id);
    const newI = layers.findIndex((l) => l.id === over.id);
    if (oldI === -1 || newI === -1) return;
    const next = arrayMove(layers, oldI, newI);
    setLayers(next);
    const canvas = fabricRef.current;
    if (!canvas) return;
    // Layers list is top-first; canvas stack is bottom-first.
    [...next].reverse().forEach((l, idx) => {
      const o = findById(l.id);
      if (o) canvas.moveObjectTo(o, idx);
    });
    canvas.renderAll();
    snapshot();
  }

  /* ---------------- opacity & duplicate ---------------- */

  function setObjOpacity(v: number) {
    setOpacity(v);
    const canvas = fabricRef.current, obj = activeObj();
    if (!canvas || !obj) return;
    obj.set("opacity", v / 100);
    canvas.renderAll();
  }

  async function duplicateSelected() {
    const canvas = fabricRef.current, obj = activeObj();
    if (!canvas || !obj) return;
    const cloned = await obj.clone();
    cloned.set({ left: (obj.left ?? 0) + 24, top: (obj.top ?? 0) + 24 });
    add(cloned);
  }

  /* ---------------- sharing ---------------- */

  function toggleShareUser(designId: string, userId: string) {
    const cur = new Set(shares[designId] ?? []);
    if (cur.has(userId)) cur.delete(userId);
    else cur.add(userId);
    const ids = Array.from(cur);
    setShares((prev) => ({ ...prev, [designId]: ids }));
    shareDesign(designId, ids); // persist in the background
  }

  /* ---------------- starters & background ---------------- */

  function setBackground(color: string) {
    setBgColor(color);
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.backgroundColor = color;
    canvas.renderAll();
    snapshot();
  }

  async function applyStarter(starter: Starter) {
    const fabric = modRef.current;
    let canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    setFormatKey(starter.format);
    const fmt = FORMATS.find((f) => f.key === starter.format)!;
    const { dw, dh } = displaySize(fmt.w, fmt.h);
    canvas.setDimensions({ width: dw, height: dh });

    restoringRef.current = true;
    canvas.remove(...canvas.getObjects());
    canvas.backgroundColor = starter.bg;
    setBgColor(starter.bg);
    const W = dw, H = dh;

    const withId = (o: FabricObject) => {
      (o as FabricObject & { id?: string }).id = uid();
      return o;
    };
    for (const el of starter.els) {
      if (el.t === "rect") {
        canvas.add(withId(new fabric.Rect({
          left: el.x * W, top: el.y * H, originX: "center", originY: "center",
          width: el.w * W, height: el.h * W, fill: el.fill, rx: el.rx, ry: el.rx,
          opacity: el.opacity ?? 1,
          stroke: el.stroke, strokeWidth: el.dashed ? 3 : 0,
          strokeDashArray: el.dashed ? [12, 10] : undefined,
        })));
      } else if (el.t === "circle") {
        canvas.add(withId(new fabric.Circle({
          left: el.x * W, top: el.y * H, originX: "center", originY: "center",
          radius: el.r * W, fill: el.fill,
        })));
      } else if (el.t === "text") {
        canvas.add(withId(new fabric.Textbox(el.text, {
          left: el.x * W, top: el.y * H, originX: "center", originY: "center",
          width: (el.w ?? 0.8) * W, fontSize: el.size * W, fontFamily: el.font,
          fill: el.fill, textAlign: el.align ?? "center",
          fontWeight: el.bold ? "bold" : "normal",
        })));
      } else if (el.t === "logo") {
        const img = await fabric.FabricImage.fromURL("/logo.png", { crossOrigin: "anonymous" });
        img.scale((el.w * W) / (img.width ?? el.w * W));
        img.set({ left: el.x * W, top: el.y * H, originX: "center", originY: "center" });
        canvas.add(withId(img));
      }
    }
    canvas.renderAll();
    restoringRef.current = false;
    snapshot();
    refreshLayers();
    setCurrentId(undefined);
    setDesignName(starter.label);
  }

  /* ---------------- saved designs ---------------- */

  async function doSave() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const saved = await saveDesign({
        id: currentId, name: designName, formatKey,
        data: canvas.toJSON(),
      });
      setCurrentId(saved.id);
      setDesigns((prev) => {
        const without = prev.filter((d) => d.id !== saved.id);
        return [saved, ...without];
      });
    } finally {
      setBusy(false);
    }
  }

  async function openDesign(d: Design) {
    setFormatKey(d.format_key as FormatKey);
    const fmt = FORMATS.find((f) => f.key === d.format_key) ?? FORMATS[0];
    const { dw, dh } = displaySize(fmt.w, fmt.h);
    fabricRef.current?.setDimensions({ width: dw, height: dh });
    await loadJSON(JSON.stringify(d.data));
    undoStack.current = [JSON.stringify(d.data)];
    redoStack.current = [];
    setCurrentId(d.id);
    setDesignName(d.name);
  }

  async function removeDesign(id: string) {
    await deleteDesign(id);
    setDesigns((prev) => prev.filter((d) => d.id !== id));
    if (currentId === id) setCurrentId(undefined);
  }

  function newDesign() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    restoringRef.current = true;
    canvas.remove(...canvas.getObjects());
    canvas.backgroundColor = "#FBF4E8";
    canvas.renderAll();
    restoringRef.current = false;
    setBgColor("#FBF4E8");
    setCurrentId(undefined);
    setDesignName("Untitled design");
    undoStack.current = [JSON.stringify(canvas.toJSON())];
    redoStack.current = [];
    refreshLayers();
  }

  async function download() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (document.fonts?.ready) await document.fonts.ready;
    const { scale } = displaySize(format.w, format.h);
    const a = document.createElement("a");
    a.href = canvas.toDataURL({ format: "png", multiplier: 1 / scale });
    a.download = `${designName.replace(/\s+/g, "-").toLowerCase()}-${format.key}.png`;
    a.click();
  }

  /* ============================ UI ============================ */

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ---- left controls ---- */}
      <aside className="w-full shrink-0 space-y-6 lg:w-72">
        <div className="flex gap-2">
          <button onClick={undo} className="flex-1 rounded-lg border border-tan/50 px-3 py-2 text-sm font-medium text-espresso/70 hover:bg-tan/10">↶ Undo</button>
          <button onClick={redo} className="flex-1 rounded-lg border border-tan/50 px-3 py-2 text-sm font-medium text-espresso/70 hover:bg-tan/10">↷ Redo</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGrid((v) => !v)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${showGrid ? "border-logo bg-logo/10 text-orange-light" : "border-tan/50 text-espresso/70 hover:bg-tan/10"}`}>
            ▦ Grid
          </button>
          <button onClick={() => setSnap((v) => !v)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${snap ? "border-logo bg-logo/10 text-orange-light" : "border-tan/50 text-espresso/70 hover:bg-tan/10"}`}>
            ⌖ Snap
          </button>
        </div>

        <Section title="Start from a template">
          <div className="grid grid-cols-2 gap-2">
            {STARTERS.map((s) => (
              <button key={s.key} onClick={() => applyStarter(s)}
                className="rounded-lg border border-tan/50 px-2.5 py-2 text-xs font-medium text-espresso/80 hover:border-logo hover:bg-logo/5">
                {s.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Format">
          <select value={formatKey} onChange={(e) => setFormatKey(e.target.value as FormatKey)}
            className="w-full rounded-lg border border-tan/50 bg-white px-2.5 py-2 text-sm text-espresso focus:border-logo focus:outline-none">
            {FORMATS.map((f) => (
              <option key={f.key} value={f.key}>{f.label} — {f.w}×{f.h}</option>
            ))}
          </select>
        </Section>

        <Section title="Background">
          <Swatches value={bgColor} onPick={setBackground} />
          <ColorInput value={bgColor} onChange={setBackground} />
        </Section>

        <Section title="Add">
          <div className="grid grid-cols-2 gap-2">
            <ToolButton onClick={addText}>＋ Text</ToolButton>
            <ToolButton onClick={addLogo}>＋ Logo</ToolButton>
            <ToolButton onClick={() => addShape("rect")} variant="ghost">▭ Rect</ToolButton>
            <ToolButton onClick={() => addShape("circle")} variant="ghost">◯ Circle</ToolButton>
            <ToolButton onClick={() => addShape("triangle")} variant="ghost">△ Tri</ToolButton>
            <ToolButton onClick={() => addShape("star")} variant="ghost">★ Star</ToolButton>
            <ToolButton onClick={() => addShape("line")} variant="ghost">— Line</ToolButton>
            <label className="cursor-pointer rounded-lg border border-tan/50 px-3 py-2 text-center text-sm font-semibold text-espresso/70 hover:bg-tan/10">
              ＋ Image
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {STICKERS.map((s) => (
              <button key={s} onClick={() => addSticker(s)} className="rounded-md px-1.5 py-1 text-lg hover:bg-tan/10">{s}</button>
            ))}
          </div>
        </Section>

        {selKind && (
          <Section title="Selected">
            {selKind === "text" && (
              <div className="space-y-3">
                <select value={textProps.fontFamily} onChange={(e) => updateText({ fontFamily: e.target.value })}
                  className="w-full rounded-lg border border-tan/50 bg-white px-2.5 py-2 text-sm text-espresso focus:border-logo focus:outline-none">
                  {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
                <label className="block text-xs font-medium text-espresso/70">
                  Size — {textProps.fontSize}px
                  <input type="range" min={12} max={400} value={textProps.fontSize}
                    onChange={(e) => updateText({ fontSize: Number(e.target.value) })}
                    className="mt-1 w-full accent-logo" />
                </label>
                <div className="flex gap-1">
                  {(["left", "center", "right"] as const).map((a) => (
                    <button key={a} onClick={() => updateText({ align: a })}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${textProps.align === a ? "border-logo bg-logo/10 text-orange-light" : "border-tan/50 text-espresso/70 hover:bg-tan/10"}`}>
                      {a === "left" ? "⬅" : a === "center" ? "⬌" : "➡"}
                    </button>
                  ))}
                  <button onClick={() => updateText({ bold: !textProps.bold })}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold ${textProps.bold ? "border-logo bg-logo/10 text-orange-light" : "border-tan/50 text-espresso/70 hover:bg-tan/10"}`}>B</button>
                </div>
                <Swatches value={textProps.fill} onPick={(c) => updateText({ fill: c })} />
                <ColorInput value={textProps.fill} onChange={(c) => updateText({ fill: c })} />
              </div>
            )}
            {selKind === "shape" && (
              <ShapeFill onPick={(c) => { const o = activeObj(); o?.set("fill", c); fabricRef.current?.renderAll(); snapshot(); }} />
            )}
            <label className="mt-3 block text-xs font-medium text-espresso/70">
              Opacity — {opacity}%
              <input type="range" min={10} max={100} value={opacity}
                onChange={(e) => setObjOpacity(Number(e.target.value))}
                className="mt-1 w-full accent-logo" />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <ToolButton onClick={toggleShadow} variant={hasShadow ? "dark" : "ghost"}>Shadow</ToolButton>
              <ToolButton onClick={duplicateSelected} variant="ghost">Duplicate</ToolButton>
              <button onClick={deleteSelected}
                className="rounded-lg border border-logo/40 px-3 py-2 text-sm font-semibold text-orange-light hover:bg-logo/10">Delete</button>
            </div>
          </Section>
        )}

        {layers.length > 0 && (
          <Section title="Layers">
            <p className="mb-1.5 text-[11px] text-tan">Drag to reorder</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLayersReorder}>
              <SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1">
                  {layers.map((l) => (
                    <LayerRow key={l.id} layer={l}
                      onSelect={() => selectLayer(l.id)}
                      onToggle={() => toggleVisible(l.id)} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </Section>
        )}
      </aside>

      {/* ---- canvas + save bar ---- */}
      <div className="flex flex-1 flex-col items-center gap-4">
        <div className="flex w-full max-w-xl flex-wrap items-center gap-2">
          <input value={designName} onChange={(e) => setDesignName(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-tan/50 bg-white px-3 py-2 text-sm text-espresso focus:border-logo focus:outline-none" />
          <button onClick={doSave} disabled={busy}
            className="rounded-lg bg-espresso px-3.5 py-2 text-sm font-semibold text-cream hover:bg-espresso/90 disabled:opacity-60">
            {busy ? "Saving…" : currentId ? "Save" : "Save new"}
          </button>
          <button onClick={newDesign} className="rounded-lg border border-tan/50 px-3.5 py-2 text-sm font-semibold text-espresso/70 hover:bg-tan/10">New</button>
          <button onClick={download} className="rounded-lg bg-logo px-3.5 py-2 text-sm font-bold text-cream hover:bg-orange-light">⬇ PNG</button>
        </div>

        <div className="inline-block rounded-card bg-white p-4 shadow-md ring-1 ring-tan/30">
          <div className="relative" style={{ width: dims.dw, height: dims.dh }}>
            <canvas ref={canvasElRef} />
            {showGrid && (
              <div className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(140,140,140,.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(140,140,140,.4) 1px, transparent 1px)",
                  backgroundSize: `${GRID}px ${GRID}px`,
                }} />
            )}
          </div>
          <p className="mt-3 text-center text-xs text-tan">
            Click to select • drag to move • corners to resize • double-click text to edit • Ctrl+Z / Ctrl+Shift+Z
          </p>
        </div>

        {owned.length > 0 && (
          <div className="w-full max-w-xl">
            <h3 className="mb-2 text-sm font-semibold text-espresso">My saved designs</h3>
            <ul className="divide-y divide-tan/20 rounded-card border border-tan/30 bg-white/60">
              {owned.map((d) => (
                <li key={d.id}>
                  <div className="flex items-center gap-3 px-3 py-2 text-sm">
                    <button onClick={() => openDesign(d)} className="flex-1 truncate text-left font-medium text-espresso hover:text-orange-light">{d.name}</button>
                    <span className="text-xs text-tan">{d.format_key}</span>
                    <button onClick={() => setShareOpen(shareOpen === d.id ? null : d.id)}
                      className="text-xs font-semibold text-espresso/70 hover:underline">
                      Share{shares[d.id]?.length ? ` (${shares[d.id].length})` : ""}
                    </button>
                    <button onClick={() => removeDesign(d.id)} className="text-xs font-semibold text-orange-light hover:underline">Delete</button>
                  </div>
                  {shareOpen === d.id && (
                    <div className="border-t border-tan/20 bg-cream/40 px-3 py-2">
                      {people.length === 0 ? (
                        <p className="text-xs text-tan">No colleagues to share with yet.</p>
                      ) : (
                        <ul className="max-h-40 space-y-1 overflow-auto">
                          {people.map((p) => (
                            <li key={p.id}>
                              <label className="flex items-center gap-2 text-xs text-espresso/80">
                                <input type="checkbox" className="accent-logo"
                                  checked={(shares[d.id] ?? []).includes(p.id)}
                                  onChange={() => toggleShareUser(d.id, p.id)} />
                                {p.full_name || p.email}
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sharedWithMe.length > 0 && (
          <div className="w-full max-w-xl">
            <h3 className="mb-2 text-sm font-semibold text-espresso">Shared with me</h3>
            <ul className="divide-y divide-tan/20 rounded-card border border-tan/30 bg-white/60">
              {sharedWithMe.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <button onClick={() => openDesign(d)} className="flex-1 truncate text-left font-medium text-espresso hover:text-orange-light">{d.name}</button>
                  <span className="text-xs text-tan">by {peopleById[d.user_id]?.full_name || peopleById[d.user_id]?.email || "teammate"}</span>
                  <span className="text-xs text-tan">{d.format_key}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function starPoints(spikes: number, outer: number, inner: number) {
  const pts: { x: number; y: number }[] = [];
  const step = Math.PI / spikes;
  let rot = -Math.PI / 2;
  for (let i = 0; i < spikes; i++) {
    pts.push({ x: Math.cos(rot) * outer, y: Math.sin(rot) * outer }); rot += step;
    pts.push({ x: Math.cos(rot) * inner, y: Math.sin(rot) * inner }); rot += step;
  }
  return pts;
}

function LayerRow({
  layer, onSelect, onToggle,
}: {
  layer: Layer; onSelect: () => void; onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: layer.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <li ref={setNodeRef} style={style}
      className={`flex items-center gap-1 rounded-lg border bg-white/70 px-1.5 py-1.5 text-xs ${isDragging ? "border-logo/60 shadow" : "border-tan/30"}`}>
      <span {...attributes} {...listeners}
        className="cursor-grab touch-none px-1 text-tan active:cursor-grabbing" title="Drag to reorder">⠿</span>
      <button onClick={onSelect} className="flex-1 truncate text-left text-espresso/80">{layer.name}</button>
      <button onClick={onToggle} title="Show/hide" className="px-1 text-espresso/50 hover:text-espresso">{layer.visible ? "👁" : "🚫"}</button>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-espresso">{title}</h3>
      {children}
    </div>
  );
}

function ToolButton({ children, onClick, variant = "dark" }: {
  children: React.ReactNode; onClick: () => void; variant?: "dark" | "ghost";
}) {
  return (
    <button onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${variant === "dark" ? "bg-espresso text-cream hover:bg-espresso/90" : "border border-tan/50 text-espresso/70 hover:bg-tan/10"}`}>
      {children}
    </button>
  );
}

function Swatches({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {PALETTE.map((c) => (
        <button key={c} onClick={() => onPick(c)} aria-label={`Use ${c}`}
          className={`h-7 w-7 rounded-md border transition ${value.toLowerCase() === c.toLowerCase() ? "border-espresso ring-2 ring-espresso/30" : "border-tan/40"}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

function ShapeFill({ onPick }: { onPick: (c: string) => void }) {
  return (
    <div>
      <span className="text-xs font-medium text-espresso/70">Fill color</span>
      <Swatches value="" onPick={onPick} />
      <ColorInput value="#D85A30" onChange={onPick} />
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
      className="mt-2 h-8 w-full cursor-pointer rounded-md border border-tan/40 bg-white" aria-label="Custom color" />
  );
}
