import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";

export const TEMAS = [
  { id: "primavera", label: "Primavera", icono: "🌸" },
  { id: "verano", label: "Verano", icono: "🌻" },
  { id: "otono", label: "Otoño", icono: "🍂" },
  { id: "invierno", label: "Invierno", icono: "❄️" },
] as const;

export type Tema = (typeof TEMAS)[number]["id"];

const TEMA_POR_DEFECTO: Tema = "primavera";
const CLAVE_STORAGE = "andres-bakery:tema";

function esTema(valor: unknown): valor is Tema {
  return TEMAS.some((tema) => tema.id === valor);
}

function temaGuardado(): Tema {
  // localStorage puede tirar en ventana privada o con las cookies bloqueadas.
  try {
    const guardado = window.localStorage.getItem(CLAVE_STORAGE);
    return esTema(guardado) ? guardado : TEMA_POR_DEFECTO;
  } catch {
    return TEMA_POR_DEFECTO;
  }
}

type ThemeContextValue = {
  tema: Tema;
  setTema: (tema: Tema) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>(temaGuardado);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
  }, [tema]);

  const setTema = useCallback((siguiente: Tema) => {
    setTemaState(siguiente);
    try {
      window.localStorage.setItem(CLAVE_STORAGE, siguiente);
    } catch {
      // Sin persistencia el tema igual funciona: se pierde al recargar.
    }
  }, []);

  return <ThemeContext.Provider value={{ tema, setTema }}>{children}</ThemeContext.Provider>;
}
