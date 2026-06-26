"use client";

import { useEffect, useRef, useState, useCallback } from "react";
// fabric is loaded dynamically inside the effect so it never runs on the server.
import type { Canvas as FabricCanvas, FabricObject } from "fabric";

/** Preset canvas sizes (real export pixels) for common social formats. */
const TEMPLATES = [
  { key: "ig-post", label: "Instagram Post", w: 1080, h: 1080 },
  { key: "ig-story", label: "Instagram Story", w: 1080, h: 1920 },
  { key: "fb-post", label: "Facebook Post", w: 1200, h: 630 },
  { key: "x-post", label: "X Post", w: 1600, h: 900 },
] as const;

/** SC Pronto brand palette + black/white. */
const PALETTE = [
  "#D85A30", "#A8451F", "#E8743F", "#3A1A0E",
  "#FBF4E8", "#C9A06A", "#FFFFFF", "#000000",
];

const FONTS = [
  "Inter", "Spectral", "Georgia", "Arial",
  "Times New Roman", "Courier New", "Impact", "Trebuchet MS",
];

const MAX_W = 520;
const MAX_H = 560;

function displaySize(w: number, h: number) {
  const scale = Math.min(MAX_W / w, MAX_H / h);
  return { dw: Math.round(w * scale), dh: Math.round(h * scale), scale };
}

