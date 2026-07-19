import type { Config } from "tailwindcss";

// Design tokens ported from the judicium-flow-shield reference
// (shadcn-style OKLCH system → hex approximations, navy primary + gold accent).
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-tajawal)", "Tajawal", "Cairo", "Tahoma", "sans-serif"],
      },
      colors: {
        background: "#F6F7F9",     // oklch(98.5% .003 240)
        foreground: "#172033",     // oklch(18% .03 250)
        card: "#FFFFFF",
        border: "#DFE3EA",         // oklch(90% .01 250)
        muted: {
          DEFAULT: "#EEF0F4",      // oklch(95.5% .008 250)
          foreground: "#5D6B82",   // oklch(50% .02 255)
        },
        primary: {
          DEFAULT: "#24304E",      // oklch(28% .055 255)
          hover: "#2D3B5E",
          foreground: "#F8FAFC",
        },
        // Sidebar palette
        sidebar: {
          DEFAULT: "#16203A",      // oklch(22% .045 255)
          accent: "#212C4B",       // oklch(28% .05 255)
          border: "#26314F",       // oklch(30% .04 255)
          foreground: "#E2E6EF",   // oklch(92% .01 250)
          muted: "#8B95AC",
        },
        gold: {
          DEFAULT: "#C7A24B",      // oklch(72% .12 85)
          foreground: "#2A2410",   // oklch(20% .04 80)
          dark: "#A88437",
        },
        success: { DEFAULT: "#1E9E6A", foreground: "#FFFFFF" },   // oklch(55% .13 155)
        warning: { DEFAULT: "#DFA32F", foreground: "#2A2208" },   // oklch(72% .15 75)
        info: { DEFAULT: "#3B82C4", foreground: "#FFFFFF" },      // oklch(55% .12 235)
        destructive: { DEFAULT: "#D2403C", foreground: "#FFFFFF" }, // oklch(55% .22 25)
        // Legacy alias kept so older classes keep compiling during migration.
        brand: {
          50: "#F1F3F8", 100: "#DFE4EF", 200: "#BFC9DE", 300: "#94A4C4",
          400: "#68809E", 500: "#47608A", 600: "#33456B", 700: "#24304E",
          800: "#1D2740", 900: "#16203A", 950: "#0E1526",
        },
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        xl: "0.875rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,32,58,.05), 0 4px 12px rgba(22,32,58,.05)",
      },
    },
  },
  plugins: [],
};

export default config;
