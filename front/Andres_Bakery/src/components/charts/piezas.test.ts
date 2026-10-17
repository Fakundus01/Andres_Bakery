import { describe, expect, it } from "vitest";

import { ejeY, formatoCorto, ticksDelEje } from "./piezas";

describe("ejeY (el techo del eje)", () => {
  it("nunca queda por debajo del máximo", () => {
    for (const maximo of [0.5, 1, 3, 7, 42, 99, 101, 1234, 9999, 150000]) {
      expect(ejeY(maximo)).toBeGreaterThanOrEqual(maximo);
    }
  });

  it("redondea a números limpios", () => {
    expect(ejeY(7)).toBe(8);
    expect(ejeY(42)).toBe(60);
    expect(ejeY(101)).toBe(200);
    expect(ejeY(1234)).toBe(2000);
  });

  it("sin datos el techo es 0 y el gráfico dibuja la base", () => {
    expect(ejeY(0)).toBe(0);
    expect(ejeY(-5)).toBe(0);
  });
});

describe("ticksDelEje (las marcas del eje)", () => {
  it("todas las marcas de una serie de enteros son enteras", () => {
    // Regresión: con techo 5 la línea del medio valía 2,5 y la etiqueta la
    // redondeaba a "3". La línea decía un número y estaba en otro.
    for (const maximo of [1, 2, 3, 4, 5, 7, 8, 13, 20, 42, 99, 101]) {
      for (const marca of ticksDelEje(maximo)) {
        expect(Number.isInteger(marca), `maximo ${maximo} dio la marca ${marca}`).toBe(true);
      }
    }
  });

  it("arranca en cero y llega hasta el máximo", () => {
    for (const maximo of [1, 4, 42, 9600, 150000]) {
      const marcas = ticksDelEje(maximo);
      expect(marcas[0]).toBe(0);
      expect(marcas[marcas.length - 1]).toBeGreaterThanOrEqual(maximo);
    }
  });

  it("los pasos son todos iguales", () => {
    for (const maximo of [3, 7, 42, 1234, 9600]) {
      const marcas = ticksDelEje(maximo);
      const pasos = marcas.slice(1).map((m, i) => Number((m - marcas[i]).toPrecision(12)));
      expect(new Set(pasos).size).toBe(1);
    }
  });

  it("no dibuja una grilla de veinte líneas", () => {
    for (const maximo of [1, 7, 42, 999, 1234, 150000]) {
      expect(ticksDelEje(maximo).length).toBeLessThanOrEqual(5);
    }
  });

  it("sin datos hay una sola marca, la base", () => {
    expect(ticksDelEje(0)).toEqual([0]);
    expect(ticksDelEje(-3)).toEqual([0]);
  });

  it("no arrastra basura de coma flotante", () => {
    for (const maximo of [0.3, 3, 7, 0.7]) {
      for (const marca of ticksDelEje(maximo)) {
        expect(String(marca)).not.toMatch(/0000000|9999999/);
      }
    }
  });
});

describe("formatoCorto", () => {
  it("abrevia los miles", () => {
    expect(formatoCorto(1500)).toBe("1.5K");
    expect(formatoCorto(12000)).toBe("12K");
  });

  it("los números chicos van enteros", () => {
    expect(formatoCorto(0)).toBe("0");
    expect(formatoCorto(7)).toBe("7");
    expect(formatoCorto(999)).toBe("999");
  });

  it("en pesos, los miles se abrevian con el signo", () => {
    expect(formatoCorto(14200, true)).toBe("$14K");
  });

  it("en pesos, lo chico va con el formato de moneda completo", () => {
    expect(formatoCorto(500, true)).toContain("500");
  });
});
