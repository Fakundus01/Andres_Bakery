export type PaymentMethod = "mercado_pago" | "visa" | "mastercard";
export type DeliveryMethod = "delivery" | "pickup";
export type OrderChannel = "whatsapp" | "mercado_pago";

export interface Ingredient {
  id: number;
  name: string;
  unit?: string | null;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  color_token: string;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  name: string;
  price: number;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  /** La receta paso a paso. Vacía ⇒ la ficha no muestra la sección (ADR-001). */
  steps?: string | null;
  prep_note?: string | null;
  price: number;
  /** price es el precio de UNA unit_label: "unidad", "docena", "kg"... */
  unit_label: string;
  min_qty: number;
  qty_step: number;
  category: string;
  image_url?: string | null;
  available: boolean;
  allows_pickup: boolean;
  allows_delivery: boolean;
  ingredients?: Ingredient[];
  tags?: Tag[];
  /** Vacío ⇒ se vende por unidad. Con variantes, el precio sale de la elegida. */
  variants?: ProductVariant[];
}

/** Lo que el panel manda al crear o editar un producto. No es `Product`:
 *  las etiquetas viajan como ids y las variantes todavía sin id. */
export interface ProductWritePayload {
  name?: string;
  slug?: string;
  description?: string;
  steps?: string;
  prep_note?: string;
  price?: number;
  unit_label?: string;
  min_qty?: number;
  qty_step?: number;
  category?: string;
  image_url?: string;
  available?: boolean;
  allows_pickup?: boolean;
  allows_delivery?: boolean;
  ingredient_ids?: number[];
  tag_ids?: number[];
  variants?: Array<{ name: string; price: number; sort_order?: number }>;
}

/** Zona, envío y teléfono: una sola fuente de verdad, el entorno del back (C4). */
export interface DeliveryConfig {
  zone_name: string;
  fee: number;
  pickup_address: string;
  whatsapp_phone: string;
  payments_enabled: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

export interface OrderItem {
  id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product_name?: string;
}

export interface OrderDelivery {
  customer_name: string;
  customer_email: string;
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

export interface SiteContent {
  content: string;
}

export interface OrderCreationPayload {
  items: Array<Pick<OrderItem, "product_id" | "quantity">>;
  customer: {
    name: string;
    email: string;
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

export interface CheckoutResponse {
  checkout_url?: string;
  sandbox_checkout_url?: string;
  preference_id: string;
  payment_id: number;
  status: string;
  provider: string;
  selected_method: PaymentMethod;
}

export interface AuthPayload {
  access_token: string;
  user_id: number;
}
