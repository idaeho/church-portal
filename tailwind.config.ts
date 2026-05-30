import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3b70db",
          50: "#eff4ff",
          100: "#dbe8fe",
          200: "#bfd3fe",
          500: "#3b70db",
          600: "#2d5fc4",
          700: "#2350a8",
          900: "#1a3b7a",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "Noto Sans KR", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
