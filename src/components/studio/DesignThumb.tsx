"use client";

import { useEffect, useRef, useState } from "react";
import { FORMATS } from "@/lib/studio/templates";
import type { Design } from "@/lib/types";

// Same basis the editor uses to lay designs out, so stored coordinates map
// back to the right canvas size when we re-render the thumbnail.
const MAX_W = 520;
const MAX_H = 560;

function displaySize(w: number, h: number) {
  const scale = Math.min(MAX_W / w, MAX_H / h);
  return { dw: Math.round(w * scale), dh: Math.round(h * scale) };
}

/**
 * Renders a saved design's Fabric JSON to a static PNG preview. Draws once on
 * an offscreen StaticCanvas, exports a data URL, then disposes the canvas.
 */
export function DesignThumb({ design }: { design: Design }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const fmt = FORMATS.find((f) => f.key === design.format_key) ?? FORMATS[0];

  useEffect(() => {
    let disposed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let canvas: any;
    (async () => {
      const fabric = await import("fabric");
      if (disposed || !canvasRef.current) return;
      const { dw, dh } = displaySize(fmt.w, fmt.h);
      canvas = new fabric.StaticCanvas(canvasRef.current, {
        width: dw, height: dh, renderOnAddRemove: false,
      });
      try {
        await canvas.loadFromJSON(design.data || {});
        canvas.renderAll();
        const url = canvas.toDataURL({ format: "png", multiplier: 0.6 });
        if (!disposed) setSrc(url);
      } catch {
        /* leave the skeleton if the design can't be parsed */
      } finally {
        try { canvas?.dispose(); } catch { /* ignore */ }
      }
    })();
    return () => {
      disposed = true;
      try { canvas?.dispose(); } catch { /* ignore */ }
    };
  }, [design, fmt.w, fmt.h]);

  return (
    // Uniform tile regardless of format; the design is letterboxed inside so
    // the file grid stays even instead of stretching to the tallest item.
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#E2D8C6]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={design.name} className="h-full w-full object-contain" />
      ) : (
        <div className="h-full w-full animate-pulse bg-tan/20" />
      )}
      {/* hidden draw surface */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
