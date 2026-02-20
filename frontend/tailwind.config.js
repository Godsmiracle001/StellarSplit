/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // enables class-based dark mode
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Drips-wave / Stellar-wave palette
        primary: {
          DEFAULT: "#6C63FF",
          dark: "#8B85FF",
        },
        surface: {
          light: "#FFFFFF",
          dark: "#0F1117",
        },
        background: {
          light: "#F4F4F8",
          dark: "#1A1D27",
        },
        card: {
          light: "#FFFFFF",
          dark: "#252836",
        },
        text: {
          light: "#1A1A2E",
          dark: "#E8E8F0",
        },
        muted: {
          light: "#6B7280",
          dark: "#9CA3AF",
        },
        border: {
          light: "#E5E7EB",
          dark: "#374151",
        },
      },
      transitionDuration: {
        theme: "300ms",
      },
    },
  },
  plugins: [],
};
