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

/** Un grupo donde un sabor cuesta mas y el otro no (F61, ADR-036). */
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

  it("un sabor sin recargo no mueve el precio", () => {
    expect(
      precioDelRenglon({ id: 3, price: 6000, opciones: [relleno.options[0], bizcocho.options[0]] }),
    ).toBe(6000);
  });

  it("el sabor con recargo lo suma al tamaño elegido (ADR-036)", () => {
    expect(
      precioDelRenglon({
        id: 3,
        price: 6000,
        variante: ocho,
        opciones: [bizcochoConRecargo.options[1]],
      }),
    ).toBe(15200);
  });

  it("dos sabores con recargo suman los dos", () => {
    expect(
      precioDelRenglon({
        id: 3,
        price: 6000,
        opciones: [bizcochoConRecargo.options[1], { id: 55, name: "Ganache", sort_order: 0, price_delta: 800 }],
      }),
    ).toBe(8000);
  });

  it("un renglón guardado antes de los recargos vale su precio y no NaN", () => {
    // El carrito de `localStorage` no se vacía (la tarjeta lo dice): sus
    // sabores no tienen `price_delta`, y eso se lee como cero.
    expect(
      precioDelRenglon({ id: 3, price: 6000, variante: ocho, opciones: [relleno.options[0]] }),
    ).toBe(14000);
  });

  it("un recargo infinito no vuelve infinito el precio", () => {
    // Un carrito de `localStorage` con `1e400` se parsea como Infinity.
    const infinito = { id: 98, name: "Infinito", sort_order: 0, price_delta: Infinity };
    expect(precioDelRenglon({ id: 3, price: 6000, opciones: [infinito] })).toBe(6000);
  });

  it("un recargo que no es un número no se cobra", () => {
    // Lo que llega de `localStorage` lo escribió otra versión del front: si
    // ahí hay un texto o un NaN, el total no puede volverse NaN.
    const roto = { id: 99, name: "Roto", sort_order: 0, price_delta: NaN };
    expect(precioDelRenglon({ id: 3, price: 6000, opciones: [roto] })).toBe(6000);
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

  it("el recargo del sabor entra en el subtotal, por cantidad", () => {
    const total = subtotalDelCarrito([
      { id: 3, price: 6000, variante: ocho, opciones: [bizcochoConRecargo.options[1]], quantity: 2 },
    ]);

    expect(total).toBe((14000 + 1200) * 2);
  });

  it("un carrito vacío suma cero", () => {
    expect(subtotalDelCarrito([])).toBe(0);
  });
});

describe("precioDesde", () => {
  const conGrupos = (grupos: OptionGroup[]): Product => ({
    ...torta,
    variants: [ocho, doce],
    option_groups: grupos,
  });

  it("sin grupos obligatorios es el tamaño más barato", () => {
    expect(precioDesde(conGrupos([cobertura]))).toBe(14000);
  });

  it("un grupo obligatorio donde todo tiene recargo sube el mínimo", () => {
    // Si «Bizcocho» es obligatorio y los dos sabores cuestan más, no hay
    // forma de comprar a $14.000 y la tarjeta no puede decir que sí.
    const todoCaro: OptionGroup = {
      ...bizcochoConRecargo,
      options: [
        { id: 41, name: "Vainilla", sort_order: 0, price_delta: 300 },
        { id: 42, name: "Red velvet", sort_order: 1, price_delta: 1200 },
      ],
    };
    expect(precioDesde(conGrupos([todoCaro]))).toBe(14300);
  });

  it("si el grupo obligatorio tiene un sabor sin recargo, el mínimo no se mueve", () => {
    expect(precioDesde(conGrupos([bizcochoConRecargo]))).toBe(14000);
  });

  it("un grupo opcional caro no mueve el mínimo", () => {
    const opcionalCaro: OptionGroup = {
      ...bizcochoConRecargo,
      required: false,
      options: [{ id: 43, name: "Oro", sort_order: 0, price_delta: 9000 }],
    };
    expect(precioDesde(conGrupos([opcionalCaro]))).toBe(14000);
  });

  it("un grupo obligatorio todavía sin sabores no inventa un recargo", () => {
    const vacio: OptionGroup = { ...bizcochoConRecargo, options: [] };
    expect(precioDesde(conGrupos([vacio]))).toBe(14000);
  });
});
