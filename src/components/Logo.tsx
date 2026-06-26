"use client";

import { useState } from "react";

/**
 * Renders the SC Pronto knot. Prefers the real 3D render at /logo.png and
 * falls back to the flat SVG (/logo.svg) if the PNG hasn't been added yet.
 */
export function Logo({
  size = 40,
  withWordmark = false,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  const [src, setSrc] = useState("/logo.png");

  return (
    <span className="inline-flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        onError={() => setSrc("/logo.svg")}
        height={size}
        alt="SC Pronto"
        className="select-none"
        style={{ height: size, width: "auto" }}
      />
      {withWordmark && (
        <span
          className="font-serif font-bold tracking-tight text-espresso"
          style={{ fontSize: size * 0.7 }}
        >
          SC Pronto
        </span>
      )}
    </span>
  );
}
