/** La carta: productos, etiquetas, variantes y grupos de opciones. */
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

/** Un sabor de un grupo: "Dulce de leche" dentro de "Relleno" (F57). */
export interface OptionChoice {
  id: number;
  name: string;
  sort_order: number;
  /** Lo que este sabor le suma al precio (F61, ADR-036). Siempre ≥ 0: es un
   *  recargo, no un descuento, y el servidor lo exige.
   *
   *  Opcional **a propósito**: los sabores de un carrito guardado en
   *  `localStorage` antes de esta feature no lo tienen, y ese carrito no se
   *  vacía. Sin valor se lee como cero. */
  price_delta?: number;
}

/** Lo que la chef define para que el cliente elija (ADR-031).
 *
 *  `required` decide si la torta se puede pedir sin elegir este grupo. El
 *  servidor valida lo mismo: el control de la pantalla es comodidad. */
export interface OptionGroup {
  id: number;
  name: string;
  required: boolean;
  sort_order: number;
  options: OptionChoice[];
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
  /** Los grupos de sabores que aplican a este producto (F57). */
  option_groups?: OptionGroup[];
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
  option_group_ids?: number[];
  variants?: Array<{ name: string; price: number; sort_order?: number }>;
}

/** Zona, envío y teléfono: una sola fuente de verdad, el entorno del back (C4). */
