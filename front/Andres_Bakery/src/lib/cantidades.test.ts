import { describe, expect, it } from "vitest";

import {
  acomodarCantidad,
  bajarCantidad,
  cantidadInicial,
  esCantidadValida,
  subirCantidad,
  textoRegla,
} from "./cantidades";
import type { Product } from "./types";

/** "Se venden de a 6": el caso real de las cookies. */
const deASeis = { min_qty: 6, qty_step: 6 };
const porUnidad = { min_qty: 1, qty_step: 1 };
/** Mínimo 3 pero se suma de a uno: mínimo y salto no son lo mismo. */
const minimoTres = { min_qty: 3, qty_step: 1 };

describe("la regla de cantidades (espejo de quantity.py)", () => {
  it("arranca en el mínimo", () => {
    expect(cantidadInicial(deASeis)).toBe(6);
    expect(cantidadInicial(porUnidad)).toBe(1);
  });

  it("deja pedir 6, 12 y 18, nunca 7", () => {
    expect(esCantidadValida(deASeis, 6)).toBe(true);
    expect(esCantidadValida(deASeis, 12)).toBe(true);
    expect(esCantidadValida(deASeis, 18)).toBe(true);
    expect(esCantidadValida(deASeis, 7)).toBe(false);
    expect(esCantidadValida(deASeis, 3)).toBe(false);
    expect(esCantidadValida(deASeis, 0)).toBe(false);
  });

  it("con mínimo 3 y salto 1 valen 3, 4 y 5", () => {
    expect(esCantidadValida(minimoTres, 3)).toBe(true);
    expect(esCantidadValida(minimoTres, 4)).toBe(true);
    expect(esCantidadValida(minimoTres, 2)).toBe(false);
  });

  it("subir y bajar saltan de a `qty_step`", () => {
    expect(subirCantidad(deASeis, 6)).toBe(12);
    expect(bajarCantidad(deASeis, 12)).toBe(6);
  });

  it("bajar por debajo del mínimo da 0, que quien llama lee como «sacar»", () => {
    expect(bajarCantidad(deASeis, 6)).toBe(0);
    expect(bajarCantidad(porUnidad, 1)).toBe(0);
  });

  it("acomoda una cantidad vieja del carrito a la regla de hoy", () => {
    // El producto pudo haber cambiado de mínimo después de guardarse.
    expect(acomodarCantidad(deASeis, 7)).toBe(6);
    expect(acomodarCantidad(deASeis, 10)).toBe(12);
    expect(acomodarCantidad(deASeis, 1)).toBe(6);
    expect(acomodarCantidad(deASeis, 0)).toBe(6);
    expect(acomodarCantidad(deASeis, -5)).toBe(6);
  });

  it("lo que acomoda siempre es válido", () => {
    for (const regla of [deASeis, porUnidad, minimoTres]) {
      for (const cantidad of [-3, 0, 1, 2, 5, 7, 13, 100]) {
        expect(esCantidadValida(regla, acomodarCantidad(regla, cantidad))).toBe(true);
      }
    }
  });

  it("aguanta un 0 o un nulo en la regla sin dividir por cero", () => {
    const rota = { min_qty: 0, qty_step: 0 };
    expect(cantidadInicial(rota)).toBe(1);
    expect(acomodarCantidad(rota, 5)).toBe(5);
    expect(esCantidadValida(rota, 5)).toBe(true);
  });
});

describe("textoRegla", () => {
  const producto = (regla: Partial<Product>) => ({ unit_label: "unidad", ...regla }) as Product;

  it("avisa el salto antes que el mínimo", () => {
    expect(textoRegla(producto({ min_qty: 6, qty_step: 6 }))).toBe("Se venden de a 6 unidad");
  });

  it("si no hay salto, avisa el mínimo", () => {
    expect(textoRegla(producto({ min_qty: 3, qty_step: 1 }))).toBe("Mínimo 3 unidad");
  });

  it("sin regla no dice nada, y la tarjeta no dibuja el cartel", () => {
    expect(textoRegla(producto({ min_qty: 1, qty_step: 1 }))).toBe("");
  });
});