export function StudioEditor() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const fabricModRef = useRef<typeof import("fabric") | null>(null);

  const [templateKey, setTemplateKey] = useState<string>("ig-post");
  const [bgColor, setBgColor] = useState("#FBF4E8");
  const [selKind, setSelKind] = useState<"text" | "image" | null>(null);
  const [textProps, setTextProps] = useState({
    fontFamily: "Inter",
    fontSize: 64,
    fill: "#3A1A0E",
    bold: false,
  });

  const template =
    TEMPLATES.find((t) => t.key === templateKey) ?? TEMPLATES[0];

  // Reflect the current selection into the React controls.
  const syncSelection = useCallback((obj: FabricObject | undefined) => {
    if (!obj) {
      setSelKind(null);
      return;
    }
    if (obj.type === "textbox") {
      setSelKind("text");
      const t = obj as unknown as {
        fontFamily: string;
        fontSize: number;
        fill: string;
        fontWeight: string | number;
      };
      setTextProps({
        fontFamily: t.fontFamily || "Inter",
        fontSize: Math.round(t.fontSize || 64),
        fill: typeof t.fill === "string" ? t.fill : "#3A1A0E",
        bold: t.fontWeight === "bold" || t.fontWeight === 700,
      });
    } else {
      setSelKind("image");
    }
  }, []);

  // Initialise fabric once, on mount.
  useEffect(() => {
    let disposed = false;

    // Make the brand fonts available to the canvas by name.
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Spectral:wght@500;700&display=swap";
    document.head.appendChild(link);

    (async () => {
      const fabric = await import("fabric");
      if (disposed || !canvasElRef.current) return;
      fabricModRef.current = fabric;

      const { dw, dh } = displaySize(template.w, template.h);
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: dw,
        height: dh,
        backgroundColor: bgColor,
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      const onSel = () => syncSelection(canvas.getActiveObject() ?? undefined);
      canvas.on("selection:created", onSel);
      canvas.on("selection:updated", onSel);
      canvas.on("selection:cleared", () => setSelKind(null));
    })();

    return () => {
      disposed = true;
      fabricRef.current?.dispose();
      fabricRef.current = null;
      link.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize the canvas when the template changes (keep objects in place).
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { dw, dh } = displaySize(template.w, template.h);
    canvas.setDimensions({ width: dw, height: dh });
    canvas.renderAll();
  }, [template.w, template.h]);

  function setBackground(color: string) {
    setBgColor(color);
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.backgroundColor = color;
    canvas.renderAll();
  }

  async function addText() {
    const canvas = fabricRef.current;
    const fabric = fabricModRef.current;
    if (!canvas || !fabric) return;
    const text = new fabric.Textbox("Your text", {
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      originX: "center",
      originY: "center",
      width: canvas.getWidth() * 0.7,
      fontSize: 64 * (canvas.getWidth() / template.w),
      fontFamily: "Inter",
      fill: "#3A1A0E",
      textAlign: "center",
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    syncSelection(text);
  }

  async function addImageFromUrl(url: string, fraction = 0.5) {
    const canvas = fabricRef.current;
    const fabric = fabricModRef.current;
    if (!canvas || !fabric) return;
    const img = await fabric.FabricImage.fromURL(url, {
      crossOrigin: "anonymous",
    });
    const target = canvas.getWidth() * fraction;
    const scale = target / (img.width ?? target);
    img.scale(scale);
    img.set({
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      originX: "center",
      originY: "center",
    });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
    syncSelection(img);
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addImageFromUrl(String(reader.result), 0.6);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function updateText(patch: Partial<typeof textProps>) {
    const next = { ...textProps, ...patch };
    setTextProps(next);
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj || obj.type !== "textbox") return;
    obj.set({
      fontFamily: next.fontFamily,
      fontSize: next.fontSize,
      fill: next.fill,
      fontWeight: next.bold ? "bold" : "normal",
    });
    canvas.renderAll();
  }

  function deleteSelected() {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
    setSelKind(null);
  }

  function layer(dir: "front" | "back") {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    if (dir === "front") canvas.bringObjectToFront(obj);
    else canvas.sendObjectToBack(obj);
    canvas.renderAll();
  }

  async function download() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    // Make sure brand fonts are rendered before exporting.
    if (document.fonts?.ready) await document.fonts.ready;
    const { scale } = displaySize(template.w, template.h);
    const dataUrl = canvas.toDataURL({
      format: "png",
      multiplier: 1 / scale,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `scpronto-${template.key}.png`;
    a.click();
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ---------------- Controls ---------------- */}
      <aside className="w-full shrink-0 space-y-6 lg:w-72">
        <Section title="Template">
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTemplateKey(t.key)}
                className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                  templateKey === t.key
                    ? "border-logo bg-logo/10 text-orange-light"
                    : "border-tan/50 text-espresso/70 hover:bg-tan/10"
                }`}
              >
                {t.label}
                <span className="mt-0.5 block text-[10px] text-tan">
                  {t.w}×{t.h}
                </span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Background">
          <Swatches value={bgColor} onPick={setBackground} />
          <ColorInput value={bgColor} onChange={setBackground} />
        </Section>

        <Section title="Add">
          <div className="grid grid-cols-1 gap-2">
            <ToolButton onClick={addText}>＋ Text</ToolButton>
            <ToolButton onClick={() => addImageFromUrl("/logo.png", 0.4)}>
              ＋ SC Pronto logo
            </ToolButton>
            <label className="cursor-pointer rounded-lg bg-espresso px-3 py-2 text-center text-sm font-semibold text-cream transition hover:bg-espresso/90">
              ＋ Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onUpload}
              />
            </label>
          </div>
        </Section>

        {selKind && (
          <Section title="Selected">
            {selKind === "text" && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-espresso/70">
                  Font
                  <select
                    value={textProps.fontFamily}
                    onChange={(e) => updateText({ fontFamily: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-tan/50 bg-white px-2.5 py-2 text-sm text-espresso focus:border-logo focus:outline-none"
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f} style={{ fontFamily: f }}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-espresso/70">
                  Size — {textProps.fontSize}px
                  <input
                    type="range"
                    min={12}
                    max={300}
                    value={textProps.fontSize}
                    onChange={(e) =>
                      updateText({ fontSize: Number(e.target.value) })
                    }
                    className="mt-1 w-full accent-logo"
                  />
                </label>
                <div>
                  <span className="text-xs font-medium text-espresso/70">
                    Text color
                  </span>
                  <Swatches
                    value={textProps.fill}
                    onPick={(c) => updateText({ fill: c })}
                  />
                  <ColorInput
                    value={textProps.fill}
                    onChange={(c) => updateText({ fill: c })}
                  />
                </div>
                <button
                  onClick={() => updateText({ bold: !textProps.bold })}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                    textProps.bold
                      ? "border-logo bg-logo/10 text-orange-light"
                      : "border-tan/50 text-espresso/70 hover:bg-tan/10"
                  }`}
                >
                  Bold
                </button>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <ToolButton onClick={() => layer("front")} variant="ghost">
                Bring front
              </ToolButton>
              <ToolButton onClick={() => layer("back")} variant="ghost">
                Send back
              </ToolButton>
              <button
                onClick={deleteSelected}
                className="rounded-lg border border-logo/40 px-3 py-2 text-sm font-semibold text-orange-light transition hover:bg-logo/10"
              >
                Delete
              </button>
            </div>
          </Section>
        )}

        <button
          onClick={download}
          className="w-full rounded-lg bg-logo px-4 py-3 text-sm font-bold text-cream transition hover:bg-orange-light"
        >
          ⬇ Download PNG
        </button>
      </aside>

      {/* ---------------- Canvas ---------------- */}
      <div className="flex flex-1 items-start justify-center">
        <div className="inline-block rounded-card bg-white p-4 shadow-md ring-1 ring-tan/30">
          <canvas ref={canvasElRef} />
          <p className="mt-3 text-center text-xs text-tan">
            Click an object to select • drag to move • drag corners to resize •
            double-click text to edit
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- small presentational helpers ---------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-espresso">{title}</h3>
      {children}
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  variant = "dark",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "dark" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        variant === "dark"
          ? "bg-espresso text-cream hover:bg-espresso/90"
          : "border border-tan/50 text-espresso/70 hover:bg-tan/10"
      }`}
    >
      {children}
    </button>
  );
}

function Swatches({
  value,
  onPick,
}: {
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {PALETTE.map((c) => (
        <button
          key={c}
          onClick={() => onPick(c)}
          aria-label={`Use ${c}`}
          className={`h-7 w-7 rounded-md border transition ${
            value.toLowerCase() === c.toLowerCase()
              ? "border-espresso ring-2 ring-espresso/30"
              : "border-tan/40"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-2 h-8 w-full cursor-pointer rounded-md border border-tan/40 bg-white"
      aria-label="Custom color"
    />
  );
}
