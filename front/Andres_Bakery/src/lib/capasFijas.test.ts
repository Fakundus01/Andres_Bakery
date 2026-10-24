import { describe, expect, it } from "vitest";

import { capasFijasDe, ReglaDeCapasFijas, type CapaFija } from "./capasFijas";

const regla = new ReglaDeCapasFijas();

const capa = (etiqueta: string, clases: string): CapaFija => ({
  archivo: "X.tsx",
  linea: 1,
  etiqueta,
  clases,
});

describe("ReglaDeCapasFijas", () => {
  it("un contenedor fixed sin pointer-events-none es una fuga", () => {
    // El defecto exacto de D35: el contenedor de AyudaPanel antes del arreglo.
    expect(regla.esFuga(capa("div", "fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]"))).toBe(true);
  });

  it("el mismo contenedor con pointer-events-none deja de ser fuga", () => {
    expect(
      regla.esFuga(capa("div", "pointer-events-none fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]")),
    ).toBe(false);
  });

  it("el velo de un modal no es fuga: inset-0 se come el clic a propósito", () => {
    expect(regla.esFuga(capa("div", "fixed inset-0 z-50 bg-tinta/30"))).toBe(false);
  });

  it("un botón flotante no es fuga: es la pieza tocable, no un contenedor", () => {
    expect(regla.esFuga(capa("button", "btn-primary fixed bottom-6 right-6 z-40"))).toBe(false);
  });

  it("no confunde `pointer-events-none` con un prefijo pegado", () => {
    // `md:pointer-events-none` no vale: la regla tiene que valer a 320px.
    expect(regla.esFuga(capa("div", "fixed bottom-6 md:pointer-events-none"))).toBe(true);
  });

  it("saca la clase y la etiqueta que la lleva, aunque estén en renglones distintos", () => {
    const fuente = ['<div', '  aria-live="polite"', '  className="pointer-events-none fixed inset-x-0 bottom-0"', ">"].join("\n");
    expect(capasFijasDe("RegionDeAvisos.tsx", fuente)).toEqual([
      { archivo: "RegionDeAvisos.tsx", linea: 3, etiqueta: "div", clases: "pointer-events-none fixed inset-x-0 bottom-0" },
    ]);
  });

  it("ignora un className sin `fixed`, y no se come `fixed` como subcadena", () => {
    expect(capasFijasDe("A.tsx", '<div className="sticky top-0 unfixed-thing">')).toEqual([]);
  });
});

/** El guard que cuida D35 en TODO el código, no sólo en el archivo que lo tuvo:
 *  cualquier contenedor `fixed` nuevo sin `pointer-events-none` pone esto rojo.
 *  Lee las fuentes porque las clases de Tailwind tienen que ser literales y no
 *  hay tests de componente en este proyecto (ADR-023: el runner es `node`, sin
 *  DOM). Las trae con `import.meta.glob` de Vite y no con `node:fs`, así el
 *  archivo sigue compilando contra `tsconfig.app.json`, que no tiene los tipos
 *  de Node. No reemplaza la medición en el navegador: prueba la declaración. */
describe("las capas fixed del proyecto", () => {
  const fuentes = import.meta.glob("../**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<
    string,
    string
  >;

  it("ninguna se queda con los punteros de lo que tiene debajo", () => {
    const capas = Object.entries(fuentes)
      .filter(([ruta]) => !ruta.endsWith(".test.tsx"))
      .flatMap(([ruta, fuente]) => capasFijasDe(ruta.replace(/^\.\.\//, ""), fuente));
    // Si esto da 0, el barrido se rompió y el test no estaría probando nada.
    expect(capas.length).toBeGreaterThan(0);
    expect(regla.fugas(capas).map((fuga) => regla.explicar(fuga))).toEqual([]);
  });
});
