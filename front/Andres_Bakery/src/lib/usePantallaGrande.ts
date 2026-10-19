import { useEffect, useState } from "react";

/** El ancho a partir del cual el panel usa pop-ups: el `lg` de Tailwind. */
export const ANCHO_GRANDE = 1024;

/** ¿Estamos en una pantalla de computadora?
 *
 *  Decide **comportamiento**, no estilo: el estilo lo resuelven las clases
 *  `lg:` de Tailwind sin JavaScript. Acá hace falta porque un pop-up es otra
 *  estructura, no otro CSS — en celular el formulario se queda en la página,
 *  que es mejor que un pop-up con el teclado virtual tapando la mitad.
 *
 *  Escucha los cambios: rotar la tablet o acomodar la ventana cambia la
 *  respuesta, y si no se escuchara, el panel quedaría con la estructura de
 *  cuando se cargó la página.
 */
export function usePantallaGrande(): boolean {
  const [grande, setGrande] = useState(() => consultar());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const consulta = window.matchMedia(`(min-width: ${ANCHO_GRANDE}px)`);
    const alCambiar = (evento: MediaQueryListEvent) => setGrande(evento.matches);
    consulta.addEventListener("change", alCambiar);
    setGrande(consulta.matches);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  return grande;
}

function consultar(): boolean {
  // `window` puede no estar (un test con entorno `node`, un render de
  // servidor): sin pantalla, no hay pantalla grande.
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(`(min-width: ${ANCHO_GRANDE}px)`).matches;
}
