import type { CartItem } from "../../contexts/CartContext";
import { TOPE_NOTA, notaParaElPedido } from "../../lib/carrito";
import type {
  DeliveryMethod,
  OrderCreationPayload,
  OrderItemPayload,
  PaymentMethod,
} from "../../lib/types";

export interface FormularioDeCheckout {
  name: string;
  email: string;
  phone: string;
  address: string;
  neighborhood: string;
  city: string;
  notes: string;
}

/** Mismo mínimo que valida el back; acá es solo para avisar antes de mandar. */
const MINIMO_DIGITOS = 8;

/** Tope de las notas, igual que `TOPE_NOTAS` del back. Si se pasa, el
 *  servidor las recorta: mejor que el formulario no deje llegar hasta ahí. */
export const TOPE_NOTAS = 500;

interface Contexto {
  items: CartItem[];
  form: FormularioDeCheckout;
  pagoOnline: boolean;
  isLoggedIn: boolean;
  zona?: string;
}

/** Lo que falta para poder mandar el pedido, o "" si está todo.
 *
 *  Vive afuera del hook para poder probarlo sin montar React: es la decisión
 *  de si alguien puede comprar o no. */
export function queFalta({ items, form, pagoOnline, isLoggedIn, zona }: Contexto): string {
  if (!items.length) return "Tu carrito está vacío.";
  if (!form.name.trim()) return "Necesitamos tu nombre para el pedido.";

  if (!pagoOnline && form.phone.replace(/\D/g, "").length < MINIMO_DIGITOS) {
    return "Necesitamos un teléfono de contacto: el pedido se cierra por WhatsApp.";
  }
  if (pagoOnline && !isLoggedIn) {
    return "Para pagar online necesitás una cuenta.";
  }
  // La zona se avisa acá y no después de un 400: el campo viene precargado
  // pero es editable, y el back rechaza lo que esté fuera del barrio.
  if (zona && esEnvio(form) && form.neighborhood.trim() && !mismaZona(form.neighborhood, zona)) {
    return `Por ahora los envíos son solo en ${zona}. Si estás cerca, escribinos y lo vemos.`;
  }
  return "";
}

export function armarPayload({
  items,
  form,
  deliveryMethod,
  paymentMethod,
  zona,
}: {
  items: CartItem[];
  form: FormularioDeCheckout;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  zona?: string;
}): OrderCreationPayload {
  const envio = deliveryMethod === "delivery";
  return {
    items: items.map(renglonDelPedido),
    customer: {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim(),
    },
    delivery: {
      method: deliveryMethod,
      address: envio ? form.address.trim() : undefined,
      neighborhood: (envio ? form.neighborhood : zona ?? form.neighborhood).trim(),
      city: form.city.trim(),
      notes: form.notes.trim().slice(0, TOPE_NOTAS),
    },
    payment_method: paymentMethod,
  };
}

/** Un renglón tal como lo espera el back (F19a, F58).
 *
 *  **El precio no viaja**: va `variant_id` y el servidor busca la fila, que
 *  es lo que cierra el agujero de ADR-029. Lo mismo con los sabores: van los
 *  ids y el servidor verifica que sean de ese producto.
 *
 *  Los campos vacíos no se mandan: un `note: ""` o un `option_ids: []` son
 *  ruido en el pedido de quien compró una docena de cookies. */
export function renglonDelPedido(item: CartItem): OrderItemPayload {
  const renglon: OrderItemPayload = { product_id: item.id, quantity: item.quantity };
  if (item.variante) {
    renglon.variant_id = item.variante.id;
    // El nombre viaja como **testigo**, no como dato de precio: si el id
    // cayó sobre otro tamaño (pasa si ella borró uno y la base reusó el id),
    // el servidor lo corta con un 400 en vez de cobrar otra cosa (ADR-029).
    renglon.variant_name = item.variante.name;
  }
  if (item.opciones?.length) {
    renglon.option_ids = item.opciones.map((opcion) => opcion.id);
  }
  // Se manda ya en una línea, con la misma regla del back: así el recorte
  // (si hace falta) lo decide la pantalla que mostró el contador, y no el
  // servidor en silencio.
  const nota = notaParaElPedido(item.nota);
  if (nota) {
    renglon.note = nota.slice(0, TOPE_NOTA);
  }
  if (item.fotoDeReferencia) {
    renglon.reference_image = item.fotoDeReferencia;
  }
  return renglon;
}

/** El formulario solo pide dirección cuando es envío, así que alcanza con
 *  mirar si la escribió. */
function esEnvio(form: FormularioDeCheckout): boolean {
  return Boolean(form.address.trim()) || Boolean(form.neighborhood.trim());
}

function mismaZona(barrio: string, zona: string): boolean {
  const limpio = sinAcentos(barrio);
  const esperada = sinAcentos(zona);
  return limpio.includes(esperada) || esperada.includes(limpio);
}

function sinAcentos(valor: string): string {
  return valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}
