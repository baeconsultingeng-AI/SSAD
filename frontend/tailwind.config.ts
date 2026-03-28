import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        ser: ["var(--font-playfair)", "Georgia", "serif"],
        ui: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-ibm-mono)", "monospace"],
      },
      colors: {
        bg: "#f5f1eb",
        bg2: "#f0ece4",
        bg3: "#ede9e1",
        sur: "#fff",
        bdr: "#ddd8cf",
        bdr2: "#c9c2b8",
        txt: "#1a1410",
        mut: "#5c4f42",
        dim: "#8a7d72",
        blu: "#1a4a8a",
        blu2: "#2563b0",
        gold: "#c8960c",
        gold2: "#e0a820",
        grn: "#007a5e",
        red: "#c0392b",
        amb: "#b8620a",
      },
    },
  },
  plugins: [],
};

export default config;
