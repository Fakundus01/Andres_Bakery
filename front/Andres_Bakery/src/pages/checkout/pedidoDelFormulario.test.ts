import { describe, expect, it } from "vitest";

import type { CartItem } from "../../contexts/CartContext";
import { TOPE_NOTAS, armarPayload, queFalta, renglonDelPedido } from "./pedidoDelFormulario";
import { TOPE_NOTA } from "../../lib/carrito";

const item = { id: 3, quantity: 6 } as CartItem;

const formVacio = {
  name: "",
  email: "",
  phone: "",
  address: "",
  neighborhood: "",
  city: "General San Martín",
  notes: "",
};

const invitado = {
  ...formVacio,
  name: "Vecina del barrio",
  phone: "11 4455 6677",
  address: "Jose Hernandez 1234",
  neighborhood: "Villa Maipú",
};

describe("queFalta", () => {
  it("con el carrito vacío no se puede pedir", () => {
    expect(queFalta({ items: [], form: invitado, pagoOnline: false, isLoggedIn: false })).toContain(
      "carrito está vacío",
    );
  });

  it("sin nombre tampoco", () => {
    const sinNombre = { ...invitado, name: "   " };
    expect(
      queFalta({ items: [item], form: sinNombre, pagoOnline: false, isLoggedIn: false }),
    ).toContain("nombre");
  });

  it("sin teléfono tampoco, porque el pedido se cierra por ahí", () => {
    const sinTelefono = { ...invitado, phone: "1144" };
    expect(
      queFalta({ items: [item], form: sinTelefono, pagoOnline: false, isLoggedIn: false }),
    ).toContain("teléfono");
  });

  it("**no** pide cuenta para pedir por WhatsApp", () => {
    // Esta es la regresión que abrió T7: antes acá había una pared de login.
    expect(queFalta({ items: [item], form: invitado, pagoOnline: false, isLoggedIn: false })).toBe("");
  });

  it("pero sí para pagar online", () => {
    expect(queFalta({ items: [item], form: invitado, pagoOnline: true, isLoggedIn: false })).toContain(
      "cuenta",
    );
    expect(queFalta({ items: [item], form: invitado, pagoOnline: true, isLoggedIn: true })).toBe("");
  });

  it("avisa de la zona antes de mandar, no después de un 400", () => {
    // El barrio viene precargado pero es editable, y cada 400 gastaba un
    // intento del tope por IP.
    const lejos = { ...invitado, neighborhood: "Palermo" };
    expect(
      queFalta({
        items: [item],
        form: lejos,
        pagoOnline: false,
        isLoggedIn: false,
        zona: "Villa Maipú",
      }),
    ).toContain("Villa Maipú");
  });

  it("la zona se compara sin acentos ni mayúsculas, como en el back", () => {
    for (const barrio of ["villa maipu", "VILLA MAIPÚ", " Villa Maipu "]) {
      expect(
        queFalta({
          items: [item],
          form: { ...invitado, neighborhood: barrio },
          pagoOnline: false,
          isLoggedIn: false,
          zona: "Villa Maipú",
        }),
      ).toBe("");
    }
  });

  it("en retiro no mira el barrio", () => {
    const retiro = { ...formVacio, name: "Vecina", phone: "1144556677" };
    expect(
      queFalta({ items: [item], form: retiro, pagoOnline: false, isLoggedIn: false, zona: "Villa Maipú" }),
    ).toBe("");
  });
});

describe("armarPayload", () => {
  it("manda el producto y la cantidad del carrito", () => {
    const payload = armarPayload({
      items: [item],
      form: invitado,
      deliveryMethod: "delivery",
      paymentMethod: "mercado_pago",
      zona: "Villa Maipú",
    });
    expect(payload.items).toEqual([{ product_id: 3, quantity: 6 }]);
    expect(payload.customer).toEqual({
      name: "Vecina del barrio",
      email: undefined,
      phone: "11 4455 6677",
    });
    expect(payload.delivery.address).toBe("Jose Hernandez 1234");
  });

  it("en retiro no manda dirección y usa la zona del sitio", () => {
    const payload = armarPayload({
      items: [item],
      form: invitado,
      deliveryMethod: "pickup",
      paymentMethod: "mercado_pago",
      zona: "Villa Maipú",
    });
    expect(payload.delivery.address).toBeUndefined();
    expect(payload.delivery.neighborhood).toBe("Villa Maipú");
  });

  it("no manda el envío: lo decide el servidor", () => {
    const payload = armarPayload({
      items: [item],
      form: invitado,
      deliveryMethod: "delivery",
      paymentMethod: "mercado_pago",
    });
    expect(payload.delivery).not.toHaveProperty("shipping_amount");
  });

  it("recorta las notas al mismo tope que el back", () => {
    const payload = armarPayload({
      items: [item],
      form: { ...invitado, notes: "Z".repeat(5_000) },
      deliveryMethod: "delivery",
      paymentMethod: "mercado_pago",
    });
    expect(payload.delivery.notes).toHaveLength(TOPE_NOTAS);
  });

  it("el mail vacío no viaja como cadena vacía", () => {
    const payload = armarPayload({
      items: [item],
      form: { ...invitado, email: "   " },
      deliveryMethod: "pickup",
      paymentMethod: "mercado_pago",
    });
    expect(payload.customer.email).toBeUndefined();
  });
});

