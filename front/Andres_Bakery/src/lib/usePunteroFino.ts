import { useEffect, useState } from "react";

const CONSULTA = "(hover: hover) and (pointer: fine)";

/** ¿Hay un mouse de verdad? (ADR-016)
 *
 *  En una pantalla táctil `:hover` queda pegado después de tocar, así que todo
 *  lo que se dispare con el puntero tiene que preguntar primero. Se resuelve en
 *  JS y no en CSS para que el estado de la tarjeta siga teniendo una sola
 *  fuente: si el giro lo hiciera `:hover` solo, `aria-hidden` e `inert` dirían
 *  una cara y la pantalla mostraría la otra.
 */
export function usePunteroFino(): boolean {
  const [punteroFino, setPunteroFino] = useState(
    () => typeof window !== "undefined" && window.matchMedia(CONSULTA).matches,
  );

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA);
    const alCambiar = (evento: MediaQueryListEvent) => setPunteroFino(evento.matches);
    setPunteroFino(consulta.matches);
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  return punteroFino;
}
