import type {
  AuthPayload,
  CheckoutResponse,
  Order,
  OrderCreationPayload,
  OrderCreationResponse,
  Product,
  Recipe,
  SiteContent,
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
  list() {
    return apiRequest<Product[]>("/api/products");
  },
  create(product: Partial<Product>, token: string) {
    return apiRequest<{ id: number }>("/api/products", {
      method: "POST",
      body: product,
      token,
    });
  },
  update(id: number, product: Partial<Product>, token: string) {
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

export const recipesApi = {
  list() {
    return apiRequest<Recipe[]>("/api/recipes");
  },
  create(recipe: Partial<Recipe>, token: string) {
    return apiRequest<{ id: number }>("/api/recipes", {
      method: "POST",
      body: recipe,
      token,
    });
  },
  update(id: number, recipe: Partial<Recipe>, token: string) {
    return apiRequest<{ status: string }>(`/api/recipes/${id}`, {
      method: "PUT",
      body: recipe,
      token,
    });
  },
  remove(id: number, token: string) {
    return apiRequest<{ status: string }>(`/api/recipes/${id}`, {
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

export const siteApi = {
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
