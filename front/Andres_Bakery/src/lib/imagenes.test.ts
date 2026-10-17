import { describe, expect, it } from "vitest";

import { API_URL } from "./api";
import { urlDeImagen } from "./imagenes";

describe("urlDeImagen", () => {
  it("a lo que sube Andrea le pone adelante el host del back", () => {
    // En la base se guarda la ruta sin host (ADR-018): el día que el back
    // cambie de dominio no hay que reescribir cada fila.
    expect(urlDeImagen("/uploads/ab12.jpg")).toBe(`${API_URL}/uploads/ab12.jpg`);
  });

  it("una URL externa vuelve tal cual", () => {
    expect(urlDeImagen("https://cdn.ejemplo.com/foto.jpg")).toBe("https://cdn.ejemplo.com/foto.jpg");
    expect(urlDeImagen("http://ejemplo.com/foto.png")).toBe("http://ejemplo.com/foto.png");
  });

  it("sin foto devuelve vacío, para que el componente use la de reserva", () => {
    expect(urlDeImagen("")).toBe("");
    expect(urlDeImagen("   ")).toBe("");
    expect(urlDeImagen(null)).toBe("");
    expect(urlDeImagen(undefined)).toBe("");
  });

  it("no toca otras rutas del sitio", () => {
    // Solo /uploads/ es del back. Lo demás son archivos del propio front.
    expect(urlDeImagen("/profile_pictures/default_profile.svg")).toBe("/profile_pictures/default_profile.svg");
  });
});
