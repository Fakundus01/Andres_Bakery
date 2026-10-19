/** Cuenta, contenido del sitio, subidas, metricas, IA y usuarios. */
import type {
  AuthPayload,
  BorradorReceta,
  DeliveryConfig,
  PerfilAndrea,
  ResumenMetricas,
  SiteContent,
  SubidaDeImagen,
  User,
} from "../types";
import { API_URL, ApiError, apiRequest, avisarSesionVencida } from "./cliente";

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

/** Las dos puertas de subida: la del panel (con token) y la del cliente. */
export const uploadsApi = {
  async subirImagen(archivo: File, token: string): Promise<SubidaDeImagen> {
    return subir(archivo, "/api/uploads", token);
  },
  /** La foto de referencia de una torta a pedido (F59). **Sin token**: la
   *  sube quien compra, que puede no tener cuenta. Es otra ruta y no la de
   *  ella con el permiso sacado: dos rutas, dos políticas (ADR-032). */
  async subirReferencia(archivo: File): Promise<SubidaDeImagen> {
    return subir(archivo, "/api/uploads/referencia");
  },
};

/** No pasa por `apiRequest` porque va como multipart: poner
 *  `Content-Type: application/json` ahí rompe el borde del formulario. */
async function subir(archivo: File, ruta: string, token?: string): Promise<SubidaDeImagen> {
  const cuerpo = new FormData();
  cuerpo.append("file", archivo);
  const response = await fetch(`${API_URL}${ruta}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: cuerpo,
  });

  if (!response.ok) {
    // Esta llamada no pasa por `apiRequest` porque va multipart, así que el
    // aviso de sesión vencida hay que darlo también acá: si no, subir una
    // foto con la sesión caída dejaba el panel fingiendo que anda, que es
    // justo lo que el aviso vino a resolver. Sin token no hay sesión que
    // avisar: un 429 de la ruta pública no es una sesión vencida.
    if (token && (response.status === 401 || response.status === 422)) {
      avisarSesionVencida(token);
    }
    throw new ApiError(await mensajeDeError(response), response.status);
  }

  return (await response.json()) as SubidaDeImagen;
}

async function mensajeDeError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; msg?: string };
    return data.error ?? data.msg ?? `Error ${response.status}`;
  } catch {
    return `No se pudo subir la imagen (error ${response.status}).`;
  }
}

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
