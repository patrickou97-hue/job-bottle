import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        void: {
          950: "#0B1226",
          900: "#101A36",
          850: "#182448",
          800: "#22305C",
          700: "#2a3868",
        },
        nebula: {
          blue: "#8F86F0",
          ice: "#B4BCE0",
          violet: "#4A3B7C",
          silver: "#F2F0FF",
        },
        aurum: {
          300: "#FFD98E",
          400: "#FFC2A0",
          500: "#F5B45C",
          600: "#b88b52",
        },
        text: {
          primary: "#F2F0FF",
          secondary: "#B4BCE0",
          muted: "#78819F",
          faint: "#59617c",
        },
        night: {
          950: "#0B1226",
          900: "#101A36",
          850: "#182448",
          800: "#22305C",
          700: "#4A3B7C",
        },
        star: {
          100: "#FFF6E3",
          200: "#FFD98E",
          300: "#FFC2A0",
          400: "#8F86F0",
          500: "#F5B45C",
          600: "#5E55C2",
        },
        ink: {
          primary: "#F2F0FF",
          secondary: "#B4BCE0",
          muted: "#78819F",
          inverse: "#0B1226",
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
