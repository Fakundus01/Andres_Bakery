import type {
  AuthPayload,
  BorradorReceta,
  CheckoutResponse,
  DeliveryConfig,
  Order,
  OrderCreationPayload,
  PedidoWhatsAppResponse,
  PerfilAndrea,
  ResumenMetricas,
  SubidaDeImagen,
  OrderCreationResponse,
  Product,
  ProductWritePayload,
  SiteContent,
  Tag,
  User,
  PaymentMethod,
} from "./types";

export const API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:5000";

/** Se dispara cuando el back rechaza un token que creíamos bueno.
 *
 *  El access token dura 15 minutos. Sin esto, pasado ese rato Andrea seguía
 *  viendo el panel "abierto" —su nombre arriba, las pestañas— y todo fallaba
 *  en silencio con 401: ni datos, ni explicación, ni forma de volver a entrar
 *  (la pantalla de ingreso la rebotaba porque para el front la sesión seguía
 *  viva). Ahora la sesión se cierra sola y la pantalla de ingreso lo dice.
 *
 *  **El evento lleva el token rechazado**, y eso no es un adorno: sin él, una
 *  respuesta lenta de una sesión vieja cerraba la sesión nueva. Pasa de
 *  verdad —conexión lenta, un pedido colgado, la persona vuelve a entrar
 *  mientras tanto— y la patea afuera justo después de entrar bien. */
export const EVENTO_SESION_VENCIDA = "andres-bakery:sesion-vencida";

export type DetalleSesionVencida = { token: string };

function avisarSesionVencida(token: string): void {
  window.dispatchEvent(
    new CustomEvent<DetalleSesionVencida>(EVENTO_SESION_VENCIDA, { detail: { token } }),
  );
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Qué decirle a la persona cuando la API contesta mal.
 *
 *  El cuerpo se lee UNA sola vez. Antes se intentaba `response.json()` y, si
 *  fallaba, `response.text()` sobre el mismo cuerpo ya consumido: el error
 *  que terminaba en pantalla era "Failed to execute 'text' on 'Response':
 *  body stream already read", que no le dice nada a nadie y tapa el error de
 *  verdad. Apareció con un 500 real del panel. */
async function leerElError(response: Response): Promise<string> {
  let crudo = "";
  try {
    crudo = await response.text();
  } catch {
    return `Error ${response.status}`;
  }

  try {
    // `error` es lo que devuelven nuestros servicios; `msg`, lo que devuelve
    // flask-jwt-extended ("Token has expired"). Sin leer los dos, todo
    // problema de token quedaba en un "Error 401" sin explicación.
    const data = JSON.parse(crudo) as { error?: string; msg?: string };
    const mensaje = data.error ?? data.msg;
    if (mensaje) {
      return mensaje;
    }
  } catch {
    // No era JSON: una página de error del servidor. Mostrar HTML crudo es
    // peor que no mostrar nada.
    if (crudo.trimStart().startsWith("<")) {
      return `El servidor tuvo un problema (error ${response.status}). Probá de nuevo en un rato.`;
    }
    if (crudo.trim()) {
      return crudo.trim().slice(0, 300);
    }
  }
  return `Error ${response.status}`;
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
    // 401 y 422: el back usa el primero para un token vencido o ausente y el
    // segundo para uno que no puede ni leer (guardado a medias, manoseado).
    // Los dos significan lo mismo del lado de acá: esta sesión ya no sirve.
    //
    // Solo cuando mandamos token: un 401 sin token es "esto pide cuenta", no
    // "tu sesión se venció".
    if ((response.status === 401 || response.status === 422) && options.token) {
      avisarSesionVencida(options.token);
    }
    throw new ApiError(await leerElError(response), response.status);
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
  getProfile() {
    return apiRequest<PerfilAndrea>("/api/site/profile");
  },
  updateProfile(perfil: PerfilAndrea, token: string) {
    return apiRequest<{ status: string }>("/api/site/profile", {
      method: "PUT",
      body: perfil,
      token,
    });
  },
};

/** Sube una foto. No pasa por `apiRequest` porque va como multipart: poner
 *  `Content-Type: application/json` ahí rompe el borde del formulario. */
export const uploadsApi = {
  async subirImagen(archivo: File, token: string): Promise<SubidaDeImagen> {
    const cuerpo = new FormData();
    cuerpo.append("file", archivo);
    const response = await fetch(`${API_URL}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: cuerpo,
    });
    if (!response.ok) {
      // Esta llamada no pasa por `apiRequest` porque va multipart, así que el
      // aviso de sesión vencida hay que darlo también acá: si no, subir una
      // foto con la sesión caída dejaba el panel fingiendo que anda, que es
      // justo lo que el aviso vino a resolver.
      if (response.status === 401 || response.status === 422) {
        avisarSesionVencida(token);
      }
      let message = `Error ${response.status}`;
      try {
        const data = (await response.json()) as { error?: string; msg?: string };
        if (data.error || data.msg) {
          message = data.error ?? data.msg ?? message;
        }
      } catch {
        message = `No se pudo subir la imagen (error ${response.status}).`;
      }
      throw new ApiError(message, response.status);
    }
    return (await response.json()) as SubidaDeImagen;
  },
};

export const metricsApi = {
  /** Cuenta una visita. Si falla, se ignora: un contador no corta la navegación. */
  contarVisita(path: string, device: "mouse" | "tactil") {
    return apiRequest<null>("/api/metrics/view", { method: "POST", body: { path, device } });
  },
  resumen(dias: number, token: string) {
    return apiRequest<ResumenMetricas>(`/api/metrics/summary?days=${dias}`, { token });
  },
};

export const aiApi = {
  borradorDeReceta(imageUrl: string, hint: string, token: string) {
    return apiRequest<BorradorReceta>("/api/ai/recipe-draft", {
      method: "POST",
      body: { image_url: imageUrl, hint },
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
