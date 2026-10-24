import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  agregarAviso,
  descartarAviso,
  msParaIrse,
  nuevoAviso,
  seVaSolo,
  type Aviso,
  type LinkDelAviso,
} from "../lib/avisos";

interface AvisosContextValue {
  avisos: Aviso[];
  exito: (texto: string, link?: LinkDelAviso) => void;
  error: (texto: string) => void;
  aviso: (texto: string) => void;
  descartar: (id: string) => void;
}

const AvisosContext = createContext<AvisosContextValue | null>(null);

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  // El plazo de cada aviso arranca cuando nace ese aviso, no cuando cambia la
  // cola: sin este registro, agregar el segundo le regalaba cuatro segundos
  // más al primero.
  const plazos = useRef(new Map<string, number>());

  const descartar = useCallback((id: string) => {
    setAvisos((cola) => descartarAviso(cola, id));
  }, []);

  const avisar = useCallback(
    (tono: Aviso["tono"], texto: string, link?: LinkDelAviso) => {
      setAvisos((cola) => agregarAviso(cola, nuevoAviso({ tono, texto, link })));
    },
    [],
  );

  useEffect(() => {
    avisos.forEach((aviso) => {
      if (!seVaSolo(aviso.tono) || plazos.current.has(aviso.id)) {
        return;
      }
      const ms = msParaIrse(aviso.tono);
      if (ms === null) {
        return;
      }
      plazos.current.set(
        aviso.id,
        window.setTimeout(() => {
          plazos.current.delete(aviso.id);
          descartar(aviso.id);
        }, ms),
      );
    });

    // El que ya se fue —porque lo cerraron o porque el tope se lo llevó— deja
    // su plazo colgado, y ese plazo descartaría por id a un aviso que ya no
    // está.
    plazos.current.forEach((plazo, id) => {
      if (!avisos.some((aviso) => aviso.id === id)) {
        window.clearTimeout(plazo);
        plazos.current.delete(id);
      }
    });
  }, [avisos, descartar]);

  useEffect(() => {
    const registro = plazos.current;
    return () => {
      registro.forEach((plazo) => window.clearTimeout(plazo));
      registro.clear();
    };
  }, []);

  const valor = useMemo<AvisosContextValue>(
    () => ({
      avisos,
      exito: (texto, link) => avisar("exito", texto, link),
      error: (texto) => avisar("error", texto),
      aviso: (texto) => avisar("aviso", texto),
      descartar,
    }),
    [avisos, avisar, descartar],
  );

  return <AvisosContext.Provider value={valor}>{children}</AvisosContext.Provider>;
}

export function useAvisos(): AvisosContextValue {
  const contexto = useContext(AvisosContext);
  if (!contexto) {
    throw new Error("useAvisos necesita estar adentro de <AvisosProvider>");
  }
  return contexto;
}
