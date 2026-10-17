/** El número de WhatsApp sale del back (`WHATSAPP_PHONE`), no del código ni
 *  del .env del front: antes estaba en los dos lados y podían discrepar.
 *  Si no está configurado, la UI lo dice en vez de armar un link roto. */
export function linkWhatsApp(telefono: string | undefined | null, mensaje?: string) {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  if (digitos.length < 10) {
    return null;
  }
  const base = `https://wa.me/${digitos}`;
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
  {
    pregunta: "¿Por qué algunas cosas se venden de a 6?",
    respuesta:
      "Porque se hornean en tanda. Cuando un producto tiene mínimo o se vende por paquete, la ficha lo aclara y el carrito suma de a esa cantidad.",
  },
];
