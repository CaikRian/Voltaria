import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0E1420", // texto principal / navy quase preto
          soft: "#3A4356", // texto secundário
          muted: "#697386", // legendas
        },
        paper: "#FFFFFF",
        mist: "#F4F5F7", // fundo da página
        line: "#E4E7EC", // bordas
        brand: {
          DEFAULT: "#2F5BFF", // azul elétrico — CTA principal
          dark: "#1E3FD6", // hover
          soft: "#EEF2FF", // fundo suave
        },
        deal: "#FF4D3D", // coral — descontos / ofertas
        ok: "#12B76A", // em estoque / sucesso
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,20,32,0.04), 0 8px 24px rgba(14,20,32,0.06)",
        pop: "0 12px 40px rgba(14,20,32,0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
