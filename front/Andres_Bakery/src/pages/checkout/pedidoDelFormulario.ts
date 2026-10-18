import type { CartItem } from "../../contexts/CartContext";
import type { DeliveryMethod, OrderCreationPayload, PaymentMethod } from "../../lib/types";

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
    items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
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
