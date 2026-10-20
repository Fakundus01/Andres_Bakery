import { describe, expect, it } from "vitest";

import { recargoDeLasOpciones, recargoTipeado, textoDelRecargo } from "./recargos";
import type { OptionGroup } from "./types";

const relleno: OptionGroup = {
  id: 1,
  name: "Relleno",
  required: true,
  sort_order: 0,
  options: [
    { id: 11, name: "Dulce de leche", sort_order: 0 },
    { id: 12, name: "Chocolate", sort_order: 1 },
  ],
};

const bizcochoConRecargo: OptionGroup = {
  id: 4,
  name: "Bizcocho",
  required: true,
  sort_order: 1,
  options: [
    { id: 41, name: "Vainilla", sort_order: 0, price_delta: 0 },
    { id: 42, name: "Red velvet", sort_order: 1, price_delta: 1200 },
  ],
};

describe("recargoDeLasOpciones", () => {
  it("sin sabores no hay recargo", () => {
    expect(recargoDeLasOpciones(undefined)).toBe(0);
  });

  it("suma solo lo que tiene recargo", () => {
    expect(recargoDeLasOpciones([relleno.options[0], bizcochoConRecargo.options[1]])).toBe(1200);
  });
});

describe("textoDelRecargo", () => {
  it("un sabor sin recargo no dice «+$0» (C5)", () => {
    expect(textoDelRecargo(relleno.options[0])).toBe("");
    expect(textoDelRecargo(bizcochoConRecargo.options[0])).toBe("");
  });

  it("un sabor con recargo lo dice con el signo", () => {
    const texto = textoDelRecargo(bizcochoConRecargo.options[1]);
    expect(texto.startsWith("+")).toBe(true);
    expect(texto).toContain("200");
  });

  it("con centavos los dice, porque el back los cobra", () => {
    const conCentavos = { id: 43, name: "Mitad y mitad", sort_order: 0, price_delta: 1500.5 };
    expect(textoDelRecargo(conCentavos)).toContain("500,5");
    // Y sin centavos no los inventa.
    expect(textoDelRecargo(bizcochoConRecargo.options[1])).not.toContain(",");
  });

  it("un recargo infinito no escribe «+$∞»", () => {
    // Alcanzable: un carrito de `localStorage` escrito por otra versión con
    // `1e400` se parsea como Infinity.
    const infinito = { id: 98, name: "Infinito", sort_order: 0, price_delta: Infinity };
    expect(textoDelRecargo(infinito)).toBe("");
    expect(recargoDeLasOpciones([infinito])).toBe(0);
  });

  it("un recargo roto no escribe «+$NaN»", () => {
    expect(textoDelRecargo({ id: 99, name: "Roto", sort_order: 0, price_delta: NaN })).toBe("");
  });
});

describe("recargoTipeado", () => {
  it("vacío es sin recargo, no un error", () => {
    expect(recargoTipeado("")).toBe(0);
    expect(recargoTipeado("   ")).toBe(0);
  });

  it("«1.500» es mil quinientos, no uno con cincuenta", () => {
    // Acá los miles se escriben con punto. Leerlo como decimal guardaba
    // $1,50 donde ella quiso poner $1.500 (review de T20).
    expect(recargoTipeado("1.500")).toBe(1500);
    expect(recargoTipeado("15.000")).toBe(15000);
    expect(recargoTipeado("1.234.567")).toBe(1234567);
    expect(recargoTipeado("1.500,50")).toBe(1500.5);
  });

  it("un punto que no es de miles sigue siendo decimal", () => {
    expect(recargoTipeado("1.5")).toBe(1.5);
    expect(recargoTipeado("0.75")).toBe(0.75);
    // «0.001» es un milésimo mal escrito, no «0.001» con separador de miles:
    // leerlo como miles daba $1 en el eco del panel.
    expect(recargoTipeado("0.001")).toBe(0);
  });

  it("acepta la coma, que es como se escribe acá", () => {
    expect(recargoTipeado("500,50")).toBe(500.5);
    expect(recargoTipeado("500.50")).toBe(500.5);
  });

  it("recorta a dos decimales, que es lo que guarda la base", () => {
    expect(recargoTipeado("500,999")).toBe(501);
  });

  it("un descuento no pasa (ADR-036)", () => {
    expect(recargoTipeado("-1")).toBe(null);
  });

  it("lo que no es un número no pasa", () => {
    for (const texto of ["abc", "1e400", "$500", "--5"]) {
      expect(recargoTipeado(texto)).toBe(null);
    }
  });
});
