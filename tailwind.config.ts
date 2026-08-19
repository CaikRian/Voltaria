import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#09070D", // preto profundo da identidade Heca
          soft: "#403849", // texto secundário com fundo violeta
          muted: "#756B7D", // legendas
        },
        paper: "#FFFFFF",
        mist: "#F8F5FA", // fundo lilás quase branco
        line: "#E8DFED", // bordas
        brand: {
          DEFAULT: "#A100FF", // roxo choque — CTA principal
          dark: "#6900A8", // hover e contraste
          soft: "#F5E8FF", // fundo suave
        },
        deal: "#FF2D95", // rosa elétrico — descontos / ofertas
        ok: "#12B76A", // em estoque / sucesso
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(9,7,13,0.05), 0 8px 24px rgba(57,0,87,0.08)",
        pop: "0 12px 40px rgba(57,0,87,0.16)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
