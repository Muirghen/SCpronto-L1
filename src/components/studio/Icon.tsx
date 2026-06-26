// Hand-drawn SVG icons for Social Studio. Stroke-based (Lucide-ish) so they
// scale cleanly and follow the surrounding text color via `currentColor`.
// A few glyphs (cursor, star) are filled — those set their own fill.
import * as React from "react";

export type IconName =
  | "cursor"
  | "text"
  | "image"
  | "rect"
  | "circle"
  | "triangle"
  | "star"
  | "line"
  | "templates"
  | "layers"
  | "sliders"
  | "palette"
  | "folder"
  | "undo"
  | "redo"
  | "grid"
  | "magnet"
  | "plus"
  | "close"
  | "eye"
  | "eyeOff"
  | "grip"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "bold"
  | "shadow"
  | "duplicate"
  | "trash"
  | "share"
  | "save"
  | "download"
  | "newFile"
  | "calendar"
  | "send"
  | "sparkles"
  | "shapes"
  | "flipH"
  | "flipV"
  | "swap"
  | "alignObjLeft"
  | "alignObjCenterX"
  | "alignObjRight"
  | "alignObjTop"
  | "alignObjCenterY"
  | "alignObjBottom"
  | "smiley"
  | "check";

const FILLED: ReadonlySet<IconName> = new Set<IconName>(["cursor", "star", "sparkles"]);

