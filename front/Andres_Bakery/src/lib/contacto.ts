/** El numero sale de env, nunca del codigo. Solo digitos con pais, sin + ni espacios.
 *  Si no esta configurado, la UI lo dice en vez de armar un link roto. */
const CRUDO = (import.meta.env.VITE_WHATSAPP_PHONE ?? "").replace(/\D/g, "");

export const WHATSAPP_CONFIGURADO = CRUDO.length >= 10;

export function linkWhatsApp(mensaje?: string) {
  if (!WHATSAPP_CONFIGURADO) {
    return null;
  }
  const base = `https://wa.me/${CRUDO}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/** Donde la encuentran fuera de esta web. Todavia no tiene tienda en
 *  PedidosYa (ADR-008): hasta que la tenga, no se inventa un link. */
export const PEDIDOS_YA_URL = import.meta.env.VITE_PEDIDOS_YA_URL ?? "";

export const PREGUNTAS_FRECUENTES = [
  {
    pregunta: "¿Hacen envíos?",
    respuesta:
      "Sí, dentro de Villa Maipú. En el checkout elegís envío local o retiro por el punto de entrega. El costo del envío aparece antes de confirmar.",
  },
  {
    pregunta: "¿Cómo puedo pagar?",
    respuesta:
      "Hoy el pedido se coordina por WhatsApp y el pago se arregla ahí. El pago online con Mercado Pago está preparado y se va a habilitar más adelante.",
  },
  {
    pregunta: "¿Puedo encargar algo especial?",
    respuesta:
      "Sí. Las tortas y las cajas para regalar se encargan con anticipación. Escribinos por WhatsApp con la idea, la fecha y para cuántas personas.",
  },
];
