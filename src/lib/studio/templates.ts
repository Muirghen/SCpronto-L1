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
  // ----------------------------- Sales & promos -----------------------------
  {
    key: "sale",
    label: "Big Sale",
    format: "ig-post",
    bg: "#3A1A0E",
    els: [
      { t: "logo", x: 0.5, y: 0.135, w: 0.13 },
      { t: "rect", x: 0.5, y: 0.30, w: 0.34, h: 0.072, fill: "#D85A30", rx: 999 },
      { t: "text", x: 0.5, y: 0.30, w: 0.32, text: "LIMITED TIME", size: 0.032, font: "Montserrat", fill: "#FBF4E8", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.475, w: 0.92, text: "BIG SALE", size: 0.215, font: "Bebas Neue", fill: "#FBF4E8", align: "center" },
      { t: "rect", x: 0.5, y: 0.60, w: 0.14, h: 0.006, fill: "#E8743F" },
      { t: "text", x: 0.5, y: 0.685, w: 0.82, text: "Up to 50% off — this week only", size: 0.045, font: "Montserrat", fill: "#C9A06A", align: "center" },
    ],
  },
  {
    key: "flash",
    label: "Flash Sale",
    format: "ig-story",
    bg: "#D85A30",
    els: [
      { t: "rect", x: 0.5, y: 0.5, w: 0.86, h: 1.42, fill: "#3A1A0E", rx: 28 },
      { t: "text", x: 0.5, y: 0.30, w: 0.6, text: "FLASH", size: 0.18, font: "Bebas Neue", fill: "#E8743F", align: "center" },
      { t: "text", x: 0.5, y: 0.40, w: 0.6, text: "SALE", size: 0.18, font: "Bebas Neue", fill: "#FBF4E8", align: "center" },
      { t: "rect", x: 0.5, y: 0.515, w: 0.5, h: 0.004, fill: "#C9A06A" },
      { t: "text", x: 0.5, y: 0.60, w: 0.7, text: "48 hours only", size: 0.05, font: "Montserrat", fill: "#C9A06A", align: "center" },
      { t: "rect", x: 0.5, y: 0.70, w: 0.56, h: 0.07, fill: "#D85A30", rx: 999 },
      { t: "text", x: 0.5, y: 0.70, w: 0.54, text: "SHOP NOW", size: 0.04, font: "Montserrat", fill: "#FBF4E8", align: "center", bold: true },
      { t: "logo", x: 0.5, y: 0.86, w: 0.16 },
    ],
  },
  {
    key: "burst",
    label: "Discount Burst",
    format: "ig-post",
    bg: "#FBF4E8",
    els: [
      { t: "circle", x: 0.5, y: 0.46, r: 0.34, fill: "#D85A30" },
      { t: "circle", x: 0.5, y: 0.46, r: 0.30, fill: "#3A1A0E" },
      { t: "text", x: 0.5, y: 0.38, w: 0.5, text: "SAVE", size: 0.05, font: "Montserrat", fill: "#C9A06A", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.47, w: 0.6, text: "50%", size: 0.20, font: "Bebas Neue", fill: "#E8743F", align: "center" },
      { t: "text", x: 0.5, y: 0.565, w: 0.5, text: "OFF EVERYTHING", size: 0.034, font: "Montserrat", fill: "#FBF4E8", align: "center" },
      { t: "text", x: 0.5, y: 0.84, w: 0.8, text: "This weekend only — in store & online", size: 0.036, font: "Montserrat", fill: "#3A1A0E", align: "center" },
    ],
  },
  {
    key: "promo",
    label: "Promo Code",
    format: "ig-post",
    bg: "#3A1A0E",
    els: [
      { t: "rect", x: 0.5, y: 0.5, w: 0.78, h: 0.52, fill: "#3A1A0E", rx: 18, dashed: true, stroke: "#C9A06A" },
      { t: "text", x: 0.5, y: 0.33, w: 0.7, text: "USE CODE", size: 0.04, font: "Montserrat", fill: "#C9A06A", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.47, w: 0.8, text: "PRONTO20", size: 0.16, font: "Bebas Neue", fill: "#E8743F", align: "center" },
      { t: "rect", x: 0.5, y: 0.575, w: 0.3, h: 0.004, fill: "#C9A06A" },
      { t: "text", x: 0.5, y: 0.64, w: 0.7, text: "20% off your next order", size: 0.04, font: "Montserrat", fill: "#FBF4E8", align: "center" },
      { t: "logo", x: 0.5, y: 0.84, w: 0.12 },
    ],
  },
  {
    key: "weekend",
    label: "Weekend Special",
    format: "ig-post",
    bg: "#FBF4E8",
    els: [
      { t: "circle", x: 0.5, y: 0.205, r: 0.115, fill: "#D85A30" },
      { t: "text", x: 0.5, y: 0.205, w: 0.21, text: "WEEKEND", size: 0.033, font: "Bebas Neue", fill: "#FBF4E8", align: "center" },
      { t: "text", x: 0.5, y: 0.45, w: 0.85, text: "Special of\nthe week", size: 0.088, font: "Playfair Display", fill: "#3A1A0E", align: "center", bold: true },
      { t: "rect", x: 0.5, y: 0.59, w: 0.12, h: 0.006, fill: "#D85A30" },
      { t: "text", x: 0.5, y: 0.66, w: 0.8, text: "Fresh croissants & espresso — $6", size: 0.04, font: "Montserrat", fill: "#A8451F", align: "center" },
      { t: "logo", x: 0.5, y: 0.86, w: 0.12 },
    ],
  },

  // ----------------------------- Products ----------------------------------
  {
    key: "newproduct",
    label: "New Product",
    format: "ig-post",
    bg: "#FBF4E8",
    els: [
      { t: "rect", x: 0.5, y: 0.28, w: 1, h: 0.56, fill: "#D85A30" },
      { t: "text", x: 0.5, y: 0.16, w: 0.8, text: "JUST", size: 0.05, font: "Montserrat", fill: "#FBF4E8", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.30, w: 0.9, text: "NEW", size: 0.20, font: "Oswald", fill: "#FBF4E8", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.66, w: 0.85, text: "Maple Pecan Latte", size: 0.062, font: "Playfair Display", fill: "#3A1A0E", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.76, w: 0.8, text: "Try it in stores this week", size: 0.035, font: "Montserrat", fill: "#A8451F", align: "center" },
      { t: "logo", x: 0.5, y: 0.9, w: 0.11 },
    ],
  },
  {
    key: "feature",
    label: "Product Feature",
    format: "ig-post",
    bg: "#3A1A0E",
    els: [
      { t: "rect", x: 0.5, y: 0.5, w: 0.66, h: 0.66, fill: "#1f0d06", rx: 24 },
      { t: "circle", x: 0.5, y: 0.36, r: 0.16, fill: "#D85A30" },
      { t: "logo", x: 0.5, y: 0.36, w: 0.12 },
      { t: "text", x: 0.5, y: 0.585, w: 0.6, text: "Cold Brew", size: 0.07, font: "Poppins", fill: "#FBF4E8", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.66, w: 0.58, text: "Slow-steeped 18 hours\nfor a smooth finish", size: 0.032, font: "Montserrat", fill: "#C9A06A", align: "center" },
    ],
  },
  {
    key: "stat",
    label: "Big Number",
    format: "ig-post",
    bg: "#FBF4E8",
    els: [
      { t: "text", x: 0.5, y: 0.24, w: 0.8, text: "OUR COMMUNITY", size: 0.036, font: "Montserrat", fill: "#A8451F", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.47, w: 0.95, text: "10,000+", size: 0.24, font: "Bebas Neue", fill: "#D85A30", align: "center" },
      { t: "rect", x: 0.5, y: 0.63, w: 0.16, h: 0.006, fill: "#3A1A0E" },
      { t: "text", x: 0.5, y: 0.71, w: 0.8, text: "cups served every month", size: 0.046, font: "Playfair Display", fill: "#3A1A0E", align: "center" },
      { t: "logo", x: 0.5, y: 0.87, w: 0.11 },
    ],
  },

  // ----------------------------- Quotes & tips -----------------------------
  {
    key: "quote",
    label: "Quote",
    format: "ig-post",
    bg: "#FBF4E8",
    els: [
      { t: "text", x: 0.5, y: 0.22, w: 0.5, text: "“", size: 0.28, font: "Playfair Display", fill: "#D85A30", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.47, w: 0.82, text: "Great coffee is\nmade with care.", size: 0.08, font: "Playfair Display", fill: "#3A1A0E", align: "center" },
      { t: "rect", x: 0.5, y: 0.64, w: 0.16, h: 0.006, fill: "#D85A30" },
      { t: "text", x: 0.5, y: 0.71, w: 0.6, text: "— SC Pronto", size: 0.035, font: "Montserrat", fill: "#A8451F", align: "center", bold: true },
      { t: "logo", x: 0.5, y: 0.86, w: 0.1 },
    ],
  },
  {
    key: "tip",
    label: "Did You Know",
    format: "ig-post",
    bg: "#C9A06A",
    els: [
      { t: "rect", x: 0.5, y: 0.5, w: 0.84, h: 0.74, fill: "#FBF4E8", rx: 24 },
      { t: "rect", x: 0.5, y: 0.265, w: 0.4, h: 0.066, fill: "#3A1A0E", rx: 999 },
      { t: "text", x: 0.5, y: 0.265, w: 0.38, text: "DID YOU KNOW?", size: 0.03, font: "Montserrat", fill: "#FBF4E8", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.47, w: 0.72, text: "Espresso has less\ncaffeine per serving\nthan drip coffee.", size: 0.058, font: "Playfair Display", fill: "#3A1A0E", align: "center" },
      { t: "logo", x: 0.5, y: 0.7, w: 0.12 },
    ],
  },
  {
    key: "testimonial",
    label: "Testimonial",
    format: "ig-post",
    bg: "#3A1A0E",
    els: [
      { t: "circle", x: 0.5, y: 0.22, r: 0.1, fill: "#D85A30" },
      { t: "text", x: 0.5, y: 0.22, w: 0.18, text: "★", size: 0.07, font: "Arial", fill: "#FBF4E8", align: "center" },
      { t: "text", x: 0.5, y: 0.37, w: 0.7, text: "★★★★★", size: 0.05, font: "Arial", fill: "#E8743F", align: "center" },
      { t: "text", x: 0.5, y: 0.52, w: 0.8, text: "“Best flat white in town —\nI'm here every morning.”", size: 0.05, font: "Playfair Display", fill: "#FBF4E8", align: "center" },
      { t: "text", x: 0.5, y: 0.7, w: 0.7, text: "— Maria G.", size: 0.034, font: "Montserrat", fill: "#C9A06A", align: "center", bold: true },
      { t: "logo", x: 0.5, y: 0.86, w: 0.1 },
    ],
  },

  // ----------------------------- Announcements -----------------------------
  {
    key: "event",
    label: "Event",
    format: "ig-story",
    bg: "#3A1A0E",
    els: [
      { t: "logo", x: 0.5, y: 0.13, w: 0.2 },
      { t: "rect", x: 0.5, y: 0.30, w: 0.46, h: 0.07, fill: "#D85A30", rx: 999 },
      { t: "text", x: 0.5, y: 0.30, w: 0.44, text: "SAT · 7PM", size: 0.045, font: "Bebas Neue", fill: "#FBF4E8", align: "center" },
      { t: "text", x: 0.5, y: 0.46, w: 0.85, text: "Grand\nOpening", size: 0.12, font: "Playfair Display", fill: "#FBF4E8", align: "center" },
      { t: "rect", x: 0.5, y: 0.575, w: 0.2, h: 0.004, fill: "#E8743F" },
      { t: "text", x: 0.5, y: 0.64, w: 0.8, text: "Coffee, pastries & live music", size: 0.038, font: "Montserrat", fill: "#C9A06A", align: "center" },
    ],
  },
  {
    key: "comingsoon",
    label: "Coming Soon",
    format: "ig-story",
    bg: "#1f0d06",
    els: [
      { t: "rect", x: 0.5, y: 0.5, w: 1, h: 0.0025, fill: "#D85A30" },
      { t: "logo", x: 0.5, y: 0.3, w: 0.2 },
      { t: "text", x: 0.5, y: 0.46, w: 0.9, text: "COMING", size: 0.14, font: "Bebas Neue", fill: "#FBF4E8", align: "center" },
      { t: "text", x: 0.5, y: 0.55, w: 0.9, text: "SOON", size: 0.14, font: "Bebas Neue", fill: "#E8743F", align: "center" },
      { t: "text", x: 0.5, y: 0.66, w: 0.8, text: "Our new flagship — Sept 2026", size: 0.04, font: "Montserrat", fill: "#C9A06A", align: "center" },
    ],
  },
  {
    key: "hiring",
    label: "Now Hiring",
    format: "ig-post",
    bg: "#3A1A0E",
    els: [
      { t: "logo", x: 0.5, y: 0.15, w: 0.14 },
      { t: "text", x: 0.5, y: 0.38, w: 0.92, text: "WE'RE\nHIRING", size: 0.14, font: "Oswald", fill: "#E8743F", align: "center", bold: true },
      { t: "text", x: 0.5, y: 0.58, w: 0.8, text: "Baristas & shift leads wanted", size: 0.044, font: "Montserrat", fill: "#FBF4E8", align: "center" },
      { t: "rect", x: 0.5, y: 0.73, w: 0.52, h: 0.084, fill: "#D85A30", rx: 999 },
      { t: "text", x: 0.5, y: 0.73, w: 0.5, text: "Apply today →", size: 0.038, font: "Montserrat", fill: "#FBF4E8", align: "center", bold: true },
    ],
  },
  {
    key: "thanks",
    label: "Thank You",
    format: "ig-post",
    bg: "#FBF4E8",
    els: [
      { t: "text", x: 0.5, y: 0.42, w: 0.9, text: "Thank you", size: 0.13, font: "Pacifico", fill: "#D85A30", align: "center" },
      { t: "rect", x: 0.5, y: 0.55, w: 0.14, h: 0.006, fill: "#3A1A0E" },
      { t: "text", x: 0.5, y: 0.62, w: 0.8, text: "For being part of our story", size: 0.04, font: "Montserrat", fill: "#3A1A0E", align: "center" },
      { t: "logo", x: 0.5, y: 0.82, w: 0.13 },
    ],
  },
  {
    key: "welcome",
    label: "Welcome",
    format: "ig-post",
    bg: "#D85A30",
    els: [
      { t: "circle", x: 0.5, y: 0.5, r: 0.62, fill: "#3A1A0E" },
      { t: "logo", x: 0.5, y: 0.32, w: 0.16 },
      { t: "text", x: 0.5, y: 0.5, w: 0.9, text: "Welcome", size: 0.12, font: "Playfair Display", fill: "#FBF4E8", align: "center" },
      { t: "text", x: 0.5, y: 0.62, w: 0.8, text: "to the neighbourhood", size: 0.04, font: "Montserrat", fill: "#C9A06A", align: "center" },
    ],
  },

  // ----------------------------- Wide formats ------------------------------
  {
    key: "menu",
    label: "Menu",
    format: "ig-portrait",
    bg: "#3A1A0E",
    els: [
      { t: "logo", x: 0.5, y: 0.1, w: 0.15 },
      { t: "text", x: 0.5, y: 0.205, w: 0.8, text: "TODAY'S MENU", size: 0.072, font: "Bebas Neue", fill: "#FBF4E8", align: "center" },
      { t: "rect", x: 0.5, y: 0.27, w: 0.26, h: 0.005, fill: "#D85A30" },
      { t: "text", x: 0.30, y: 0.40, w: 0.5, text: "Espresso", size: 0.044, font: "Montserrat", fill: "#FBF4E8", align: "left" },
      { t: "text", x: 0.70, y: 0.40, w: 0.4, text: "$3.0", size: 0.044, font: "Montserrat", fill: "#E8743F", align: "right" },
      { t: "text", x: 0.30, y: 0.50, w: 0.5, text: "Cappuccino", size: 0.044, font: "Montserrat", fill: "#FBF4E8", align: "left" },
      { t: "text", x: 0.70, y: 0.50, w: 0.4, text: "$4.5", size: 0.044, font: "Montserrat", fill: "#E8743F", align: "right" },
      { t: "text", x: 0.30, y: 0.60, w: 0.5, text: "Croissant", size: 0.044, font: "Montserrat", fill: "#FBF4E8", align: "left" },
      { t: "text", x: 0.70, y: 0.60, w: 0.4, text: "$3.5", size: 0.044, font: "Montserrat", fill: "#E8743F", align: "right" },
      { t: "text", x: 0.30, y: 0.70, w: 0.5, text: "Avocado Toast", size: 0.044, font: "Montserrat", fill: "#FBF4E8", align: "left" },
      { t: "text", x: 0.70, y: 0.70, w: 0.4, text: "$7.0", size: 0.044, font: "Montserrat", fill: "#E8743F", align: "right" },
    ],
  },
  {
    key: "banner",
    label: "Header Banner",
    format: "x-header",
    bg: "#3A1A0E",
    els: [
      { t: "rect", x: 0.85, y: 0.5, w: 0.34, h: 1.3, fill: "#D85A30" },
      { t: "logo", x: 0.1, y: 0.5, w: 0.1 },
      { t: "text", x: 0.47, y: 0.39, w: 0.42, text: "SC Pronto", size: 0.05, font: "Playfair Display", fill: "#FBF4E8", align: "left", bold: true },
      { t: "text", x: 0.47, y: 0.63, w: 0.42, text: "Specialty coffee, made fast", size: 0.024, font: "Montserrat", fill: "#C9A06A", align: "left" },
    ],
  },
  {
    key: "fbpromo",
    label: "Facebook Promo",
    format: "fb-post",
    bg: "#FBF4E8",
    els: [
      { t: "rect", x: 0.25, y: 0.5, w: 0.5, h: 1.3, fill: "#3A1A0E" },
      { t: "logo", x: 0.25, y: 0.27, w: 0.1 },
      { t: "text", x: 0.25, y: 0.54, w: 0.44, text: "Buy one,\nget one free", size: 0.058, font: "Playfair Display", fill: "#FBF4E8", align: "center", bold: true },
      { t: "text", x: 0.25, y: 0.77, w: 0.42, text: "Every Friday this month", size: 0.026, font: "Montserrat", fill: "#C9A06A", align: "center" },
      { t: "text", x: 0.74, y: 0.3, w: 0.42, text: "FRIDAY", size: 0.038, font: "Montserrat", fill: "#A8451F", align: "center", bold: true },
      { t: "text", x: 0.74, y: 0.52, w: 0.46, text: "BOGO", size: 0.14, font: "Bebas Neue", fill: "#D85A30", align: "center" },
      { t: "text", x: 0.74, y: 0.72, w: 0.42, text: "on all espresso drinks", size: 0.026, font: "Montserrat", fill: "#3A1A0E", align: "center" },
    ],
  },
];
