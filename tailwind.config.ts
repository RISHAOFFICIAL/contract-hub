import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#F7F3EC",
          deep: "#EFE8D8",
          soft: "#FBF9F4",
        },
        forest: {
          DEFAULT: "#1E3A2B",
          dark: "#142A1F",
          light: "#2C4F3A",
          tint: "#E9EFE9",
        },
        brass: {
          DEFAULT: "#B08D3E",
          light: "#C9A961",
          pale: "#F4ECDA",
          dark: "#8A6E2F",
        },
        ink: {
          DEFAULT: "#1F1D18",
          soft: "#4A463C",
          faint: "#8A8474",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31, 29, 24, 0.05), 0 8px 24px rgba(31, 29, 24, 0.08)",
        lift: "0 2px 4px rgba(31, 29, 24, 0.06), 0 16px 40px rgba(31, 29, 24, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
