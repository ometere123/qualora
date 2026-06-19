import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "governance-navy":  "#0A1020",
        "data-steel":       "#334155",
        "validation-cyan":  "#06B6D4",
        "consensus-violet": "#7C3AED",
        "governance-green": "#059669",
        "policy-amber":     "#D97706",
        "quarantine-red":   "#DC2626",
        "review-indigo":    "#4F46E5",
        "ledger-mist":      "#F3F6FA",
        "audit-white":      "#FFFFFF",
        "frosted-panel":    "#F8FAFC",
        "schema-line":      "#CBD5E1",
        "control-ink":      "#0F172A",
        "metadata-grey":    "#64748B",
        "dormant-slate":    "#94A3B8",
      },
      fontFamily: {
        archivo:        ["var(--font-archivo)", "sans-serif"],
        "source-sans":  ["var(--font-source-sans)", "sans-serif"],
        "roboto-mono":  ["var(--font-roboto-mono)", "monospace"],
      },
      borderRadius: {
        btn:   "6px",
        card:  "10px",
        panel: "12px",
        modal: "14px",
        badge: "999px",
        input: "8px",
      },
      height: {
        ribbon: "76px",
        btn:    "42px",
      },
      boxShadow: {
        "audit-panel":    "0 1px 3px 0 rgba(10,16,32,0.06), 0 1px 2px -1px rgba(10,16,32,0.04)",
        "panel-elevated": "0 4px 12px 0 rgba(10,16,32,0.10)",
        "verdict-seal":   "0 0 0 1px rgba(124,58,237,0.20), 0 4px 20px 0 rgba(124,58,237,0.12)",
      },
      keyframes: {
        "skeleton-shimmer": {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-violet": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
      },
      animation: {
        "skeleton-shimmer": "skeleton-shimmer 1.6s ease-in-out infinite",
        "fade-in":          "fade-in 0.2s ease-out",
        "slide-in-right":   "slide-in-right 0.25s ease-out",
        "pulse-violet":     "pulse-violet 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

export default config
