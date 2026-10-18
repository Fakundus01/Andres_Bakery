import { describe, expect, it } from "vitest";

import { quienPidio } from "./pedidos";
import type { Order } from "./types";

function pedido(partes: Partial<Order>): Order {
  return {
    id: 7,
    status: "pending",
    channel: "whatsapp",
    total_amount: 21700,
    created_at: "2026-10-17T20:00:00",
    items: [],
    ...partes,
  } as Order;
}

describe("quienPidio", () => {
  it("un pedido de invitado muestra el nombre que dejó, no «undefined»", () => {
    // El panel usaba `order.user?.name`: la tarjeta decía "undefined · $21.700"
    // y Andrea no tenía con qué contestarle a quien le compró.
    const quien = quienPidio(
      pedido({
        user: null,
        delivery: { customer_name: "Vecina del barrio", customer_phone: "11 4455 6677" },
      } as Partial<Order>),
    );
    expect(quien.nombre).toBe("Vecina del barrio");
    expect(quien.sinCuenta).toBe(true);
    expect(quien.contacto).toEqual({
      texto: "11 4455 6677",
      href: "https://wa.me/1144556677",
    });
  });

  it("con cuenta usa lo del pedido y avisa que tiene cuenta", () => {
    const quien = quienPidio(
      pedido({
        user: { id: 2, name: "Facundo Moreno", email: "f@test.local", is_admin: false },
        delivery: { customer_name: "Facundo M.", customer_email: "f@test.local" },
      } as Partial<Order>),
    );
    expect(quien.nombre).toBe("Facundo M.");
    expect(quien.sinCuenta).toBe(false);
    expect(quien.contacto?.href).toBe("mailto:f@test.local");
  });

  it("un teléfono corto igual se muestra, para marcarlo a mano", () => {
    const quien = quienPidio(
      pedido({ user: null, delivery: { customer_name: "Ana", customer_phone: "4455-6677" } } as Partial<Order>),
    );
    expect(quien.contacto).toEqual({ texto: "4455-6677", href: "tel:44556677" });
  });

  it("sin datos no rompe la tarjeta", () => {
    const quien = quienPidio(pedido({ user: null, delivery: null } as Partial<Order>));
    expect(quien.nombre).toBe("Sin nombre");
    expect(quien.contacto).toBeNull();
  });
});
