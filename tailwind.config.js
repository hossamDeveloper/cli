/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Tajawal", "system-ui", "sans-serif"] },
      colors: {
        brand: {
          50: "#eef4ff", 100: "#dbe7ff", 200: "#bcd3ff", 300: "#8fb6ff",
          400: "#5e91ff", 500: "#3b6ef6", 600: "#274fea", 700: "#1f3fd1",
          800: "#2035a8", 900: "#1f3184",
        },
      },
    },
  },
  plugins: [],
};
