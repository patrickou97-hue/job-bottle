import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        void: {
          950: "#02040A",
          900: "#050814",
          850: "#080c1a",
          800: "#0a0f1e",
          700: "#0f1628",
        },
        nebula: {
          blue: "#6b8db5",
          ice: "#8a9db8",
          violet: "#8b9dc3",
          silver: "#b0bac8",
        },
        aurum: {
          300: "#c8a96a",
          400: "#b89858",
          500: "#a68848",
          600: "#8a7038",
        },
        text: {
          primary: "#d8dce4",
          secondary: "#8a919d",
          muted: "#525966",
          faint: "#3a3f4a",
        },
        night: {
          950: "#02040A",
          900: "#050814",
          850: "#080c1a",
          800: "#0a0f1e",
          700: "#0f1628",
        },
        star: {
          100: "#b0bac8",
          200: "#8a9db8",
          300: "#6b8db5",
          400: "#8b9dc3",
          500: "#b89858",
          600: "#8a7038",
        },
        ink: {
          primary: "#d8dce4",
          secondary: "#8a919d",
          muted: "#525966",
          inverse: "#02040A",
        },
      },
      boxShadow: {
        "star-sm": "0 0 12px rgba(107, 141, 181, 0.06)",
        "star-md": "0 0 24px rgba(107, 141, 181, 0.08)",
        "star-lg": "0 0 48px rgba(139, 157, 195, 0.10)",
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
            boxShadow: "0 0 8px rgba(200, 169, 106, 0.10)",
          },
          "50%": {
            boxShadow: "0 0 18px rgba(200, 169, 106, 0.18)",
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
