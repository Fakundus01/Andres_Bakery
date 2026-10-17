/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
  },
  test: {
    // Entorno `node` y no `jsdom`: lo que se prueba acá es lógica pura
    // —cuentas, formato, saneado de datos—, no componentes. Montar un DOM
    // falso costaría una dependencia más para no usarla (ADR-023).
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
