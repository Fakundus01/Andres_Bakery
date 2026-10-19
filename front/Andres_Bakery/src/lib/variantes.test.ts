import { describe, expect, it } from "vitest";

import {
  MAX_VARIANTES,
  avisoDeLosTamanos,
  filasDelProducto,
  moverTamano,
  queFaltaEnLosTamanos,
  tamanosParaElPayload,
  type FilaDeVariante,
} from "./variantes";
import type { Product, ProductVariant } from "./types";

const ocho: ProductVariant = { id: 7, name: "8 porciones", price: 14200 };
const doce: ProductVariant = { id: 8, name: "12 porciones", price: 19800 };

const torta: Product = {
  id: 3,
  slug: "torta",
  name: "Torta",
  price: 6000,
  unit_label: "torta",
  min_qty: 1,
  qty_step: 1,
  category: "tortas",
  available: true,
  allows_pickup: true,
  allows_delivery: true,
  variants: [ocho, doce],
};

const fila = (name: string, price: string, id?: number): FilaDeVariante => ({ id, name, price });

describe("filasDelProducto", () => {
  it("trae los tamaños con su id, que es lo que evita el churn", () => {
    // Si los ids no viajaran, el back reemplazaría las filas y el carrito de
    // quien estaba comprando quedaría con un id que ya no existe (ADR-029).
    expect(filasDelProducto(torta)).toEqual([
      { id: 7, name: "8 porciones", price: "14200" },
      { id: 8, name: "12 porciones", price: "19800" },
    ]);
  });

  it("un producto sin tamaños no trae filas", () => {
    expect(filasDelProducto({ ...torta, variants: [] })).toEqual([]);
    expect(filasDelProducto({ ...torta, variants: undefined })).toEqual([]);
  });
});

describe("queFaltaEnLosTamanos", () => {
  it("sin tamaños no falta nada: el producto se vende por unidad", () => {
    expect(queFaltaEnLosTamanos([])).toBe("");
  });

  it("una fila recién agregada y vacía no bloquea", () => {
    // Agregar y arrepentirse no es un error que merezca un cartel.
    expect(queFaltaEnLosTamanos([fila("", "")])).toBe("");
  });

  it("un tamaño sin nombre lo dice", () => {
    expect(queFaltaEnLosTamanos([fila("", "14200")])).toContain("sin nombre");
  });

  it("un precio vacío, cero o negativo lo dice con el nombre del tamaño", () => {
    for (const precio of ["", "0", "-500", "abc"]) {
      expect(queFaltaEnLosTamanos([fila("8 porciones", precio)])).toContain("8 porciones");
    }
  });

  it("dos tamaños con el mismo nombre lo dice", () => {
    expect(
      queFaltaEnLosTamanos([fila("8 porciones", "14200"), fila("8 PORCIONES", "19800")]),
    ).toContain("se llaman igual");
  });

  it("con todo cargado no falta nada", () => {
    expect(
      queFaltaEnLosTamanos([fila("8 porciones", "14200"), fila("12 porciones", "19800")]),
    ).toBe("");
  });

  it("más de los que entran en una ficha", () => {
    const muchas = Array.from({ length: MAX_VARIANTES + 1 }, (_, i) => fila(`T${i}`, "1000"));
    expect(queFaltaEnLosTamanos(muchas)).toContain("demasiados");
  });
});

describe("tamanosParaElPayload", () => {
  it("manda el id de los que ya estaban y no manda id para el nuevo", () => {
    const payload = tamanosParaElPayload([
      fila("8 porciones", "14200", 7),
      fila("20 porciones", "28000"),
    ]);

    expect(payload).toEqual([
      { id: 7, name: "8 porciones", price: 14200, sort_order: 0 },
      { name: "20 porciones", price: 28000, sort_order: 1 },
    ]);
  });

  it("el orden sale de la pantalla, no de lo que había", () => {
    const payload = tamanosParaElPayload([fila("12", "19800", 8), fila("8", "14200", 7)]);

    expect(payload.map((t) => [t.name, t.sort_order])).toEqual([
      ["12", 0],
      ["8", 1],
    ]);
  });

  it("las filas vacías no viajan", () => {
    expect(tamanosParaElPayload([fila("8 porciones", "14200"), fila("", "")])).toHaveLength(1);
  });

  it("el precio viaja como número, con y sin decimales", () => {
    expect(tamanosParaElPayload([fila("8", "14200.50")])[0].price).toBe(14200.5);
  });

  it("el nombre viaja sin el espacio de más", () => {
    expect(tamanosParaElPayload([fila("  8 porciones  ", "14200")])[0].name).toBe("8 porciones");
  });
});

describe("moverTamano", () => {
  it("sube uno y el orden queda como se ve", () => {
    const filas = [fila("8", "1"), fila("12", "2"), fila("20", "3")];

    expect(moverTamano(filas, 2, 1).map((f) => f.name)).toEqual(["8", "20", "12"]);
  });

  it("no se puede mover afuera de la lista", () => {
    const filas = [fila("8", "1"), fila("12", "2")];

    expect(moverTamano(filas, 0, -1)).toBe(filas);
    expect(moverTamano(filas, 1, 2)).toBe(filas);
  });

  it("mover a su propio lugar no cambia nada", () => {
    const filas = [fila("8", "1")];
    expect(moverTamano(filas, 0, 0)).toBe(filas);
  });
});

describe("avisoDeLosTamanos", () => {
  it("con tamaños, avisa que el precio de arriba deja de cobrarse", () => {
    // El campo "Precio de una unidad" sigue en el formulario con su número, y
    // nada decía que ya no es lo que se cobra (ADR-029/007).
    expect(avisoDeLosTamanos([fila("8 porciones", "14200")], [])).toContain(
      "sale del tamaño elegido",
    );
  });

  it("avisa cuáles se van a borrar y qué le pasa a quien lo tenga en el carrito", () => {
    const aviso = avisoDeLosTamanos([fila("8 porciones", "14200", 7)], [ocho, doce]);

    expect(aviso).toContain("12 porciones");
    expect(aviso).toContain("elegir de nuevo");
  });

  it("si se borran todos, avisa que vuelve al precio de arriba", () => {
    expect(avisoDeLosTamanos([], [ocho])).toContain("vuelve a venderse al precio de arriba");
  });

  it("un producto que nunca tuvo tamaños no muestra aviso", () => {
    expect(avisoDeLosTamanos([], [])).toBe("");
    expect(avisoDeLosTamanos([], undefined)).toBe("");
  });
});
