import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        void: {
          950: "#000001",
          900: "#12294E",
          850: "#24375C",
          800: "#1D2F4F",
          700: "#244A7C",
        },
        nebula: {
          blue: "var(--brand-blue)",
          ice: "var(--light-ice)",
          violet: "var(--brand-blue-mid)",
          silver: "var(--light-silver)",
        },
        aurum: {
          300: "#FFF9E3",
          400: "#D8E1EF",
          500: "#F4C542",
          600: "#D5A62A",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          faint: "var(--text-disabled)",
        },
        night: {
          950: "#000001",
          900: "#12294E",
          850: "#24375C",
          800: "#1D2F4F",
          700: "#244A7C",
        },
        star: {
          100: "#F7F9FC",
          200: "#E7EEF7",
          300: "#C9D6E8",
          400: "#1D2F4F",
          500: "#244A7C",
          600: "#12294E",
        },
        ink: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
      },
      boxShadow: {
        "star-sm": "0 0 12px rgba(29, 47, 79, 0.08)",
        "star-md": "0 0 24px rgba(29, 47, 79, 0.1)",
        "star-lg": "0 0 48px rgba(29, 47, 79, 0.13)",
        glass: "0 24px 80px rgba(0, 0, 0, 0.42)",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.04)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        pulseGold: {
          "0%, 100%": {
            boxShadow: "0 0 8px rgba(29, 47, 79, 0.12)",
          },
          "50%": {
            boxShadow: "0 0 18px rgba(29, 47, 79, 0.22)",
          },
        },
      },
      animation: {
        twinkle: "twinkle 5s ease-in-out infinite",
        "float-slow": "floatSlow 8s ease-in-out infinite",
        "pulse-gold": "pulseGold 7s ease-in-out infinite",
      },
    },
  },
};

export default config;
