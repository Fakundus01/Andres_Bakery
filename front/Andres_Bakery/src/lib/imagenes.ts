import { API_URL } from "./api";

/** La URL con la que se muestra una foto.
 *
 *  Lo que sube Andrea se guarda como `/uploads/<nombre>` —una ruta del back,
 *  sin host— porque el día que el back cambie de dominio no queremos tener que
 *  reescribir cada fila de la base (ADR-018). El front, que corre en otro
 *  origen, le pone adelante el host de la API.
 *
 *  Una URL externa (las que ella pegaba antes, o una foto de un CDN) vuelve
 *  tal cual.
 */
export function urlDeImagen(valor: string | null | undefined): string {
  const limpio = (valor ?? "").trim();
  if (!limpio) {
    return "";
  }
  if (limpio.startsWith("/uploads/")) {
    return `${API_URL}${limpio}`;
  }
  return limpio;
}
