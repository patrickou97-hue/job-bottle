import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        void: {
          950: "#000001",
          900: "#12294E",
          850: "#24375C",
          800: "#564A71",
          700: "#7F5568",
        },
        nebula: {
          blue: "var(--aurora)",
          ice: "var(--light-ice)",
          violet: "#564A71",
          silver: "var(--light-silver)",
        },
        aurum: {
          300: "#E7E2FF",
          400: "#C9C5E4",
          500: "#7E7CB5",
          600: "#564A71",
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
          800: "#564A71",
          700: "#7F5568",
        },
        star: {
          100: "#F1EFFF",
          200: "#E7E2FF",
          300: "#C9C5E4",
          400: "#7E7CB5",
          500: "#7F5568",
          600: "#564A71",
        },
        ink: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
      },
      boxShadow: {
        "star-sm": "0 0 12px rgba(126, 124, 181, 0.08)",
        "star-md": "0 0 24px rgba(126, 124, 181, 0.1)",
        "star-lg": "0 0 48px rgba(126, 124, 181, 0.13)",
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
            boxShadow: "0 0 8px rgba(126, 124, 181, 0.12)",
          },
          "50%": {
            boxShadow: "0 0 18px rgba(126, 124, 181, 0.22)",
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
