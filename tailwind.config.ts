import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0d1216",
          900: "#141a1f",
          850: "#1a2127",
          800: "#20282e",
          700: "#2b353c",
        },
        fg: {
          DEFAULT: "#e7eae8",
          muted: "#a3acad",
          faint: "#7b8588",
        },
        line: "#293237",
        accent: "#c6a15f",
        signal: {
          good: "#57b98a",
          bad: "#d47676",
          warn: "#c6a15f",
          info: "#719fc4",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        control: "8px",
        card: "12px",
      },
      keyframes: {
        enter: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        enter: "enter 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
