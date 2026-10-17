import type { User } from "./types";

export const CLAVE_SESION = "andres-bakery-auth";

export type SesionGuardada = {
  token: string;
  user: User | null;
};

export const SIN_SESION: SesionGuardada = { token: "", user: null };

/** Lo mínimo que necesitamos de `localStorage`, para poder pasarle otra cosa
 *  en los tests sin montar un navegador. */
export type AlmacenSimple = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function almacenPorDefecto(): AlmacenSimple | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Tocar la propiedad ya puede tirar con los datos de sitio bloqueados.
    return null;
  }
}

/** Lee la sesión guardada, o devuelve "no hay".
 *
 *  `localStorage` **tira excepción** en una ventana privada, con los datos de
 *  sitio bloqueados o detrás de ciertas políticas de empresa. Si eso pasa
 *  mientras arranca el provider, no hay sesión que recuperar: hay pantalla en
 *  blanco. Cualquier error acá vale "no hay sesión", que es un estado con el
 *  que la página funciona perfectamente.
 */
export function leerSesionGuardada(almacen: AlmacenSimple | null = almacenPorDefecto()): SesionGuardada {
  if (!almacen) {
    return SIN_SESION;
  }
  let crudo: string | null = null;
  try {
    crudo = almacen.getItem(CLAVE_SESION);
  } catch {
    return SIN_SESION;
  }
  if (!crudo) {
    return SIN_SESION;
  }
  try {
    const guardado = JSON.parse(crudo) as SesionGuardada;
    return { token: guardado?.token ?? "", user: guardado?.user ?? null };
  } catch {
    olvidarSesion(almacen);
    return SIN_SESION;
  }
}

export function guardarSesion(
  sesion: SesionGuardada,
  almacen: AlmacenSimple | null = almacenPorDefecto(),
): void {
  try {
    almacen?.setItem(CLAVE_SESION, JSON.stringify(sesion));
  } catch {
    // Sin persistencia la sesión vale para esta pestaña y se pierde al recargar.
  }
}

export function olvidarSesion(almacen: AlmacenSimple | null = almacenPorDefecto()): void {
  try {
    almacen?.removeItem(CLAVE_SESION);
  } catch {
    // Si no se puede ni borrar, no hay nada que hacer y tampoco nada que romper.
  }
}
