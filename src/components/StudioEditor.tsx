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
import Link from "next/link";
import type { Canvas as FabricCanvas, FabricObject, TPointerEventInfo } from "fabric";
import { Logo } from "@/components/Logo";
import { Icon, type IconName } from "@/components/studio/Icon";
import type { Design } from "@/lib/types";
import {
  FORMATS, PALETTE, FONTS, STICKERS, STARTERS,
  GOOGLE_FONTS_HREF, type FormatKey, type Starter,
} from "@/lib/studio/templates";
import { saveDesign, deleteDesign, shareDesign, uploadDesignImage } from "@/app/studio/actions";

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
  openId,
}: {
  initialDesigns: Design[];
  meId: string;
  people: Person[];
  initialShares: { design_id: string; shared_user_id: string }[];
  openId?: string;
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
  // Active bottom-bar tool: select (pointer) or text (drag to draw a box).
  const [tool, setTool] = useState<"select" | "text">("select");
  // Which detachable left-rail panels are currently open (Layers is separate
  // and always visible). Open panels stack so they never overlap.
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
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
  // True once Fabric has finished initializing the canvas.
  const [ready, setReady] = useState(false);
  const openedRef = useRef(false);
  // True while an image upload is in flight (bottom-bar button feedback).
  const [uploadingImg, setUploadingImg] = useState(false);

  // design_id -> set of user ids it's shared with (owned designs only).
  const [shares, setShares] = useState<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    for (const s of initialShares) {
      (m[s.design_id] ??= []).push(s.shared_user_id);
    }
    return m;
  });
  const [shareOpen, setShareOpen] = useState<string | null>(null);

  // Custom colors the user adds via the “+” swatch, kept across sessions.
  const [customColors, setCustomColors] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("scpronto-studio-colors");
      if (raw) setCustomColors(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  function addCustomColor(c: string) {
    setCustomColors((prev) => {
      if (prev.includes(c) || PALETTE.includes(c.toUpperCase())) return prev;
      const next = [...prev, c].slice(-14);
      try { localStorage.setItem("scpronto-studio-colors", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

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

  // Pan/zoom of the workspace (CSS transform on the artboard wrapper).
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => { snapRef.current = snap; }, [snap]);

  function togglePanel(key: string) {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  }
  function closePanel(key: string) {
    setOpenPanels((prev) => ({ ...prev, [key]: false }));
  }

  // Pop the Properties panel open automatically when something is selected.
  useEffect(() => {
    if (selKind) setOpenPanels((prev) => (prev.properties ? prev : { ...prev, properties: true }));
  }, [selKind]);

  // Middle-mouse drag pans the view.
  function onWorkspaceMouseDown(e: React.MouseEvent) {
    if (e.button !== 1) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    const move = (ev: MouseEvent) =>
      setView((v) => ({ ...v, x: start.vx + (ev.clientX - start.x), y: start.vy + (ev.clientY - start.y) }));
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function resetView() { setView({ x: 0, y: 0, scale: 1 }); }

  // Ctrl/Cmd + wheel zooms toward the cursor.
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      setView((v) => {
        const scale = Math.min(5, Math.max(0.15, v.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Text tool: drag on the canvas to draw the text box, then start editing.
  // While active the pointer is a crosshair and clicks don't select objects.
  useEffect(() => {
    const canvas = fabricRef.current;
    const fabric = modRef.current;
    if (!canvas || !fabric) return;

    if (tool !== "text") {
      canvas.skipTargetFind = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
      return;
    }

    canvas.skipTargetFind = true;
    canvas.selection = false;
    canvas.defaultCursor = "crosshair";
    canvas.discardActiveObject();
    canvas.renderAll();

    let start: { x: number; y: number } | null = null;
    let preview: FabricObject | null = null;

    const point = (opt: TPointerEventInfo) =>
      canvas.getScenePoint(opt.e) ?? canvas.getViewportPoint(opt.e);

    const down = (opt: TPointerEventInfo) => {
      start = point(opt);
      preview = new fabric.Rect({
        left: start.x, top: start.y, width: 1, height: 1,
        fill: "rgba(216,90,48,0.06)", stroke: "#D85A30",
        strokeWidth: 1, strokeDashArray: [6, 4],
        selectable: false, evented: false,
      });
      restoringRef.current = true; // don't snapshot the throwaway preview
      canvas.add(preview);
    };
    const move = (opt: TPointerEventInfo) => {
      if (!start || !preview) return;
      const p = point(opt);
      preview.set({
        left: Math.min(p.x, start.x), top: Math.min(p.y, start.y),
        width: Math.abs(p.x - start.x), height: Math.abs(p.y - start.y),
      });
      canvas.renderAll();
    };
    const up = (opt: TPointerEventInfo) => {
      if (!start) return;
      const p = point(opt);
      if (preview) { canvas.remove(preview); preview = null; }
      restoringRef.current = false;
      const drawn = Math.abs(p.x - start.x);
      const width = drawn < 24 ? canvas.getWidth() * 0.5 : drawn;
      const left = drawn < 24 ? start.x : Math.min(p.x, start.x);
      const top = Math.min(p.y, start.y);
      const tb = new fabric.Textbox("Your text", {
        left, top, width,
        fontSize: 40 * (canvas.getWidth() / format.w),
        fontFamily: "Inter", fill: "#3A1A0E", textAlign: "left",
      });
      (tb as FabricObject & { id?: string }).id = uid();
      canvas.skipTargetFind = false;
      canvas.selection = true;
      canvas.add(tb);
      canvas.setActiveObject(tb);
      (tb as unknown as { enterEditing?: () => void }).enterEditing?.();
      (tb as unknown as { selectAll?: () => void }).selectAll?.();
      canvas.renderAll();
      syncSelection(tb);
      start = null;
      setTool("select");
    };

    canvas.on("mouse:down", down);
    canvas.on("mouse:move", move);
    canvas.on("mouse:up", up);
    return () => {
      canvas.off("mouse:down", down);
      canvas.off("mouse:move", move);
      canvas.off("mouse:up", up);
      if (preview) { canvas.remove(preview); restoringRef.current = false; }
      canvas.skipTargetFind = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, format.w]);

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
      setReady(true);
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

  // When deep-linked to a specific design (/studio/d/[id]), open it once the
  // canvas is ready.
  useEffect(() => {
    if (!ready || !openId || openedRef.current) return;
    const d = initialDesigns.find((x) => x.id === openId);
    if (d) {
      openedRef.current = true;
      openDesign(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, openId]);

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
      } else if (!mod && e.key.toLowerCase() === "v") {
        setTool("select");
      } else if (!mod && e.key.toLowerCase() === "t") {
        setTool("text");
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

  // Upload the picked file to Supabase Storage, then drop the image (by URL)
  // onto the canvas. Keeps design JSON small — no base64 blobs.
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setTool("select");
    setUploadingImg(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { url } = await uploadDesignImage(form);
      const fabric = modRef.current, canvas = fabricRef.current;
      if (!fabric || !canvas) return;
      const img = await fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      const target = canvas.getWidth() * 0.6;
      img.scale(target / (img.width ?? target));
      img.set(center());
      add(img);
    } catch (err) {
      console.error(err);
      window.alert(err instanceof Error ? err.message : "Couldn't upload the image.");
    } finally {
      setUploadingImg(false);
    }
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

  // Detachable left-rail panels (Layers lives on the right, always open).
  const panels: { key: string; title: string; icon: IconName; body: React.ReactNode }[] = [
    {
      key: "templates", title: "Templates", icon: "templates",
      body: (
        <div className="grid grid-cols-2 gap-1.5 p-3">
          {STARTERS.map((s) => (
            <button key={s.key} onClick={() => applyStarter(s)}
              className="rounded border border-tan/40 px-1.5 py-1.5 text-[11px] font-medium text-espresso/80 transition hover:border-logo hover:bg-logo/5">
              {s.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      key: "elements", title: "Elements", icon: "plus",
      body: (
        <div className="space-y-2 p-3">
          <div className="grid grid-cols-3 gap-1.5">
            <ToolButton onClick={addText}><Icon name="text" size={15} /> Text</ToolButton>
            <ToolButton onClick={addLogo}><Logo size={15} /> Logo</ToolButton>
            <label className="flex cursor-pointer items-center justify-center gap-1 rounded-lg bg-espresso px-2 py-1.5 text-xs font-semibold text-cream transition hover:bg-espresso/90">
              <Icon name="image" size={15} /> Img
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {(["rect", "circle", "triangle", "star", "line"] as const).map((kind) => (
              <button key={kind} title={`Add ${kind}`} onClick={() => addShape(kind)}
                className="flex items-center justify-center rounded border border-tan/50 py-2 text-espresso/70 transition hover:border-logo hover:bg-logo/5">
                <Icon name={kind} size={18} />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-0.5">
            {STICKERS.map((s) => (
              <button key={s} onClick={() => addSticker(s)} className="rounded px-1 py-0.5 text-lg transition hover:scale-110 hover:bg-tan/10">{s}</button>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "properties", title: "Properties", icon: "sliders",
      body: !selKind ? (
        <p className="px-3 py-3 text-[11px] text-tan">Select an element to edit its properties.</p>
      ) : (
        <div className="p-3">
          {selKind === "text" && (
            <div className="space-y-2.5">
              <select value={textProps.fontFamily} onChange={(e) => updateText({ fontFamily: e.target.value })}
                className="w-full rounded border border-tan/50 bg-white px-2 py-1.5 text-xs text-espresso focus:border-logo focus:outline-none">
                {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
              <label className="block text-[11px] font-medium text-espresso/70">
                Size — {textProps.fontSize}px
                <input type="range" min={12} max={400} value={textProps.fontSize}
                  onChange={(e) => updateText({ fontSize: Number(e.target.value) })}
                  className="mt-1 w-full accent-logo" />
              </label>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((a) => (
                  <button key={a} onClick={() => updateText({ align: a })}
                    className={`flex flex-1 items-center justify-center rounded border px-2 py-1.5 ${textProps.align === a ? "border-logo bg-logo/10 text-orange-light" : "border-tan/50 text-espresso/70 hover:bg-tan/10"}`}>
                    <Icon name={a === "left" ? "alignLeft" : a === "center" ? "alignCenter" : "alignRight"} size={16} />
                  </button>
                ))}
                <button onClick={() => updateText({ bold: !textProps.bold })}
                  className={`flex flex-1 items-center justify-center rounded border px-2 py-1.5 ${textProps.bold ? "border-logo bg-logo/10 text-orange-light" : "border-tan/50 text-espresso/70 hover:bg-tan/10"}`}>
                  <Icon name="bold" size={16} />
                </button>
              </div>
              <Swatches value={textProps.fill} onPick={(c) => updateText({ fill: c })} extra={customColors} onAdd={addCustomColor} />
            </div>
          )}
          {selKind === "shape" && (
            <ShapeFill extra={customColors} onAdd={addCustomColor}
              onPick={(c) => { const o = activeObj(); o?.set("fill", c); fabricRef.current?.renderAll(); snapshot(); }} />
          )}
          <label className="mt-2.5 block text-[11px] font-medium text-espresso/70">
            Opacity — {opacity}%
            <input type="range" min={10} max={100} value={opacity}
              onChange={(e) => setObjOpacity(Number(e.target.value))}
              className="mt-1 w-full accent-logo" />
          </label>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <ToolButton onClick={toggleShadow} variant={hasShadow ? "dark" : "ghost"}><Icon name="shadow" size={15} /> Shadow</ToolButton>
            <ToolButton onClick={duplicateSelected} variant="ghost"><Icon name="duplicate" size={15} /> Duplicate</ToolButton>
            <button onClick={deleteSelected}
              className="flex items-center gap-1 rounded-lg border border-logo/40 px-2 py-1.5 text-xs font-semibold text-orange-light hover:bg-logo/10">
              <Icon name="trash" size={15} /> Delete
            </button>
          </div>
        </div>
      ),
    },
    {
      key: "canvas", title: "Background", icon: "palette",
      body: (
        <div className="p-3">
          <Swatches value={bgColor} onPick={setBackground} extra={customColors} onAdd={addCustomColor} />
        </div>
      ),
    },
    ...(owned.length > 0 || sharedWithMe.length > 0 ? [{
      key: "files", title: "Files", icon: "folder" as IconName,
      body: (
        <ul className="space-y-1 p-3">
          {owned.map((d) => (
            <li key={d.id}>
              <div className="flex items-center gap-1 rounded border border-tan/30 bg-white/70 px-2 py-1 text-[11px]">
                <button onClick={() => openDesign(d)} className="flex-1 truncate text-left text-espresso/80 hover:text-orange-light">{d.name}</button>
                <button onClick={() => setShareOpen(shareOpen === d.id ? null : d.id)} title="Share"
                  className="flex items-center gap-0.5 px-1 text-espresso/50 hover:text-espresso">
                  <Icon name="share" size={13} />{shares[d.id]?.length ? shares[d.id].length : ""}
                </button>
                <button onClick={() => removeDesign(d.id)} title="Delete" className="px-1 text-orange-light">
                  <Icon name="close" size={13} />
                </button>
              </div>
              {shareOpen === d.id && (
                <div className="mt-1 rounded border border-tan/30 bg-cream/60 p-1.5">
                  {people.length === 0 ? (
                    <p className="text-[11px] text-tan">No colleagues yet.</p>
                  ) : (
                    <ul className="max-h-32 space-y-0.5 overflow-auto">
                      {people.map((p) => (
                        <li key={p.id}>
                          <label className="flex items-center gap-1.5 text-[11px] text-espresso/80">
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
          {sharedWithMe.map((d) => (
            <li key={d.id} className="flex items-center gap-1 rounded border border-dashed border-tan/40 bg-white/50 px-2 py-1 text-[11px]">
              <button onClick={() => openDesign(d)} className="flex-1 truncate text-left text-espresso/80 hover:text-orange-light">{d.name}</button>
              <span className="text-tan">{peopleById[d.user_id]?.full_name?.split(" ")[0] ?? "shared"}</span>
            </li>
          ))}
        </ul>
      ),
    }] : []),
  ];

  return (
    <div className="flex h-full flex-col bg-cream text-espresso">
      {/* ---- top toolbar ---- */}
      <div className="flex items-center gap-1.5 border-b border-tan/30 bg-cream/90 px-2 py-1.5">
        <Link href="/studio" title="Back to Studio"
          className="mr-1 flex items-center rounded px-1.5 py-1 transition hover:bg-tan/15">
          <Logo size={22} />
        </Link>
        <span className="mx-0.5 h-5 w-px bg-tan/30" />
        <TopBtn onClick={undo} title="Undo (Ctrl+Z)"><Icon name="undo" size={18} /></TopBtn>
        <TopBtn onClick={redo} title="Redo (Ctrl+Shift+Z)"><Icon name="redo" size={18} /></TopBtn>
        <span className="mx-1 h-5 w-px bg-tan/30" />
        <TopBtn onClick={() => setShowGrid((v) => !v)} title="Grid" active={showGrid}><Icon name="grid" size={18} /></TopBtn>
        <TopBtn onClick={() => setSnap((v) => !v)} title="Snap to grid" active={snap}><Icon name="magnet" size={18} /></TopBtn>
        <span className="mx-1 h-5 w-px bg-tan/30" />
        <select value={formatKey} onChange={(e) => setFormatKey(e.target.value as FormatKey)}
          className="rounded border border-tan/40 bg-white px-2 py-1 text-xs text-espresso focus:border-logo focus:outline-none">
          {FORMATS.map((f) => (
            <option key={f.key} value={f.key}>{f.label} — {f.w}×{f.h}</option>
          ))}
        </select>
        <TopBtn onClick={resetView} title="Reset zoom">{Math.round(view.scale * 100)}%</TopBtn>
        <div className="flex-1" />
        <input value={designName} onChange={(e) => setDesignName(e.target.value)}
          className="w-44 rounded border border-tan/40 bg-white px-2.5 py-1 text-xs text-espresso focus:border-logo focus:outline-none" />
        <button onClick={newDesign} title="New design"
          className="flex items-center gap-1.5 rounded border border-tan/40 px-2.5 py-1 text-xs font-semibold text-espresso/70 hover:bg-tan/10">
          <Icon name="newFile" size={16} /> New
        </button>
        <button onClick={doSave} disabled={busy} title="Save design"
          className="flex items-center gap-1.5 rounded bg-espresso px-3 py-1 text-xs font-semibold text-cream hover:bg-espresso/90 disabled:opacity-60">
          <Icon name="save" size={16} /> {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={download} title="Export PNG"
          className="flex items-center gap-1.5 rounded bg-logo px-3 py-1 text-xs font-bold text-cream hover:bg-orange-light">
          <Icon name="download" size={16} /> PNG
        </button>
      </div>

      {/* ---- body: floating panels over a full-bleed workspace ---- */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#E2D8C6]">
        {/* workspace fills the area; panels float above it */}
        <div ref={workspaceRef} onMouseDown={onWorkspaceMouseDown}
          className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: "center center" }}>
            <div className="rounded-md bg-white p-2 shadow-xl ring-1 ring-black/5">
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
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-espresso/65 px-3 py-1 text-[11px] text-cream">
            Middle-drag to pan • Ctrl + scroll to zoom
          </div>
        </div>

        {/* left icon rail — click to open/close a panel */}
        <div className="absolute left-3 top-3 z-30 flex flex-col gap-1 rounded-2xl border border-tan/30 bg-cream/95 p-1.5 shadow-lg">
          {panels.map((p) => (
            <RailButton key={p.key} icon={p.icon} label={p.title}
              active={!!openPanels[p.key]} onClick={() => togglePanel(p.key)} />
          ))}
        </div>

        {/* open panels stack in a column so they never overlap */}
        <div className="pointer-events-none absolute left-[4.5rem] top-3 z-20 flex max-h-[calc(100%-1.5rem)] flex-col gap-2 overflow-y-auto pb-2">
          {panels.filter((p) => openPanels[p.key]).map((p) => (
            <FloatingPanel key={p.key} title={p.title} icon={p.icon} onClose={() => closePanel(p.key)}>
              {p.body}
            </FloatingPanel>
          ))}
        </div>

        {/* Layers — always open on the right */}
        <div className="pointer-events-none absolute right-3 top-3 z-20 w-60">
          <FloatingPanel title="Layers" icon="layers">
            {layers.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-tan">Add something to see layers.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLayersReorder}>
                <SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-1 p-2.5">
                    {layers.map((l) => (
                      <LayerRow key={l.id} layer={l}
                        onSelect={() => selectLayer(l.id)}
                        onToggle={() => toggleVisible(l.id)} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </FloatingPanel>
        </div>

        {/* bottom tool bar */}
        <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-tan/30 bg-cream/95 p-1.5 shadow-lg">
          <ToolBarButton icon="cursor" label="Select (V)" active={tool === "select"} onClick={() => setTool("select")} />
          <ToolBarButton icon="text" label="Text — drag to draw (T)" active={tool === "text"} onClick={() => setTool("text")} />
          <span className="mx-0.5 h-6 w-px bg-tan/30" />
          <label
            title={uploadingImg ? "Uploading…" : "Add image"}
            aria-label="Add image"
            aria-busy={uploadingImg}
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition ${
              uploadingImg
                ? "cursor-wait text-tan"
                : "text-espresso/70 hover:bg-tan/20 hover:text-espresso"
            }`}
          >
            {uploadingImg ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-tan/40 border-t-logo" />
            ) : (
              <Icon name="image" size={22} />
            )}
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploadingImg} />
          </label>
        </div>
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
        className="flex cursor-grab touch-none items-center px-0.5 text-tan active:cursor-grabbing" title="Drag to reorder">
        <Icon name="grip" size={16} />
      </span>
      <button onClick={onSelect} className="flex-1 truncate text-left text-espresso/80">{layer.name}</button>
      <button onClick={onToggle} title="Show/hide" className="px-1 text-espresso/50 hover:text-espresso">
        <Icon name={layer.visible ? "eye" : "eyeOff"} size={16} />
      </button>
    </li>
  );
}

// One icon button in the left rail. Highlights on hover; stays lit while its
// panel is open.
function RailButton({
  icon, label, active, onClick,
}: {
  icon: IconName; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} title={label} aria-label={label} aria-pressed={active}
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
        active
          ? "bg-logo/15 text-orange-light"
          : "text-espresso/70 hover:bg-tan/20 hover:text-espresso"
      }`}>
      <Icon name={icon} size={22} />
    </button>
  );
}

// A tool in the bottom bar (Select / Text).
function ToolBarButton({
  icon, label, active, onClick,
}: {
  icon: IconName; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} title={label} aria-label={label} aria-pressed={active}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
        active
          ? "bg-espresso text-cream"
          : "text-espresso/70 hover:bg-tan/20 hover:text-espresso"
      }`}>
      <Icon name={icon} size={22} />
    </button>
  );
}

// A detached, draggable-feeling floating panel with a title bar and close
// button. Stacked by the parent so panels never overlap.
function FloatingPanel({
  title, icon, onClose, children,
}: {
  title: string; icon?: IconName; onClose?: () => void; children: React.ReactNode;
}) {
  return (
    <div className="pointer-events-auto w-60 shrink-0 overflow-hidden rounded-xl border border-tan/30 bg-cream/95 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-tan/20 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-espresso/70">
          {icon && <Icon name={icon} size={14} />}{title}
        </span>
        {onClose && (
          <button onClick={onClose} title="Close" aria-label={`Close ${title}`}
            className="rounded p-0.5 text-tan transition hover:bg-tan/15 hover:text-espresso">
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
      <div className="max-h-[60vh] overflow-y-auto">{children}</div>
    </div>
  );
}

function TopBtn({ children, onClick, title, active }: {
  children: React.ReactNode; onClick: () => void; title: string; active?: boolean;
}) {
  return (
    <button onClick={onClick} title={title}
      className={`rounded px-2 py-1 text-sm ${active ? "bg-logo/15 text-orange-light" : "text-espresso/70 hover:bg-tan/15"}`}>
      {children}
    </button>
  );
}

function ToolButton({ children, onClick, variant = "dark" }: {
  children: React.ReactNode; onClick: () => void; variant?: "dark" | "ghost";
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${variant === "dark" ? "bg-espresso text-cream hover:bg-espresso/90" : "border border-tan/50 text-espresso/70 hover:bg-tan/10"}`}>
      {children}
    </button>
  );
}

function Swatches({
  value, onPick, extra = [], onAdd,
}: {
  value: string; onPick: (c: string) => void;
  extra?: string[]; onAdd?: (c: string) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {[...PALETTE, ...extra].map((c, i) => (
        <button key={c + i} onClick={() => onPick(c)} aria-label={`Use ${c}`}
          className={`h-7 w-7 rounded-md border transition hover:scale-110 ${value.toLowerCase() === c.toLowerCase() ? "border-espresso ring-2 ring-espresso/30" : "border-tan/40"}`}
          style={{ backgroundColor: c }} />
      ))}
      {onAdd && <ColorPlus commit={(c) => { onAdd(c); onPick(c); }} />}
    </div>
  );
}

// Native <input type="color"> fires React's onChange on every intermediate
// color while dragging. We listen to the real `change` event instead, which
// fires once when the color is committed, so a single pick adds one color.
function ColorPlus({ commit }: { commit: (c: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const cb = useRef(commit);
  cb.current = commit;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => cb.current(el.value);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, []);
  return (
    <label title="Add a custom color"
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-dashed border-tan/60 text-base leading-none text-tan transition hover:border-logo hover:text-logo">
      +
      <input ref={ref} type="color" className="sr-only" defaultValue="#D85A30" />
    </label>
  );
}

function ShapeFill({
  onPick, extra, onAdd,
}: {
  onPick: (c: string) => void; extra?: string[]; onAdd?: (c: string) => void;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-espresso/70">Fill color</span>
      <Swatches value="" onPick={onPick} extra={extra} onAdd={onAdd} />
    </div>
  );
}
