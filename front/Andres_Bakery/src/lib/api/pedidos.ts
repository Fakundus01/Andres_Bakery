/** Pedidos, pagos y contacto: todo lo que mueve una compra. */
import type {
  CheckoutResponse,
  Order,
  OrderCreationPayload,
  OrderCreationResponse,
  PaymentMethod,
  PedidoWhatsAppResponse,
} from "../types";
import { apiRequest } from "./cliente";

export const ordersApi = {
  list(token: string) {
    return apiRequest<Order[]>("/api/orders", { token });
  },
  create(payload: OrderCreationPayload, token: string) {
    return apiRequest<OrderCreationResponse>("/api/orders", {
      method: "POST",
      body: payload,
      token,
    });
  },
  /** Pedido por WhatsApp (F23, ADR-025). El token es opcional a propósito:
   *  sin cuenta se puede pedir igual, y con cuenta queda en "mis pedidos". */
  crearPorWhatsApp(payload: OrderCreationPayload, token?: string | null) {
    return apiRequest<PedidoWhatsAppResponse>("/api/orders/whatsapp", {
      method: "POST",
      body: payload,
      token: token ?? undefined,
    });
  },
  updateStatus(id: number, status: string, token: string) {
    return apiRequest<{ status: string }>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: { status },
      token,
    });
  },
};

export const paymentsApi = {
  checkout(orderId: number, paymentMethod: PaymentMethod, token: string) {
    return apiRequest<CheckoutResponse>("/api/payments/checkout", {
      method: "POST",
      body: { order_id: orderId, payment_method: paymentMethod },
      token,
    });
  },
};

export const contactApi = {
  send(payload: { name: string; email: string; message: string }) {
    return apiRequest<{ status: string }>("/api/contact", {
      method: "POST",
      body: payload,
    });
  },
};
