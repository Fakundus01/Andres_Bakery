import { describe, expect, it } from "vitest";

/** D24 · La grafía de la marca, escrita a mano UNA sola vez en todo el repo:
 *  acá. Este literal es la especificación y `MARCA` tiene que coincidir con
 *  él; la producción no vuelve a escribirla a mano en ningún archivo.
 *
 *  El humano decidió el 2026-10-25 seguir el logo, que dice «ANDRE'S BAKERY».
 *  Las dos decisiones finas que ese nombre deja abiertas quedan fijadas acá
 *  para que no las vuelva a tomar cada quien edite un texto:
 *
 *  1. **Apóstrofo recto** (U+0027), no tipográfico (U+2019). Es ASCII, así que
 *     sobrevive a todo lo que este repo usa de verdad: la consola de Windows,
 *     `grep`, los asserts de las dos suites y el CDP a mano con el que se
 *     cumple R07 cuando el MCP de Playwright no conecta. Y es el que sale del
 *     teclado de Andrea cuando edita el texto institucional desde el panel:
 *     con el tipográfico habría dos grafías que se ven iguales y comparan
 *     distinto. Hoy no hay un solo U+2019 en el código propio del proyecto
 *     —sólo en `.venv`— y este archivo lo mantiene así.
 *  2. **Mayúsculas sólo donde el diseño ya grita.** La casa ya escribe así:
 *     «Dónde encontrarnos» está en el código en caja normal y lo agranda
 *     `uppercase tracking-[0.2em]` (20 archivos del front usan esa clase). El
 *     logo es una imagen y sigue en mayúsculas; la grafía de la marca en los
 *     textos es `Andre's Bakery`, y `ANDRE'S BAKERY` es estilo, no ortografía.
 *
 *  Lo que esto NO cuida: que el header y el footer sigan DIBUJANDO la marca.
 *  Ningún test monta React (ADR-023, D37). Lo que cuida es la grafía y que no
 *  vuelva a aparecer la vieja escrita a mano; que se vea, lo dice una medición
 *  en el navegador con fecha.
 */
const GRAFIA = "Andre's Bakery";

/** Partida a propósito: entera, el barrido se encontraría a sí mismo y no
 *  podría dar cero nunca. */
const VIEJA = ["Andres", "Bakery"].join(" ");
const TIPOGRAFICO = "’";

/** Las fuentes se leen con `import.meta.glob` de Vite y no con `node:fs`,
 *  porque `tsconfig.app.json` declara `types: ["vite/client"]` y no tiene los
 *  tipos de Node: es el mismo camino que ya usa `capasFijas.test.ts`. */
const ts = import.meta.glob("../**/*.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const tsx = import.meta.glob("../**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;
const htmls = import.meta.glob("../../*.html", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

const ESTE_ARCHIVO = "marca.test.ts";
const fuentes: Array<[string, string]> = [...Object.entries(ts), ...Object.entries(tsx), ...Object.entries(htmls)]
  .map(([ruta, fuente]): [string, string] => [ruta.replace(/^(\.\.\/)+/, ""), fuente])
  .filter(([ruta]) => !ruta.endsWith(ESTE_ARCHIVO));

const conLaCadena = (cadena: string) => fuentes.filter(([, fuente]) => fuente.includes(cadena)).map(([ruta]) => ruta);

const indexHtml = () => {
  const encontrado = fuentes.find(([ruta]) => ruta.endsWith("index.html"));
  if (!encontrado) {
    throw new Error("el barrido no encontró index.html");
  }
  return encontrado[1];
};

describe("la grafía de la marca (D24)", () => {
  it("el barrido mira archivos de verdad", () => {
    // Sin esto, un glob roto dejaría los tres barridos abajo verdes probando
    // nada: es la misma red que puso `capasFijas.test.ts`.
    expect(fuentes.length).toBeGreaterThan(30);
    expect(fuentes.some(([ruta]) => ruta.endsWith("index.html"))).toBe(true);
  });

  it("`MARCA` es la grafía decidida, con apóstrofo recto y en caja normal", async () => {
    const { MARCA } = await import("./marca");

    expect(MARCA).toBe(GRAFIA);
    expect(MARCA).toContain("'");
    expect(MARCA).not.toContain(TIPOGRAFICO);
    // La caja normal es la grafía; las mayúsculas las pone el CSS o el logo.
    expect(MARCA).not.toBe(MARCA.toUpperCase());
  });

  it("ningún archivo del front dice la grafía vieja", () => {
    expect(conLaCadena(VIEJA)).toEqual([]);
  });

  it("nadie escribe la marca en mayúsculas ni con apóstrofo tipográfico", () => {
    expect(conLaCadena(GRAFIA.toUpperCase())).toEqual([]);
    expect(conLaCadena(TIPOGRAFICO)).toEqual([]);
  });

  it("el `<title>` y la descripción de la pestaña dicen la marca", () => {
    const html = indexHtml();

    expect(html).toContain(`<title>${GRAFIA} | Dulces artesanales &amp; recetas</title>`);
    expect(html).toContain(`content="${GRAFIA}: ecommerce de dulces artesanales`);
  });
});