const paths: Record<IconName, React.ReactNode> = {
  // Classic arrow pointer with a softly rounded tail — reads clearly at small
  // sizes and matches the warm, rounded feel of the rest of the UI.
  cursor: (
    <path
      d="M5.6 3.1c-.5-.2-1.1.2-1.1.8v13.9c0 .7.8 1 1.3.5l3.1-3.1 2.1 4.6c.2.5.8.7 1.3.5l1.4-.6c.5-.2.7-.8.5-1.3l-2-4.4h4.3c.7 0 1-.9.5-1.3z"
      strokeWidth="0.6"
      stroke="currentColor"
      strokeLinejoin="round"
    />
  ),
  text: (
    <>
      <path d="M4 6.5V5h16v1.5" />
      <path d="M12 5v14" />
      <path d="M8.5 19h7" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.7" />
      <path d="M21 15.5 16 11 6 19.5" />
    </>
  ),
  rect: <rect x="3.5" y="6" width="17" height="12" rx="2.5" />,
  circle: <circle cx="12" cy="12" r="8.5" />,
  triangle: <path d="M12 4 21 19.5H3z" />,
  star: (
    <path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z" />
  ),
  line: <path d="M4.5 19.5 19.5 4.5" />,
  templates: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 21 8l-9 5-9-5z" />
      <path d="M3 12.5 12 17.5 21 12.5" />
      <path d="M3 16.5 12 21.5 21 16.5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h11M19 7h1M4 17h1M9 17h11" />
      <path d="M4 12h6M14 12h6" />
      <circle cx="17" cy="7" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="7" cy="17" r="2" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.9-1 1.9-2 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2H16a4 4 0 0 0 4-4c0-4.4-3.6-7.5-8-7.5z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="9.5" cy="7" r="1" />
      <circle cx="14.5" cy="7" r="1" />
      <circle cx="16.5" cy="11" r="1" />
    </>
  ),
  folder: (
    <path d="M3 7.5a2 2 0 0 1 2-2h3.6a2 2 0 0 1 1.4.6l1 1a2 2 0 0 0 1.4.6H19a2 2 0 0 1 2 2v6.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  ),
  undo: (
    <>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h10a5 5 0 0 1 5 5v0" />
    </>
  ),
  redo: (
    <>
      <path d="m15 7 5 5-5 5" />
      <path d="M20 12H10a5 5 0 0 0-5 5v0" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" />
    </>
  ),
  magnet: (
    <>
      <path d="M7 4H4v7a8 8 0 0 0 16 0V4h-3" />
      <path d="M4 8h3M17 8h3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3 21 21" />
      <path d="M10.6 6.2A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.3M6.3 7.8A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 3.3-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="6" r="1.3" />
      <circle cx="15" cy="6" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="18" r="1.3" />
      <circle cx="15" cy="18" r="1.3" />
    </>
  ),
  alignLeft: <path d="M4 6h16M4 10h10M4 14h14M4 18h8" />,
  alignCenter: <path d="M4 6h16M7 10h10M5 14h14M8 18h8" />,
  alignRight: <path d="M4 6h16M10 10h10M6 14h14M12 18h8" />,
  bold: (
    <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
  ),
  shadow: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="M15.5 8.2a6 6 0 0 1-7.3 7.3 6 6 0 0 0 7.3-7.3z" />
    </>
  ),
  duplicate: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8V7" />
      <path d="M6 7l1 12.2a1 1 0 0 0 1 .8h8a1 1 0 0 0 1-.8L18 7" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.2" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="18.5" r="2.2" />
      <path d="m8 10.9 8-4.3M8 13.1l8 4.3" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h11l3.5 3.5V20H5z" />
      <path d="M8 4v4.5h7V4" />
      <rect x="8.5" y="12.5" width="7" height="6.5" rx="0.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10" />
      <path d="m7.5 10 4.5 4 4.5-4" />
      <path d="M5 19h14" />
    </>
  ),
  newFile: (
    <>
      <path d="M6 3h7l5 5v13H6z" />
      <path d="M13 3v5h5" />
      <path d="M12 11.5v5M9.5 14h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M7.5 13h3v3h-3z" />
    </>
  ),
  send: (
    <>
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3 14.5 21l-4-7.5L3 9.5z" />
    </>
  ),
  // Elements: a four-point sparkle — "add creative content" without a plain +.
  sparkles: (
    <>
      <path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7z" />
      <path d="M18 15l.8 2.2 2.2.8-2.2.8L18 21l-.8-2.2-2.2-.8 2.2-.8z" strokeWidth="1.3" />
    </>
  ),
  // Overlapping square + circle — the shapes tool.
  shapes: (
    <>
      <rect x="3.5" y="3.5" width="10" height="10" rx="1.6" />
      <circle cx="15.5" cy="15.5" r="5" />
    </>
  ),
  flipH: (
    <>
      <path d="M12 3v18" strokeDasharray="2.5 2.5" />
      <path d="M9.5 7.5 4.5 12l5 4.5z" />
      <path d="M14.5 7.5 19.5 12l-5 4.5z" />
    </>
  ),
  flipV: (
    <>
      <path d="M3 12h18" strokeDasharray="2.5 2.5" />
      <path d="M7.5 9.5 12 4.5l4.5 5z" />
      <path d="M7.5 14.5 12 19.5l4.5-5z" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h13l-3.2-3.2" />
      <path d="M20 16H7l3.2 3.2" />
    </>
  ),
  alignObjLeft: (
    <>
      <path d="M4 3.5v17" />
      <rect x="7" y="6.5" width="11" height="4" rx="1" />
      <rect x="7" y="13.5" width="7" height="4" rx="1" />
    </>
  ),
  alignObjCenterX: (
    <>
      <path d="M12 3.5v17" />
      <rect x="6.5" y="6.5" width="11" height="4" rx="1" />
      <rect x="8.5" y="13.5" width="7" height="4" rx="1" />
    </>
  ),
  alignObjRight: (
    <>
      <path d="M20 3.5v17" />
      <rect x="6" y="6.5" width="11" height="4" rx="1" />
      <rect x="10" y="13.5" width="7" height="4" rx="1" />
    </>
  ),
  alignObjTop: (
    <>
      <path d="M3.5 4h17" />
      <rect x="6.5" y="7" width="4" height="11" rx="1" />
      <rect x="13.5" y="7" width="4" height="7" rx="1" />
    </>
  ),
  alignObjCenterY: (
    <>
      <path d="M3.5 12h17" />
      <rect x="6.5" y="6.5" width="4" height="11" rx="1" />
      <rect x="13.5" y="8.5" width="4" height="7" rx="1" />
    </>
  ),
  alignObjBottom: (
    <>
      <path d="M3.5 20h17" />
      <rect x="6.5" y="6" width="4" height="11" rx="1" />
      <rect x="13.5" y="10" width="4" height="7" rx="1" />
    </>
  ),
  smiley: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.2" />
    </>
  ),
  check: <path d="M5 12.5 10 17.5 19 6.5" strokeWidth="2.2" />,
};

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
