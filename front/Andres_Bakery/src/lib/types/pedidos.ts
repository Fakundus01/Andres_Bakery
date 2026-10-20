/** Quien compra y lo que compra: renglones, pedidos, pagos y respuestas. */
import type { DeliveryMethod, OrderChannel, PaymentMethod } from "./catalogo";

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

/** Lo elegido, copiado por nombre en el momento del pedido (ADR-031), con
 *  el recargo que se cobró por ese sabor (F61, ADR-036). */
export interface OrderItemOption {
  group_name: string;
  option_name: string;
  price_delta?: number;
}

export interface OrderItem {
  id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product_name?: string;
  /** El tamaño que se vendió, copiado y no linkeado (ADR-029). */
  variant_name?: string | null;
  note?: string | null;
  reference_image?: string | null;
  options?: OrderItemOption[];
}

export interface OrderDelivery {
  customer_name: string;
  /** Opcional desde el pedido de invitado (ADR-025). */
  customer_email?: string | null;
  customer_phone?: string | null;
  delivery_method: DeliveryMethod;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  shipping_amount: number;
  notes?: string | null;
  payment_method: PaymentMethod;
}

export interface PaymentRecord {
  id: number;
  provider: string;
  provider_payment_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface Order {
  id: number;
  /** Null en un pedido de invitado: el contacto está en delivery (ADR-012). */
  user_id?: number | null;
  status: string;
  channel: OrderChannel;
  total_amount: number;
  created_at: string;
  user?: User | null;
  items: OrderItem[];
  delivery?: OrderDelivery | null;
  payments: PaymentRecord[];
}


export interface OrderItemPayload {
  product_id: number;
  quantity: number;
  variant_id?: number;
  /** El nombre del tamaño que la pantalla mostró, para que el servidor
   *  verifique que el id no quedó apuntando a otro (ADR-029). */
  variant_name?: string;
  option_ids?: number[];
  /** Los sabores como la pantalla los mostró —nombre y recargo—, para que el
   *  servidor verifique que los ids no quedaron apuntando a otra cosa. Mismo
   *  testigo que `variant_name`, y por el mismo caso medido (review de T20). */
  options_seen?: Array<{ id: number; name: string; price_delta: number }>;
  note?: string;
  reference_image?: string;
}

export interface OrderCreationPayload {
  items: OrderItemPayload[];
  customer: {
    name: string;
    /** Opcional desde el pedido de invitado (ADR-025): el canal es el teléfono. */
    email?: string;
    phone?: string;
  };
  delivery: {
    method: DeliveryMethod;
    address?: string;
    neighborhood?: string;
    city?: string;
    notes?: string;
    shipping_amount?: number;
  };
  payment_method: PaymentMethod;
  channel?: OrderChannel;
}

export interface OrderCreationResponse {
  order_id: number;
  total: number;
  emails?: Record<string, string>;
}

/** Lo que devuelve la ruta pública de pedido (F23, ADR-025). El `message` lo
 *  arma el back con los precios de la base: el front no lo escribe ni lo
 *  corrige, solo lo pega en el link de WhatsApp. */
export interface PedidoWhatsAppResponse {
  order_id: number;
  total: number;
  phone: string;
  message: string;
}

export interface CheckoutResponse {
  checkout_url?: string;
  sandbox_checkout_url?: string;
  preference_id: string;
  payment_id: number;
  status: string;
  provider: string;
  selected_method: PaymentMethod;
}
