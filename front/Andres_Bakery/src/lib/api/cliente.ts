/** El cliente HTTP compartido: una sola puerta de salida.
 *
 *  Vive aparte desde que `api.ts` paso las 300 lineas (R05). Lo que cambia
 *  aca —la URL del back, como se lee un error, que pasa con un 401— cambia
 *  para todos los modulos de al lado, que es exactamente la idea.
 */
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

export function avisarSesionVencida(token: string): void {
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

export async function apiRequest<T>(
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
