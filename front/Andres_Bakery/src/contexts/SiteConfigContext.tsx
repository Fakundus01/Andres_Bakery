import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { siteApi } from "../lib/api";
import type { DeliveryConfig } from "../lib/types";

interface SiteConfigValue {
  config: DeliveryConfig | null;
  cargando: boolean;
}

const SiteConfigContext = createContext<SiteConfigValue>({ config: null, cargando: true });

/** Zona, costo de envío, dirección de retiro y teléfono salen del back (C4).
 *
 *  Si la consulta falla, `config` queda en null y cada pantalla lo dice en vez
 *  de inventar un número: un envío mal mostrado es plata de Andrea. */
export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<DeliveryConfig | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    siteApi
      .getDelivery()
      .then((datos) => {
        if (vigente) {
          setConfig(datos);
        }
      })
      .catch(() => {
        if (vigente) {
          setConfig(null);
        }
      })
      .finally(() => {
        if (vigente) {
          setCargando(false);
        }
      });
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <SiteConfigContext.Provider value={{ config, cargando }}>{children}</SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
