import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        void: {
          950: "#061328",
          900: "#10264A",
          850: "#1E3B66",
          800: "#4A6283",
          700: "#8D6A24",
        },
        nebula: {
          blue: "var(--aurora)",
          ice: "var(--light-ice)",
          violet: "var(--aurora)",
          silver: "var(--light-silver)",
        },
        aurum: {
          300: "#FFF9E3",
          400: "#D8E1EF",
          500: "#F3C64D",
          600: "#9D7A25",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          faint: "var(--text-disabled)",
        },
        night: {
          950: "#061328",
          900: "#10264A",
          850: "#1E3B66",
          800: "#4A6283",
          700: "#8D6A24",
        },
        star: {
          100: "#FFF9E3",
          200: "#EDF2F8",
          300: "#D8E1EF",
          400: "#F3C64D",
          500: "#D8A62F",
          600: "#9D7A25",
        },
        ink: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
      },
      boxShadow: {
        "star-sm": "0 0 12px rgba(243, 198, 77, 0.08)",
        "star-md": "0 0 24px rgba(243, 198, 77, 0.1)",
        "star-lg": "0 0 48px rgba(243, 198, 77, 0.13)",
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
            boxShadow: "0 0 8px rgba(243, 198, 77, 0.12)",
          },
          "50%": {
            boxShadow: "0 0 18px rgba(243, 198, 77, 0.22)",
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
