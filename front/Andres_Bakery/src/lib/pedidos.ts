import { linkWhatsApp } from "./contacto";
import type { Order } from "./types";

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
