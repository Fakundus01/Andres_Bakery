import { describe, expect, it } from "vitest";

import { PREFERENCIAS_POR_DEFECTO, sanear } from "./PreferencesProvider";

describe("sanear (lo que viene de localStorage)", () => {
  it("deja pasar lo que es válido", () => {
    const guardado = {
      tema: "invierno",
      tipografia: "redonda",
      escala: "grande",
      navModo: "drawer",
      panelLateral: "hover",
    };

    expect(sanear(guardado)).toEqual(guardado);
  });

  it("un id que ya no existe cae al default en vez de romper la pantalla", () => {
    const resultado = sanear({ tema: "apocalipsis", escala: "gigante" });

    expect(resultado.tema).toBe(PREFERENCIAS_POR_DEFECTO.tema);
    expect(resultado.escala).toBe(PREFERENCIAS_POR_DEFECTO.escala);
  });

  it("completa lo que falta y descarta lo que sobra", () => {
    const resultado = sanear({ tema: "verano", loQueSea: "chau" });

    expect(resultado.tema).toBe("verano");
    expect(resultado.navModo).toBe(PREFERENCIAS_POR_DEFECTO.navModo);
    expect(resultado).not.toHaveProperty("loQueSea");
  });

  it("cualquier basura da las preferencias por defecto", () => {
    for (const basura of [null, undefined, "", 42, [], "{roto", true]) {
      expect(sanear(basura)).toEqual(PREFERENCIAS_POR_DEFECTO);
    }
  });

  it("el panel lateral arranca abierto: esconderse es la opción, no el default", () => {
    expect(PREFERENCIAS_POR_DEFECTO.panelLateral).toBe("fijo");
    expect(sanear({}).panelLateral).toBe("fijo");
  });

  it("siempre devuelve las cinco claves, pase lo que pase", () => {
    const claves = Object.keys(PREFERENCIAS_POR_DEFECTO).sort();
    for (const entrada of [{}, null, { tema: "otono" }, { navModo: "inventado" }]) {
      expect(Object.keys(sanear(entrada)).sort()).toEqual(claves);
    }
  });
});