describe("renglonDelPedido", () => {
  const torta = {
    id: 3,
    quantity: 1,
    variante: { id: 7, name: "8 porciones", price: 14000 },
    opciones: [
      { id: 11, name: "Dulce de leche", sort_order: 0 },
      { id: 21, name: "Vainilla", sort_order: 0 },
    ],
    nota: "  Que diga Feliz cumple Mica  ",
    fotoDeReferencia: "/uploads/aabbccddeeff00112233445566778899.jpg",
  } as CartItem;

  it("manda el tamaño elegido por id, nunca el precio", () => {
    // El precio lo pone el servidor a partir del id (ADR-029): si viajara
    // desde acá, cualquiera lo edita antes de mandarlo.
    const renglon = renglonDelPedido(torta);

    expect(renglon.variant_id).toBe(7);
    expect(Object.keys(renglon)).not.toContain("price");
    expect(Object.keys(renglon)).not.toContain("unit_price");
  });

  it("manda los sabores elegidos por id", () => {
    expect(renglonDelPedido(torta).option_ids).toEqual([11, 21]);
  });

  it("manda también el sabor que la pantalla mostró, como testigo", () => {
    // El id solo no alcanza: los rowid se reusan, así que el id del carrito
    // puede caer sobre otro sabor con otro precio (review de T20). Es el
    // mismo testigo que ya manda el tamaño.
    const conRecargo = {
      ...torta,
      opciones: [{ id: 11, name: "Dulce de leche", sort_order: 0, price_delta: 800 }],
    } as CartItem;

    expect(renglonDelPedido(conRecargo).options_seen).toEqual([
      { id: 11, name: "Dulce de leche", price_delta: 800 },
    ]);
  });

  it("el testigo dice 0 cuando el sabor no tiene recargo", () => {
    expect(renglonDelPedido(torta).options_seen).toEqual([
      { id: 11, name: "Dulce de leche", price_delta: 0 },
      { id: 21, name: "Vainilla", price_delta: 0 },
    ]);
  });

  it("sin sabores no manda testigos", () => {
    const simple = { id: 9, quantity: 6 } as CartItem;
    expect(Object.keys(renglonDelPedido(simple))).not.toContain("options_seen");
  });

  it("la nota viaja sin el espacio de más y acotada", () => {
    expect(renglonDelPedido(torta).note).toBe("Que diga Feliz cumple Mica");
    expect(renglonDelPedido({ ...torta, nota: "A".repeat(500) } as CartItem).note).toHaveLength(
      TOPE_NOTA,
    );
  });

  it("manda la foto de referencia tal como la emitió el servidor", () => {
    expect(renglonDelPedido(torta).reference_image).toBe(
      "/uploads/aabbccddeeff00112233445566778899.jpg",
    );
  });

  it("un producto sin personalizar manda solo producto y cantidad", () => {
    // Un `note: ""` o un `option_ids: []` serían ruido en el pedido de quien
    // compró una docena de cookies.
    expect(renglonDelPedido({ id: 9, quantity: 12 } as CartItem)).toEqual({
      product_id: 9,
      quantity: 12,
    });
  });

  it("una nota de solo espacios no viaja", () => {
    expect(renglonDelPedido({ id: 9, quantity: 1, nota: "   " } as CartItem).note).toBeUndefined();
  });

  it("el payload entero lleva los renglones armados", () => {
    const payload = armarPayload({
      items: [torta],
      form: invitado,
      deliveryMethod: "pickup",
      paymentMethod: "mercado_pago",
    });

    expect(payload.items[0].variant_id).toBe(7);
    expect(payload.items[0].option_ids).toEqual([11, 21]);
  });
});
