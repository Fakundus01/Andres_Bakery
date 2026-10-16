import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

export const TEMAS = [
  { id: "primavera", label: "Primavera", icono: "🌸" },
  { id: "verano", label: "Verano", icono: "🌻" },
  { id: "otono", label: "Otoño", icono: "🍂" },
  { id: "invierno", label: "Invierno", icono: "❄️" },
] as const;

export const TIPOGRAFIAS = [
  { id: "pixel", label: "Pixel", detalle: "Títulos en Pixelify Sans. Es el look del sitio." },
  { id: "redonda", label: "Redonda", detalle: "Todo en Nunito. Más fácil de leer si la pixel te cuesta." },
  { id: "serif", label: "Serif", detalle: "Títulos en Fraunces. Más clásico, menos de juego." },
] as const;

export const ESCALAS = [
  { id: "chica", label: "Chica" },
  { id: "normal", label: "Normal" },
  { id: "grande", label: "Grande" },
  { id: "enorme", label: "Enorme" },
] as const;

export const NAV_MODOS = [
  { id: "barra", label: "Barra arriba", detalle: "La Carta y Andrea siempre a la vista." },
  { id: "drawer", label: "Panel lateral", detalle: "Arriba queda solo el logo y la cuenta." },
] as const;

export type Tema = (typeof TEMAS)[number]["id"];
export type Tipografia = (typeof TIPOGRAFIAS)[number]["id"];
export type Escala = (typeof ESCALAS)[number]["id"];
export type NavModo = (typeof NAV_MODOS)[number]["id"];

export type Preferencias = {
  tema: Tema;
  tipografia: Tipografia;
  escala: Escala;
  navModo: NavModo;
};

export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  tema: "primavera",
  tipografia: "pixel",
  escala: "normal",
  navModo: "barra",
};

const CLAVE_STORAGE = "andres-bakery:preferencias";

const VALIDOS: Record<keyof Preferencias, readonly { id: string }[]> = {
  tema: TEMAS,
  tipografia: TIPOGRAFIAS,
  escala: ESCALAS,
  navModo: NAV_MODOS,
};

/** Solo acepta valores que existan hoy: si una preferencia vieja quedó guardada
 *  con un id que ya no usamos, cae al default en vez de romper la pantalla. */
function sanear(crudo: unknown): Preferencias {
  const resultado = { ...PREFERENCIAS_POR_DEFECTO };
  if (!crudo || typeof crudo !== "object") {
    return resultado;
  }
  for (const clave of Object.keys(VALIDOS) as (keyof Preferencias)[]) {
    const valor = (crudo as Record<string, unknown>)[clave];
    if (VALIDOS[clave].some((opcion) => opcion.id === valor)) {
      resultado[clave] = valor as never;
    }
  }
  return resultado;
}

function leerGuardadas(): Preferencias {
  // localStorage puede tirar en ventana privada o con las cookies bloqueadas.
  try {
    return sanear(JSON.parse(window.localStorage.getItem(CLAVE_STORAGE) ?? "null"));
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }
}

type PreferencesContextValue = Preferencias & {
  setPreferencia: <C extends keyof Preferencias>(clave: C, valor: Preferencias[C]) => void;
  reiniciar: () => void;
};

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<Preferencias>(leerGuardadas);

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.theme = preferencias.tema;
    raiz.dataset.fuente = preferencias.tipografia;
    raiz.dataset.escala = preferencias.escala;
  }, [preferencias.escala, preferencias.tema, preferencias.tipografia]);

  const guardar = useCallback((siguientes: Preferencias) => {
    setPreferencias(siguientes);
    try {
      window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(siguientes));
    } catch {
      // Sin persistencia las preferencias igual andan: se pierden al recargar.
    }
  }, []);

  const valor = useMemo<PreferencesContextValue>(
    () => ({
      ...preferencias,
      setPreferencia: (clave, nuevo) => guardar({ ...preferencias, [clave]: nuevo }),
      reiniciar: () => guardar(PREFERENCIAS_POR_DEFECTO),
    }),
    [guardar, preferencias],
  );

  return <PreferencesContext.Provider value={valor}>{children}</PreferencesContext.Provider>;
}
