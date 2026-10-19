import { describe, expect, it } from "vitest";

import {
  claveDelRenglon,
  esPersonalizable,
  estadoDeLaEtiqueta,
  notaParaElPedido,
  precioDesde,
  grupoDeLaOpcion,
  mismaConfiguracion,
  opcionesElegidas,
  precioDelRenglon,
  queFaltaElegir,
  sePersonaliza,
  subtotalDelCarrito,
} from "./carrito";
import type { OptionGroup, Product, ProductVariant, Tag } from "./types";

const ocho: ProductVariant = { id: 7, name: "8 porciones", price: 14000 };
const doce: ProductVariant = { id: 8, name: "12 porciones", price: 19000 };

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

const bizcocho: OptionGroup = {
  id: 2,
  name: "Bizcocho",
  required: true,
  sort_order: 1,
  options: [{ id: 21, name: "Vainilla", sort_order: 0 }],
};

const cobertura: OptionGroup = {
  id: 3,
  name: "Cobertura",
  required: false,
  sort_order: 2,
  options: [{ id: 31, name: "Ganache", sort_order: 0 }],
};

/** La etiqueta que habilita la personalización. Sin ella, la ficha no ofrece
 *  sabores ni foto y el back rechaza esos campos. */
const etiquetaDeTortas: Tag = {
  id: 1,
  name: "tortas personalizadas",
  slug: "tortas-personalizadas",
  color_token: "acento",
  sort_order: 0,
};

const torta: Product = {
  id: 3,
  slug: "torta-de-chocolate",
  name: "Torta de chocolate",
  price: 6000,
  unit_label: "unidad",
  min_qty: 1,
  qty_step: 1,
  category: "tortas",
  available: true,
  allows_pickup: true,
  allows_delivery: true,
  variants: [ocho, doce],
  option_groups: [relleno, bizcocho],
  tags: [etiquetaDeTortas],
};

const cookies: Product = {
  ...torta,
  id: 9,
  slug: "cookies",
  name: "Cookies",
  variants: [],
  option_groups: [],
  tags: [],
};

describe("claveDelRenglon", () => {
  it("un producto pelado y el mismo producto sin variante son el mismo renglón", () => {
    // Es lo que deja seguir andando un carrito guardado antes de F19a: no
    // tiene variante, cae en la forma "sin nada" y no se vacía.
    expect(claveDelRenglon({ id: 3, price: 6000 })).toBe(
      claveDelRenglon({ id: 3, price: 6000, variante: null, opciones: [] }),
    );
  });

  it("dos tamaños de la misma torta son dos renglones", () => {
    expect(claveDelRenglon({ id: 3, price: 6000, variante: ocho })).not.toBe(
      claveDelRenglon({ id: 3, price: 6000, variante: doce }),
    );
  });

  it("dos rellenos distintos son dos renglones", () => {
    expect(
      claveDelRenglon({ id: 3, price: 6000, opciones: [relleno.options[0]] }),
    ).not.toBe(claveDelRenglon({ id: 3, price: 6000, opciones: [relleno.options[1]] }));
  });

  it("el orden en que se eligieron los sabores no hace dos renglones", () => {
    const uno = { id: 3, price: 6000, opciones: [relleno.options[0], bizcocho.options[0]] };
    const otro = { id: 3, price: 6000, opciones: [bizcocho.options[0], relleno.options[0]] };

    expect(mismaConfiguracion(uno, otro)).toBe(true);
  });

  it("cambiar una coma en la nota hace un renglón nuevo", () => {
    // Son dos tortas distintas para quien las hace.
    expect(claveDelRenglon({ id: 3, price: 6000, nota: "en azul" })).not.toBe(
      claveDelRenglon({ id: 3, price: 6000, nota: "en azul," }),
    );
  });

  it("el espacio de más alrededor de la nota no cuenta", () => {
    expect(
      mismaConfiguracion(
        { id: 3, price: 6000, nota: "  en azul " },
        { id: 3, price: 6000, nota: "en azul" },
      ),
    ).toBe(true);
  });

  it("una nota con dos puntos no puede fingir la clave de otro renglón", () => {
    // El motivo de usar JSON y no `${a}:${b}`: la nota la escribe el cliente.
    const conNota = claveDelRenglon({ id: 3, price: 6000, nota: '0:[]:"":""' });
    const sinNota = claveDelRenglon({ id: 3, price: 6000 });

    expect(conNota).not.toBe(sinNota);
  });

  it("dos fotos distintas son dos renglones", () => {
    expect(claveDelRenglon({ id: 3, price: 6000, fotoDeReferencia: "/uploads/a.jpg" })).not.toBe(
      claveDelRenglon({ id: 3, price: 6000, fotoDeReferencia: "/uploads/b.jpg" }),
    );
  });
});

describe("precioDelRenglon", () => {
  it("con variante elegida vale la variante, no el precio base", () => {
    // El agujero de plata que cerró F19a: el cliente veía $14.000 y se
    // cobraba $6.000.
    expect(precioDelRenglon({ id: 3, price: 6000, variante: ocho })).toBe(14000);
  });

  it("sin variante vale el precio base", () => {
    expect(precioDelRenglon({ id: 3, price: 6000 })).toBe(6000);
  });

  it("los sabores no mueven el precio (ADR-031)", () => {
    expect(
      precioDelRenglon({ id: 3, price: 6000, opciones: [relleno.options[0], bizcocho.options[0]] }),
    ).toBe(6000);
  });
});

describe("subtotalDelCarrito", () => {
  it("suma el precio del renglón, no el del producto", () => {
    const total = subtotalDelCarrito([
      { id: 3, price: 6000, variante: ocho, quantity: 1 },
      { id: 3, price: 6000, variante: doce, quantity: 2 },
      { id: 9, price: 1500, quantity: 6 },
    ]);

    expect(total).toBe(14000 + 19000 * 2 + 1500 * 6);
  });

  it("un carrito vacío suma cero", () => {
    expect(subtotalDelCarrito([])).toBe(0);
  });
});
