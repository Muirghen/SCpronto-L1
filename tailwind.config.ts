import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // SC Pronto — Warm Monochrome / Industrial
        logo: "#D85A30", // Orange / Logo — knot + primary action
        "orange-light": "#A8451F", // Accent on cream
        "orange-dark": "#E8743F", // Accent on espresso
        espresso: "#3A1A0E", // Dark bg + front text
        cream: "#FBF4E8", // Front bg + back text
        tan: "#C9A06A", // Low-priority / muted labels
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "ui-serif", "serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
