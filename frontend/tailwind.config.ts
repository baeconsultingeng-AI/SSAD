import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand tokens aligned to existing prototype dark scheme
        surface: "#0a0a0a",
        "surface-elevated": "#111111",
        "surface-card": "#1a1a1a",
        border: "#2a2a2a",
        accent: "#c9a84c",
        "accent-muted": "#9a7f3a",
        text: "#e8e8e8",
        "text-muted": "#888888",
        success: "#22c55e",
        warn: "#f59e0b",
        error: "#ef4444",
      },
    },
  },
  plugins: [],
};

export default config;
