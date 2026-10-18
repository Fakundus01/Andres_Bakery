import { describe, expect, it } from "vitest";

import type { CartItem } from "../../contexts/CartContext";
import { TOPE_NOTAS, armarPayload, queFalta } from "./pedidoDelFormulario";

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
