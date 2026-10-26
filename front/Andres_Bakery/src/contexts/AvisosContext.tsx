import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  agregarAviso,
  agregarRetencion,
  cerrarConEscape,
  descartarAviso,
  elPlazoCorre,
  msParaIrse,
  nuevoAviso,
  quitarRetencion,
  type Aviso,
  type LinkDelAviso,
  type MotivoDeRetencion,
} from "../lib/avisos";

/** Lo que un aviso puede traer además del texto.
 *
 *  `asunto` es con qué se compara el aviso contra los que ya están en pantalla
 *  (D36): lo manda quien puede producir dos avisos con el mismo texto que no
 *  son el mismo aviso. Va en un objeto y no como tercer parámetro posicional
 *  para que el único que lo usa hoy no tenga que escribir un `undefined` en el
 *  medio: el `link` existe desde F64 y ningún llamador lo usa (ADR-037). */
export interface ExtrasDelAviso {
  asunto?: string;
  link?: LinkDelAviso;
}

interface AvisosContextValue {
  avisos: Aviso[];
  exito: (texto: string, extras?: ExtrasDelAviso) => void;
  error: (texto: string) => void;
  aviso: (texto: string) => void;
  descartar: (id: string) => void;
  /** Pausa el plazo de los que se van solos: alguien está leyendo (D30). */
  retener: (motivo: MotivoDeRetencion) => void;
  liberar: (motivo: MotivoDeRetencion) => void;
  /** Lo que deja Escape; `idEnfocado` es el aviso que tiene el foco del
   *  teclado, si hay alguno. La decisión vive en `cerrarConEscape`. */
  escapar: (idEnfocado: string | null) => void;
}

const AvisosContext = createContext<AvisosContextValue | null>(null);

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  // El plazo de cada aviso arranca cuando nace ese aviso, no cuando cambia la
  // cola: sin este registro, agregar el segundo le regalaba cuatro segundos
  // más al primero.
  const plazos = useRef(new Map<string, number>());
  // Quién está pausando los plazos: el foco del teclado, el mouse, o los dos
  // (D30). Es de la REGIÓN y no de cada aviso: con el cartel en
  // `pointer-events-none` (ADR-037) el mouse solo se puede detectar sobre la X
  // y el link, y son tres carteles apilados en una columna que se lee junta.
  const [retenciones, setRetenciones] = useState<MotivoDeRetencion[]>([]);

  const descartar = useCallback((id: string) => {
    setAvisos((cola) => descartarAviso(cola, id));
  }, []);

  const retener = useCallback((motivo: MotivoDeRetencion) => {
    setRetenciones((motivos) => agregarRetencion(motivos, motivo));
  }, []);

  const liberar = useCallback((motivo: MotivoDeRetencion) => {
    setRetenciones((motivos) => quitarRetencion(motivos, motivo));
  }, []);

  const escapar = useCallback((idEnfocado: string | null) => {
    setAvisos((cola) => {
      // Si Escape no se lleva nada se devuelve la MISMA cola: el listener es
      // del documento, así que esta función corre también cada vez que
      // alguien cierra un modal con Escape, y una copia nueva ahí sería un
      // re-render de todo el sitio por nada.
      const quedan = cerrarConEscape(cola, idEnfocado);
      return quedan.length === cola.length ? cola : quedan;
    });
  }, []);

  const avisar = useCallback(
    (tono: Aviso["tono"], texto: string, extras?: ExtrasDelAviso) => {
      setAvisos((cola) => agregarAviso(cola, nuevoAviso({ tono, texto, ...extras })));
    },
    [],
  );

  useEffect(() => {
    avisos.forEach((aviso) => {
      if (!elPlazoCorre(aviso, retenciones) || plazos.current.has(aviso.id)) {
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

    // Se cancela el plazo del que ya se fue —porque lo cerraron o porque el
    // tope se lo llevó, y ese plazo descartaría por id a un aviso que ya no
    // está— y también el del que quedó retenido: al soltarlo, este mismo
    // efecto le arranca el plazo **entero** de nuevo. Guardar el resto del
    // plazo sería contarle milisegundos que nadie puede ver; quien lo estaba
    // leyendo se lleva los cuatro segundos completos.
    plazos.current.forEach((plazo, id) => {
      const aviso = avisos.find((candidato) => candidato.id === id);
      if (!aviso || !elPlazoCorre(aviso, retenciones)) {
        window.clearTimeout(plazo);
        plazos.current.delete(id);
      }
    });
  }, [avisos, descartar, retenciones]);

  // Red para una retención colgada: si el aviso enfocado se cierra sin que el
  // foco alcance a moverse a ningún lado (`aDondeVuelveElFoco` devolvió
  // `null`), el navegador no dispara `focusout` y "foco" se quedaría puesto
  // para siempre, dejando a TODOS los avisos siguientes sin plazo. Sin avisos
  // en pantalla no hay nada que retener.
  useEffect(() => {
    if (avisos.length === 0) {
      setRetenciones((motivos) => (motivos.length ? [] : motivos));
    }
  }, [avisos]);

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
      exito: (texto, extras) => avisar("exito", texto, extras),
      error: (texto) => avisar("error", texto),
      aviso: (texto) => avisar("aviso", texto),
      descartar,
      retener,
      liberar,
      escapar,
    }),
    [avisos, avisar, descartar, retener, liberar, escapar],
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
