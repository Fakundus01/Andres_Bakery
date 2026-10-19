import { describe, expect, it } from "vitest";

import { contarEtiquetas, textoDeBorrado, textoDeUso, type Borrable } from "./borrados";
import type { Product } from "./types";

const TODOS: Borrable[] = ["producto", "etiqueta", "grupo", "ingrediente", "sabor"];

/** El cartel que alguien lee **justo antes** de algo que no se deshace.
 *
 *  Vive acá y no en cada componente porque ya estaba escrito dos veces a mano
 *  —en `AdministrarIngredientes` y en el que fue `GrupoDeOpciones`— y lo único
 *  que tiene de difícil es el castellano: el plural y el género. "Si lo
 *  borrás sale de los 1 productos" no lo escribiría ella, y es exactamente lo
 *  que sale de interpolar un número sin mirarlo.
 */
describe("el aviso antes de borrar", () => {
  it("nunca escribe «de los 1 productos»", () => {
    for (const que of TODOS) {
      for (const usos of [0, 1, 2, 3]) {
        const texto = textoDeBorrado(que, usos);
        expect(texto, `${que} con ${usos}`).not.toMatch(/l[oa]s 1 /);
      }
    }
  });

  it("siempre avisa que no se deshace", () => {
    for (const que of TODOS) {
      expect(textoDeBorrado(que, 2)).toContain("No se deshace");
    }
  });

  it("concuerda el género: la etiqueta se borra «la», el grupo «lo»", () => {
    expect(textoDeBorrado("etiqueta", 3)).toContain("la tienen");
    expect(textoDeBorrado("grupo", 3)).toContain("lo tienen");
    expect(textoDeBorrado("ingrediente", 3)).toContain("lo tienen");
  });

  it("con un solo producto habla en singular", () => {
    expect(textoDeBorrado("grupo", 1)).toContain("del producto que lo tiene");
    expect(textoDeBorrado("etiqueta", 1)).toContain("del producto que la tiene");
  });

  it("sin productos no inventa un producto", () => {
    for (const que of ["etiqueta", "grupo", "ingrediente"] as Borrable[]) {
      expect(textoDeBorrado(que, 0)).not.toContain("productos que");
    }
  });

  it("un número que no debería llegar no se escribe igual", () => {
    // Si una cuenta falla, el cartel tiene que seguir siendo legible: el
    // riesgo es que diga "sale de los -1 productos" y ella no borre nada por
    // no entender qué le están preguntando.
    for (const roto of [-1, Number.NaN, 1.5]) {
      const texto = textoDeBorrado("grupo", roto);
      expect(texto).not.toMatch(/-1|NaN|1\.5/);
      expect(texto).toContain("No se deshace");
    }
  });

  it("el grupo sin usos también tranquiliza sobre los pedidos viejos", () => {
    // Estaba en el texto que tenía `GrupoDeOpciones` y se perdió en la mudanza
    // (hallazgo 9 del reviewer de T19). Es la respuesta a "si lo borro, ¿pierdo
    // los pedidos?", y la tenían producto y sabor pero no el grupo.
    expect(textoDeBorrado("grupo", 0)).toContain("no cambian");
  });

  it("lo que se lleva puesto va con su coma", () => {
    // Sin la coma, "sale de los 3 productos que lo tienen con todos sus
    // sabores" se lee como si los productos tuvieran los sabores.
    expect(textoDeBorrado("grupo", 3)).toContain("que lo tienen, con todos sus sabores");
    expect(textoDeBorrado("grupo", 1)).toContain("que lo tiene, con todos sus sabores");
    // La etiqueta no lleva coma: ahí el arrastre es una conjunción.
    expect(textoDeBorrado("etiqueta", 3)).toContain("que la tienen y de los filtros");
  });

  it("un conteo absurdamente grande no entra en notación exponencial", () => {
    // `Number.isInteger(1e21)` es `true`, así que la guarda vieja lo dejaba
    // pasar y la frase salía "sale de los 1e+21 productos".
    expect(textoDeBorrado("grupo", 1e21)).not.toContain("e+");
  });

  it("el producto dice que los pedidos viejos no cambian", () => {
    // Es la pregunta que ella hace siempre: "si lo borro, ¿pierdo los pedidos?"
    expect(textoDeBorrado("producto")).toContain("no cambian");
  });
});

describe("en cuántos productos está", () => {
  it("cuenta de a uno por producto", () => {
    // Sin género: lo usan las etiquetas (femenino) y los grupos (masculino).
    expect(textoDeUso(0)).toBe("No está en ningún producto");
    expect(textoDeUso(0)).not.toMatch(/lo|la/);
    expect(textoDeUso(1)).toBe("Está en 1 producto");
    expect(textoDeUso(4)).toBe("Está en 4 productos");
  });
});

const producto = (id: number, tags: Array<{ id: number }>): Product =>
  ({ id, tags } as unknown as Product);

describe("cuántos productos tienen cada etiqueta", () => {
  it("cuenta una vez por producto", () => {
    const cuenta = contarEtiquetas([
      producto(1, [{ id: 7 }, { id: 8 }]),
      producto(2, [{ id: 7 }]),
    ]);

    expect(cuenta[7]).toBe(2);
    expect(cuenta[8]).toBe(1);
  });

  it("un producto sin etiquetas no rompe la cuenta", () => {
    // `tags` llega `undefined` desde la API cuando el producto no tiene
    // ninguna: el panel lo recibe así y la cuenta tiene que sobrevivirlo.
    const cuenta = contarEtiquetas([{ id: 1 } as Product, producto(2, [{ id: 7 }])]);

    expect(cuenta[7]).toBe(1);
    expect(cuenta[99] ?? 0).toBe(0);
  });
});
