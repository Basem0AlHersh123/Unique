/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#6C63FF",
        secondary: "#06B6D4",
        accent: "#EC4899",
        gold: "#F59E0B",
        bg: {
          dark: "#0f0a2e",
          card: "#1a1040",
          surface: "#241952",
        }
      },
      fontFamily: {
        cairo: ["Cairo_400Regular", "Cairo_700Bold"],
      }
    }
  },
  plugins: []
}
