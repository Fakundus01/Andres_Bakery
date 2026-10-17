import type {
  AuthPayload,
  CheckoutResponse,
  DeliveryConfig,
  Order,
  OrderCreationPayload,
  OrderCreationResponse,
  Product,
  ProductWritePayload,
  SiteContent,
  Tag,
  User,
  PaymentMethod,
} from "./types";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:5000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) {
        message = data.error;
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  register(payload: { name: string; email: string; password: string }) {
    return apiRequest<AuthPayload>("/api/auth/register", {
      method: "POST",
      body: payload,
    });
  },
  login(payload: { email: string; password: string }) {
    return apiRequest<AuthPayload>("/api/auth/login", {
      method: "POST",
      body: payload,
    });
  },
  me(token: string) {
    return apiRequest<User>("/api/auth/me", { token });
  },
};

export const productsApi = {
  list(filtros: { tag?: string; soloDisponibles?: boolean } = {}) {
    const query = new URLSearchParams();
    if (filtros.tag) {
      query.set("tag", filtros.tag);
    }
    if (filtros.soloDisponibles) {
      query.set("available", "1");
    }
    const sufijo = query.toString();
    return apiRequest<Product[]>(`/api/products${sufijo ? `?${sufijo}` : ""}`);
  },
  getBySlug(slug: string) {
    return apiRequest<Product>(`/api/products/${encodeURIComponent(slug)}`);
  },
  create(product: ProductWritePayload, token: string) {
    return apiRequest<{ id: number }>("/api/products", {
      method: "POST",
      body: product,
      token,
    });
  },
  update(id: number, product: ProductWritePayload, token: string) {
    return apiRequest<{ status: string }>(`/api/products/${id}`, {
      method: "PUT",
      body: product,
      token,
    });
  },
  remove(id: number, token: string) {
    return apiRequest<{ status: string }>(`/api/products/${id}`, {
      method: "DELETE",
      token,
    });
  },
};

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

export const tagsApi = {
  list() {
    return apiRequest<Tag[]>("/api/tags");
  },
  create(tag: { name: string; color_token?: string; sort_order?: number }, token: string) {
    return apiRequest<{ id: number; slug: string }>("/api/tags", {
      method: "POST",
      body: tag,
      token,
    });
  },
  update(id: number, tag: Partial<Tag> & { sort_order?: number }, token: string) {
    return apiRequest<{ status: string }>(`/api/tags/${id}`, {
      method: "PUT",
      body: tag,
      token,
    });
  },
  remove(id: number, token: string) {
    return apiRequest<{ status: string }>(`/api/tags/${id}`, {
      method: "DELETE",
      token,
    });
  },
};

export const siteApi = {
  getDelivery() {
    return apiRequest<DeliveryConfig>("/api/site/delivery");
  },
  getAbout() {
    return apiRequest<SiteContent>("/api/site/about");
  },
  updateAbout(content: string, token: string) {
    return apiRequest<{ status: string }>("/api/site/about", {
      method: "PUT",
      body: { content },
      token,
    });
  },
};

export const usersApi = {
  list(token: string) {
    return apiRequest<User[]>("/api/users", { token });
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
