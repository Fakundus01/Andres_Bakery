export type PaymentMethod = "mercado_pago" | "visa" | "mastercard";
export type DeliveryMethod = "delivery" | "pickup";

export interface Ingredient {
  id: number;
  name: string;
  unit?: string | null;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  image_url?: string | null;
  available: boolean;
  ingredients?: Ingredient[];
}

export interface Recipe {
  id: number;
  title: string;
  summary: string;
  ingredients: string;
  steps: string;
  image_url?: string | null;
  category: string;
  status: string;
  created_at: string;
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
  user_id: number;
  status: string;
  total_amount: number;
  created_at: string;
  user?: User;
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
