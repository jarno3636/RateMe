// tailwind.config.ts
import type { Config } from "tailwindcss"

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#ec4899",   // OnlyStars primary
          purple: "#a855f7",
          blue: "#3b82f6",
        },
        slate: {
          950: "#0a0f1a",   // deep background
        },
      },
      boxShadow: {
        soft: "0 4px 24px rgba(0,0,0,0.25)",
        glow: "0 0 20px rgba(236,72,153,0.4)", // premium glow
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Poppins", "ui-sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(236,72,153,0.6)" },
          "50%": { boxShadow: "0 0 0 12px rgba(236,72,153,0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out",
        "pulse-glow": "pulse-glow 2s infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),       // better forms
    require("@tailwindcss/typography"), // prose for bios & content
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/line-clamp"), // truncate bios/names
  ],
} satisfies Config
