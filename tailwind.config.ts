import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0d1117",
          surface: "#161b22",
          border: "#30363d",
          text: "#e6edf3",
          muted: "#8b949e",
          accent: "#d2a8ff",
          green: "#7ee787",
          blue: "#79c0ff",
          orange: "#ffa657",
          red: "#ff7b72",
        },
      },
    },
  },
  plugins: [],
};

export default config;
