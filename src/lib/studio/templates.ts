// Static design data for Social Studio: output formats, fonts, palette, and
// ready-made starter layouts. Starters are described declaratively (positions
// and sizes are fractions of the canvas) so they scale to any format and are
// easy to extend.

export type FormatKey =
  | "ig-post"
  | "ig-portrait"
  | "ig-story"
  | "fb-post"
  | "x-post"
  | "x-header"
  | "li-post"
  | "yt-thumb"
  | "pin";

export const FORMATS: { key: FormatKey; label: string; w: number; h: number }[] =
  [
    { key: "ig-post", label: "Instagram Post", w: 1080, h: 1080 },
    { key: "ig-portrait", label: "Instagram Portrait", w: 1080, h: 1350 },
    { key: "ig-story", label: "Instagram Story", w: 1080, h: 1920 },
    { key: "fb-post", label: "Facebook Post", w: 1200, h: 630 },
    { key: "x-post", label: "X Post", w: 1600, h: 900 },
    { key: "x-header", label: "X Header", w: 1500, h: 500 },
    { key: "li-post", label: "LinkedIn Post", w: 1200, h: 627 },
    { key: "yt-thumb", label: "YouTube Thumb", w: 1280, h: 720 },
    { key: "pin", label: "Pinterest Pin", w: 1000, h: 1500 },
  ];

export const PALETTE = [
  "#D85A30", "#A8451F", "#E8743F", "#3A1A0E",
  "#FBF4E8", "#C9A06A", "#FFFFFF", "#000000",
];

export const FONTS = [
  "Inter", "Spectral", "Montserrat", "Poppins", "Playfair Display",
  "Oswald", "Bebas Neue", "Lobster", "Pacifico", "Roboto",
  "Georgia", "Arial", "Impact", "Courier New",
];

// Google Fonts to load by name so the canvas can render them.
export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "Inter:wght@400;700",
    "Spectral:wght@500;700",
    "Montserrat:wght@400;700;800",
    "Poppins:wght@400;600;700",
    "Playfair+Display:wght@500;700;900",
    "Oswald:wght@400;600",
    "Bebas+Neue",
    "Lobster",
    "Pacifico",
    "Roboto:wght@400;700",
  ]
    .map((f) => `family=${f}`)
    .join("&") + "&display=swap";

// Quick sticker icons (rendered as text objects).
export const STICKERS = [
  "✨", "⭐️", "🔥", "❤️", "✅", "📣", "🎉", "🛒",
  "💬", "📅", "🏷️", "👍", "☕️", "🍞", "🥐", "📍",
];

/* ------------------------------ Starters ------------------------------ */

export type StarterEl =
  | {
      t: "rect";
      x: number; y: number; w: number; h: number;
      fill: string; rx?: number; opacity?: number; dashed?: boolean; stroke?: string;
    }
  | { t: "circle"; x: number; y: number; r: number; fill: string }
  | {
      t: "text";
      x: number; y: number; w?: number; text: string;
      size: number; font: string; fill: string;
      align?: "left" | "center" | "right"; bold?: boolean;
    }
  | { t: "logo"; x: number; y: number; w: number };

export type Starter = {
  key: string;
  label: string;
  format: FormatKey;
  bg: string;
  els: StarterEl[];
};

// Positions/sizes are fractions: x,y are CENTER as a fraction of width/height;
// w,h,r and text `size` are fractions of the canvas WIDTH.
export const STARTERS: Starter[] = [
  {
    key: "sale",
    label: "Big Sale",
    format: "ig-post",
    bg: "#3A1A0E",
    els: [
      { t: "logo", x: 0.5, y: 0.13, w: 0.16 },
      { t: "text", x: 0.5, y: 0.42, w: 0.9, text: "BIG SALE", size: 0.2, font: "Bebas Neue", fill: "#FBF4E8", align: "center" },
      { t: "rect", x: 0.5, y: 0.56, w: 0.22, h: 0.008, fill: "#D85A30" },
      { t: "text", x: 0.5, y: 0.66, w: 0.8, text: "Up to 50% off — this week only", size: 0.05, font: "Montserrat", fill: "#C9A06A", align: "center" },
    ],
  },
  {
    key: "quote",
    label: "Quote",
    format: "ig-post",
    bg: "#FBF4E8",
    els: [
      { t: "logo", x: 0.5, y: 0.14, w: 0.13 },
      { t: "text", x: 0.5, y: 0.45, w: 0.82, text: "“Great coffee is\nmade with care.”", size: 0.085, font: "Playfair Display", fill: "#3A1A0E", align: "center" },
      { t: "rect", x: 0.5, y: 0.64, w: 0.18, h: 0.006, fill: "#D85A30" },
      { t: "text", x: 0.5, y: 0.71, w: 0.6, text: "— SC Pronto", size: 0.035, font: "Montserrat", fill: "#A8451F", align: "center" },
    ],
  },
  {
    key: "newproduct",
    label: "New Product",
    format: "ig-post",
    bg: "#FBF4E8",
    els: [
      { t: "rect", x: 0.5, y: 0.27, w: 1, h: 0.54, fill: "#D85A30" },
      { t: "text", x: 0.5, y: 0.22, w: 0.8, text: "NEW", size: 0.16, font: "Oswald", fill: "#FBF4E8", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.66, w: 0.85, text: "Fresh from the kitchen", size: 0.062, font: "Poppins", fill: "#3A1A0E", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.76, w: 0.8, text: "Try it in stores this week", size: 0.035, font: "Montserrat", fill: "#A8451F", align: "center" },
      { t: "logo", x: 0.5, y: 0.9, w: 0.12 },
    ],
  },
  {
    key: "event",
    label: "Event",
    format: "ig-story",
    bg: "#3A1A0E",
    els: [
      { t: "logo", x: 0.5, y: 0.12, w: 0.22 },
      { t: "rect", x: 0.5, y: 0.32, w: 0.4, h: 0.12, fill: "#D85A30", rx: 18 },
      { t: "text", x: 0.5, y: 0.32, w: 0.38, text: "SAT · 7PM", size: 0.06, font: "Bebas Neue", fill: "#FBF4E8", align: "center" },
      { t: "text", x: 0.5, y: 0.52, w: 0.85, text: "Grand Opening", size: 0.1, font: "Playfair Display", fill: "#FBF4E8", align: "center" },
      { t: "text", x: 0.5, y: 0.62, w: 0.8, text: "Join us for coffee, pastries & live music", size: 0.04, font: "Montserrat", fill: "#C9A06A", align: "center" },
    ],
  },
  {
    key: "promo",
    label: "Promo Code",
    format: "ig-post",
    bg: "#3A1A0E",
    els: [
      { t: "rect", x: 0.5, y: 0.5, w: 0.78, h: 0.5, fill: "#3A1A0E", rx: 16, dashed: true, stroke: "#C9A06A" },
      { t: "text", x: 0.5, y: 0.34, w: 0.7, text: "USE CODE", size: 0.045, font: "Montserrat", fill: "#C9A06A", align: "center" },
      { t: "text", x: 0.5, y: 0.5, w: 0.8, text: "PRONTO20", size: 0.15, font: "Bebas Neue", fill: "#E8743F", align: "center" },
      { t: "text", x: 0.5, y: 0.64, w: 0.7, text: "20% off your next order", size: 0.04, font: "Montserrat", fill: "#FBF4E8", align: "center" },
      { t: "logo", x: 0.5, y: 0.84, w: 0.13 },
    ],
  },
];
