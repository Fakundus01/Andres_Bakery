import { describe, expect, it } from "vitest";

import { buscarIngrediente, estadoDelSugerido, limpiarNombre, normalizar } from "./ingredientes";
import type { Ingredient } from "./types";

const lista: Ingredient[] = [
  { id: 1, name: "Chocolate semiamargo", unit: "g" },
  { id: 2, name: "Azúcar impalpable", unit: "g" },
  { id: 3, name: "Harina 0000", unit: "g" },
  { id: 4, name: "Dulce de leche repostero", unit: "g" },
];

describe("normalizar", () => {
  it("ignora mayúsculas, acentos y espacios de más", () => {
    expect(normalizar("  AZÚCAR   impalpable ")).toBe("azucar impalpable");
    expect(normalizar("Harina 0000")).toBe("harina 0000");
  });

  it("conserva la ñ, que no es una n con acento", () => {
    // Si la barriéramos junto con los acentos, "Piña" y "Pina" serían el
    // mismo ingrediente y uno de los dos nombres desaparecería de la lista
    // de Andrea sin que nadie lo haya decidido.
    expect(normalizar("Piña")).toBe("piña");
    expect(normalizar("PIÑA")).toBe("piña");
    expect(normalizar("Piña")).not.toBe(normalizar("Pina"));
  });

  it("los caracteres invisibles no alcanzan para colarse dos veces", () => {
    // Un espacio de ancho cero o un guión suave no se ven, así que "Azúcar"
    // con un ZWSP adentro se ve igual que "Azúcar" y sería un duplicado que
    // nadie puede distinguir mirando la lista.
    expect(normalizar("Az​úcar")).toBe("azucar");
    expect(normalizar("Azú­car")).toBe("azucar");
    expect(normalizar("﻿Azúcar")).toBe("azucar");
  });

  it("sin nombre devuelve vacío", () => {
    expect(normalizar("")).toBe("");
    expect(normalizar("   ")).toBe("");
    expect(normalizar(null)).toBe("");
    expect(normalizar(undefined)).toBe("");
  });
});

describe("buscarIngrediente", () => {
  it("encuentra el que ya existe aunque la IA lo escriba distinto", () => {
    // Este es el punto de la función: la IA escribe "azucar impalpable" y en
    // la base está "Azúcar impalpable". Crear el duplicado le ensucia la
    // lista a Andrea para siempre.
    expect(buscarIngrediente(lista, "azucar impalpable")?.id).toBe(2);
    expect(buscarIngrediente(lista, "CHOCOLATE SEMIAMARGO")?.id).toBe(1);
    expect(buscarIngrediente(lista, "  harina 0000  ")?.id).toBe(3);
  });

  it("no inventa coincidencias parciales", () => {
    // "Chocolate" no es "Chocolate semiamargo": son dos ingredientes y los
    // decide ella, no un `includes`.
    expect(buscarIngrediente(lista, "Chocolate")).toBeNull();
    expect(buscarIngrediente(lista, "Harina")).toBeNull();
    expect(buscarIngrediente(lista, "Manteca")).toBeNull();
  });

  it("sin nombre devuelve null en vez del primero de la lista", () => {
    expect(buscarIngrediente(lista, "")).toBeNull();
    expect(buscarIngrediente(lista, "   ")).toBeNull();
    expect(buscarIngrediente(lista, null)).toBeNull();
    expect(buscarIngrediente([], "Chocolate semiamargo")).toBeNull();
  });
});

describe("estadoDelSugerido", () => {
  it("distingue el que ya está marcado del que solo existe", () => {
    expect(estadoDelSugerido(lista, [2], "azucar impalpable")).toEqual({
      estado: "elegido",
      ingrediente: lista[1],
    });
    expect(estadoDelSugerido(lista, [1], "azucar impalpable")).toEqual({
      estado: "existe",
      ingrediente: lista[1],
    });
  });

  it("lo que no existe es nuevo y hay que crearlo", () => {
    expect(estadoDelSugerido(lista, [1, 2], "Manteca")).toEqual({
      estado: "nuevo",
      ingrediente: null,
    });
  });
});

describe("limpiarNombre", () => {
  it("guarda el nombre prolijo, respetando cómo lo escribió ella", () => {
    // `normalizar` es para COMPARAR; esto es para GUARDAR. Las mayúsculas y
    // los acentos son de ella y no se tocan: lo único que se saca es el
    // espacio de más, que si no queda escrito en la lista para siempre.
    expect(limpiarNombre("  Harina   0000  ")).toBe("Harina 0000");
    expect(limpiarNombre("Dulce de Leche")).toBe("Dulce de Leche");
    expect(limpiarNombre("Azú­car")).toBe("Azúcar");
  });

  it("no deja pasar lo que no es un nombre", () => {
    expect(limpiarNombre("   ")).toBe("");
    expect(limpiarNombre("​")).toBe("");
  });
});
