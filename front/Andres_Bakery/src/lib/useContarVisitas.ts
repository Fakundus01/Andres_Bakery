import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { metricsApi } from "./api";
import { usePunteroFino } from "./usePunteroFino";

/** Cuenta una visita por cambio de ruta (F48, ADR-019).
 *
 *  No deja cookie, no manda nada que identifique a nadie y si falla no se
 *  entera el visitante: un contador no tiene por qué cortar la navegación.
 *
 *  **Las vueltas de Andrea no cuentan.** Ella entra todos los días a cargar la
 *  carta; si se contaran sus visitas, el número que mira sería mayormente ella
 *  misma y no serviría para decidir nada.
 */
export function useContarVisitas() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const punteroFino = usePunteroFino();
  const esAdmin = Boolean(user?.is_admin);

  useEffect(() => {
    if (esAdmin) {
      return;
    }
    void metricsApi.contarVisita(pathname, punteroFino ? "mouse" : "tactil").catch(() => undefined);
    // `punteroFino` queda afuera a propósito: si alguien enchufa un mouse no es
    // una visita nueva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, esAdmin]);
}
