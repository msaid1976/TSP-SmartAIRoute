import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0F1E",
        foreground: "#FFFFFF",
        card: "#1E2A3A",
        muted: "#6B7280",
        border: "rgba(59, 130, 246, 0.18)",
        accent: "#3B82F6",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)"],
        mono: ["var(--font-jetbrains-mono)"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(59, 130, 246, 0.18), 0 20px 80px rgba(14, 165, 233, 0.18)",
      },
      backgroundImage: {
        radial:
          "radial-gradient(circle at top, rgba(59,130,246,0.26), transparent 45%), radial-gradient(circle at bottom right, rgba(14,165,233,0.18), transparent 35%)",
      },
    },
  },
  plugins: [],
};

export default config;
