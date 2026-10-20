import { linkWhatsApp } from "./contacto";
import { formatCurrency } from "./format";
import type { Order, OrderItemOption } from "./types";

export interface QuienPidio {
  nombre: string;
  sinCuenta: boolean;
  /** Para escribirle: WhatsApp si dejó teléfono, mail si dejó mail. */
  contacto: { texto: string; href: string } | null;
}

/** Quién hizo el pedido, mire de donde mire.
 *
 *  El panel usaba `order.user?.name`, que en un pedido de invitado es `null`:
 *  la tarjeta decía "undefined · $21.700" y no mostraba ni el teléfono. Con
 *  la ruta pública (F23) eso dejó de ser un caso raro y pasó a ser el caso
 *  normal, así que el nombre sale de donde esté. */
/** "Relleno: Chocolate (+$800)", que es lo que el pedido cobró.
 *
 *  El recargo se guarda en el renglón justamente para que el pedido de enero
 *  siga diciendo lo de enero (ADR-036), y hasta el review de T20 no se veía
 *  en ninguna pantalla: solo en el mensaje de WhatsApp, que no se guarda. */
export function textoDeLaElegida(elegida: OrderItemOption): string {
  const recargo = Number(elegida.price_delta);
  const extra =
    Number.isFinite(recargo) && recargo > 0
      ? ` (+${formatCurrency(recargo, { conCentavos: !Number.isInteger(recargo) })})`
      : "";
  return `${elegida.group_name}: ${elegida.option_name}${extra}`;
}

export function quienPidio(order: Order): QuienPidio {
  const entrega = order.delivery ?? null;
  const nombre = (entrega?.customer_name || order.user?.name || "").trim();
  const telefono = entrega?.customer_phone?.trim() || "";
  const mail = (entrega?.customer_email || order.user?.email || "").trim();

  const whatsapp = linkWhatsApp(telefono);
  let contacto: QuienPidio["contacto"] = null;
  if (telefono && whatsapp) {
    contacto = { texto: telefono, href: whatsapp };
  } else if (telefono) {
    // Un número que no sirve para `wa.me` igual se muestra: Andrea lo marca
    // desde el teléfono aunque nosotros no sepamos armarle el link.
    contacto = { texto: telefono, href: `tel:${telefono.replace(/[^\d+]/g, "")}` };
  } else if (mail) {
    contacto = { texto: mail, href: `mailto:${mail}` };
  }

  return {
    nombre: nombre || "Sin nombre",
    sinCuenta: !order.user,
    contacto,
  };
}
