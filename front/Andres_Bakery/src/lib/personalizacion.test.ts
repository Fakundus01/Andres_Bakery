/** Lo que decide qué se personaliza y qué se elige (F57, F58, ADR-033).
 *
 *  Salió de , que pasó las 300 líneas al entrar los tests
 *  que pidió el review de T18 (R05). Las fixtures se repiten a propósito:
 *  un archivo de tests que depende de otro archivo de tests es peor.
 */
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

describe("esPersonalizable", () => {
  it("lo decide la etiqueta, no los grupos", () => {
    // Si fuera por los grupos, asignarle "Relleno" por error a una docena de
    // cookies las convertiría en algo que no se puede pedir sin relleno.
    expect(esPersonalizable(torta)).toBe(true);
    expect(esPersonalizable({ ...torta, tags: [] })).toBe(false);
    expect(esPersonalizable({ ...cookies, option_groups: [relleno] })).toBe(false);
  });

  it("otra etiqueta no habilita nada", () => {
    const otra: Tag = { ...etiquetaDeTortas, id: 2, name: "Por encargo", slug: "por-encargo" };

    expect(esPersonalizable({ ...torta, tags: [otra] })).toBe(false);
  });

  it("sin etiquetas tampoco", () => {
    expect(esPersonalizable({ ...torta, tags: undefined })).toBe(false);
  });
});

describe("sePersonaliza", () => {
  it("una torta a pedido se arma en la ficha", () => {
    expect(sePersonaliza(torta)).toBe(true);
    expect(sePersonaliza({ ...torta, variants: [] })).toBe(true);
  });

  it("un producto con tamaños también, aunque no se personalice", () => {
    // Vender por tamaños es de la carta (ADR-007): el precio depende del
    // tamaño elegido, así que hay que elegirlo antes de agregar.
    expect(sePersonaliza({ ...cookies, variants: [ocho] })).toBe(true);
  });

  it("lo que se vende tal cual se agrega desde la tarjeta", () => {
    expect(sePersonaliza(cookies)).toBe(false);
    expect(sePersonaliza({ ...cookies, option_groups: [relleno] })).toBe(false);
    expect(sePersonaliza({ ...cookies, variants: undefined, option_groups: undefined })).toBe(false);
  });
});

describe("queFaltaElegir", () => {
  it("nombra los grupos obligatorios sin elegir", () => {
    expect(queFaltaElegir([relleno, bizcocho], {})).toBe("Falta elegir: Relleno, Bizcocho.");
  });

  it("el opcional no bloquea", () => {
    expect(queFaltaElegir([cobertura], {})).toBe("");
  });

  it("con todo elegido no falta nada", () => {
    expect(queFaltaElegir([relleno, bizcocho], { 1: 11, 2: 21 })).toBe("");
  });

  it("sin grupos no falta nada", () => {
    expect(queFaltaElegir(undefined, {})).toBe("");
  });
});

describe("opcionesElegidas", () => {
  it("devuelve las elegidas en el orden que les puso la chef", () => {
    const elegidas = opcionesElegidas([bizcocho, relleno], { 1: 12, 2: 21 });

    expect(elegidas.map((opcion) => opcion.name)).toEqual(["Chocolate", "Vainilla"]);
  });

  it("ignora un id que no es de ningún grupo del producto", () => {
    expect(opcionesElegidas([relleno], { 1: 999 })).toEqual([]);
  });
});

describe("grupoDeLaOpcion", () => {
  it("encuentra el grupo para poder mostrar «Relleno: Chocolate»", () => {
    expect(grupoDeLaOpcion([relleno, bizcocho], 12)).toBe("Relleno");
    expect(grupoDeLaOpcion([relleno, bizcocho], 21)).toBe("Bizcocho");
  });

  it("una opción que ya no existe no rompe la pantalla", () => {
    expect(grupoDeLaOpcion([relleno], 999)).toBe("");
    expect(grupoDeLaOpcion(undefined, 11)).toBe("");
  });
});

describe("notaParaElPedido", () => {
  it("manda la nota en una línea, con el separador que usa el back", () => {
    expect(notaParaElPedido("Feliz cumple\nMica\nen azul")).toBe("Feliz cumple · Mica · en azul");
  });

  it("cuenta lo que el servidor va a medir, no lo tipeado", () => {
    // Cada salto viaja como " · " y ocupa tres: el contador de la pantalla
    // decía que entraba y el back recortaba hasta 198 caracteres.
    expect(notaParaElPedido("a\nb").length).toBe("a · b".length);
  });

  it("los saltos repetidos y el espacio de más no inflan la cuenta", () => {
    expect(notaParaElPedido("a\n\n\nb")).toBe("a · b");
    expect(notaParaElPedido("  a   b  ")).toBe("a b");
  });

  it("sin nota no hay nada que mandar", () => {
    expect(notaParaElPedido("")).toBe("");
    expect(notaParaElPedido(null)).toBe("");
    expect(notaParaElPedido("   \n  ")).toBe("");
  });
});

describe("precioDesde", () => {
  it("con tamaños, el más barato", () => {
    // La carta mostraba el precio base, que con tamaños puede no ser
    // comprable: entrar a la ficha y ver otro número es una sorpresa fea.
    expect(precioDesde(torta)).toBe(14000);
  });

  it("sin tamaños, el precio del producto", () => {
    expect(precioDesde(cookies)).toBe(6000);
  });

  it("el orden de los tamaños no importa", () => {
    expect(precioDesde({ ...torta, variants: [doce, ocho] })).toBe(14000);
  });
});

describe("estadoDeLaEtiqueta", () => {
  const buena: Tag = etiquetaDeTortas;
  const parecida: Tag = {
    id: 9,
    name: "Tortas Personalizadas",
    slug: "tortas-personalizadas-2",
    color_token: "acento",
    sort_order: 0,
  };
  const otra: Tag = { ...parecida, id: 10, name: "Por encargo", slug: "por-encargo" };

  it("con la buena marcada, el producto se personaliza", () => {
    expect(estadoDeLaEtiqueta([buena, otra], [buena.id])).toEqual({ etiquetada: true });
  });

  it("una que se llama igual pero tiene otro slug no habilita, y se nombra", () => {
    // El caso del review de T18: lo que manda es el slug, así que decirle
    // "no la tiene" sobre una que sí marcó sería volverla loca.
    expect(estadoDeLaEtiqueta([buena, parecida], [parecida.id])).toEqual({
      etiquetada: false,
      parecida: "Tortas Personalizadas",
    });
  });

  it("sin ninguna marcada no hay parecida que nombrar", () => {
    expect(estadoDeLaEtiqueta([buena, otra], [otra.id])).toEqual({
      etiquetada: false,
      parecida: undefined,
    });
  });

  it("si están las dos, gana la que habilita", () => {
    expect(estadoDeLaEtiqueta([buena, parecida], [buena.id, parecida.id])).toEqual({
      etiquetada: true,
    });
  });
});
