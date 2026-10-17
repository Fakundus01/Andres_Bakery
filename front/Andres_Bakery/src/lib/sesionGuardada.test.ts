import { beforeEach, describe, expect, it } from "vitest";

import {
  CLAVE_SESION,
  SIN_SESION,
  guardarSesion,
  leerSesionGuardada,
  olvidarSesion,
  type AlmacenSimple,
} from "./sesionGuardada";

/** Un `localStorage` de mentira, para probar sin navegador. */
function almacenDeMentira(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    datos,
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
    removeItem: (clave: string) => void datos.delete(clave),
  };
}

/** Uno que tira en todo, como una ventana privada o los datos bloqueados. */
const almacenRoto: AlmacenSimple = {
  getItem: () => {
    throw new DOMException("acceso denegado", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("acceso denegado", "SecurityError");
  },
  removeItem: () => {
    throw new DOMException("acceso denegado", "SecurityError");
  },
};

const sesion = { token: "abc123", user: { id: 1, name: "Andrea", email: "a@b.c", is_admin: true } };

describe("la sesión guardada", () => {
  let almacen: ReturnType<typeof almacenDeMentira>;

  beforeEach(() => {
    almacen = almacenDeMentira();
  });

  it("guarda y vuelve a leer lo mismo", () => {
    guardarSesion(sesion, almacen);

    expect(leerSesionGuardada(almacen)).toEqual(sesion);
  });

  it("olvidar borra de verdad", () => {
    // Regresión: `olvidarSesion` se llamaba a sí misma por un reemplazo mal
    // hecho, el `catch` se tragaba el desborde de pila, y la sesión quedaba
    // guardada después de apretar "Salir". En una computadora compartida eso
    // es que la siguiente persona recarga y entra.
    guardarSesion(sesion, almacen);

    olvidarSesion(almacen);

    expect(almacen.getItem(CLAVE_SESION)).toBeNull();
    expect(leerSesionGuardada(almacen)).toEqual(SIN_SESION);
  });

  it("sin nada guardado no hay sesión", () => {
    expect(leerSesionGuardada(almacen)).toEqual(SIN_SESION);
  });

  it("un JSON roto no rompe la pantalla, y se limpia solo", () => {
    almacen.setItem(CLAVE_SESION, "{esto no es json");

    expect(leerSesionGuardada(almacen)).toEqual(SIN_SESION);
    expect(almacen.getItem(CLAVE_SESION)).toBeNull();
  });

  it("un JSON a medias devuelve los huecos vacíos", () => {
    almacen.setItem(CLAVE_SESION, JSON.stringify({ token: "solo-token" }));

    expect(leerSesionGuardada(almacen)).toEqual({ token: "solo-token", user: null });
  });

  it("con el almacenamiento bloqueado no tira: devuelve «no hay sesión»", () => {
    // Esto es lo que dejaba la página en blanco en una ventana privada.
    expect(() => leerSesionGuardada(almacenRoto)).not.toThrow();
    expect(leerSesionGuardada(almacenRoto)).toEqual(SIN_SESION);
    expect(() => guardarSesion(sesion, almacenRoto)).not.toThrow();
    expect(() => olvidarSesion(almacenRoto)).not.toThrow();
  });

  it("sin almacenamiento siquiera, tampoco tira", () => {
    expect(leerSesionGuardada(null)).toEqual(SIN_SESION);
    expect(() => guardarSesion(sesion, null)).not.toThrow();
    expect(() => olvidarSesion(null)).not.toThrow();
  });
});
