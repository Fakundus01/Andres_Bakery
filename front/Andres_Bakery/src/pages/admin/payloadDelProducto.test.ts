import { describe, expect, it } from "vitest";

import { payloadDeLaEtiqueta, payloadDelProducto } from "./payloadDelProducto";
import { formularioDeProductoVacio, formularioDesdeProducto } from "./valoresIniciales";
import type { Product } from "../../lib/types";

const torta: Product = {
  id: 3,
  slug: "torta",
  name: "Torta de chocolate",
  description: "La de siempre",
  steps: null,
  prep_note: null,
  price: 6000,
  unit_label: "torta",
  min_qty: 1,
  qty_step: 1,
  category: "tortas",
  image_url: "/uploads/aabbccddeeff00112233445566778899.jpg",
  available: true,
  allows_pickup: true,
  allows_delivery: true,
  tags: [{ id: 1, name: "Por encargo", slug: "por-encargo", color_token: "acento", sort_order: 0 }],
  ingredients: [{ id: 5, name: "Chocolate" }],
  option_groups: [{ id: 2, name: "Relleno", required: true, sort_order: 0, options: [] }],
  variants: [
    { id: 7, name: "8 porciones", price: 14200 },
    { id: 8, name: "12 porciones", price: 19800 },
  ],
};

describe("formularioDesdeProducto", () => {
  it("trae los tamaños con su id, que es lo que evita romper carritos", () => {
    // Sin los ids, cada guardado reemplaza las filas y el `variant_id` que
    // alguien tiene en el carrito deja de existir (ADR-029 parte 3).
    expect(formularioDesdeProducto(torta).variants).toEqual([
      { id: 7, name: "8 porciones", price: "14200" },
      { id: 8, name: "12 porciones", price: "19800" },
    ]);
  });

  it("los números del producto llegan como texto, que es lo que el input espera", () => {
    const form = formularioDesdeProducto(torta);

    expect(form.price).toBe("6000");
    expect(form.min_qty).toBe("1");
  });

  it("lo que puede venir nulo llega vacío y no como «null»", () => {
    const form = formularioDesdeProducto({ ...torta, description: null, image_url: null });

    expect(form.description).toBe("");
    expect(form.image_url).toBe("");
  });

  it("las relaciones llegan como ids", () => {
    const form = formularioDesdeProducto(torta);

    expect(form.tag_ids).toEqual([1]);
    expect(form.ingredient_ids).toEqual([5]);
    expect(form.option_group_ids).toEqual([2]);
  });
});

describe("payloadDelProducto", () => {
  it("la vuelta completa no pierde ni cambia nada", () => {
    // Editar un producto y guardarlo sin tocar nada tiene que mandar lo mismo
    // que estaba: es el caso que más se va a usar del panel.
    const payload = payloadDelProducto(formularioDesdeProducto(torta));

    expect(payload.price).toBe(6000);
    expect(payload.variants).toEqual([
      { id: 7, name: "8 porciones", price: 14200, sort_order: 0 },
      { id: 8, name: "12 porciones", price: 19800, sort_order: 1 },
    ]);
    expect(payload.option_group_ids).toEqual([2]);
  });

  it("el mínimo y el salto vacíos valen 1, no cero", () => {
    // "Se vende de a 0" no existe, y un 0 ahí es un 400 del back.
    const payload = payloadDelProducto({
      ...formularioDeProductoVacio,
      price: "1500",
      min_qty: "",
      qty_step: "",
    });

    expect(payload.min_qty).toBe(1);
    expect(payload.qty_step).toBe(1);
  });

  it("un producto sin tamaños manda la lista vacía", () => {
    // Que es lo que borra los que tenía, y es lo que la pantalla avisa antes.
    expect(payloadDelProducto(formularioDeProductoVacio).variants).toEqual([]);
  });

  it("el precio con decimales no se redondea solo", () => {
    const payload = payloadDelProducto({ ...formularioDeProductoVacio, price: "1500.50" });

    expect(payload.price).toBe(1500.5);
  });
});

describe("payloadDeLaEtiqueta", () => {
  it("el orden vacío es 0 y no NaN", () => {
    const payload = payloadDeLaEtiqueta({ name: "sin TACC", color_token: "acento", sort_order: "" });

    expect(payload.sort_order).toBe(0);
  });

  it("el orden cargado viaja como número", () => {
    const payload = payloadDeLaEtiqueta({ name: "sin TACC", color_token: "acento", sort_order: "3" });

    expect(payload.sort_order).toBe(3);
  });
});
