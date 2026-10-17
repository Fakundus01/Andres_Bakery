import { describe, expect, it } from "vitest";

import { linkWhatsApp } from "./contacto";

describe("linkWhatsApp", () => {
  it("arma el link con solo los dígitos", () => {
    // El número llega como lo escribió ella: "11-7059-5319" con guiones.
    expect(linkWhatsApp("5491170595319")).toBe("https://wa.me/5491170595319");
    expect(linkWhatsApp("+54 9 11 7059-5319")).toBe("https://wa.me/5491170595319");
  });

  it("sin número no inventa un link", () => {
    // Devolver una URL rota sería peor que no mostrar el botón: la UI usa el
    // null para decir que falta configurarlo.
    expect(linkWhatsApp(undefined)).toBeNull();
    expect(linkWhatsApp(null)).toBeNull();
    expect(linkWhatsApp("")).toBeNull();
    expect(linkWhatsApp("no tengo")).toBeNull();
  });

  it("rechaza un número demasiado corto para ser internacional", () => {
    expect(linkWhatsApp("1170595")).toBeNull();
    expect(linkWhatsApp("1170595319")).toBe("https://wa.me/1170595319");
  });

  it("lleva el mensaje codificado", () => {
    const link = linkWhatsApp("5491170595319", "Pedido #12 por $11.500");
    expect(link).toBe("https://wa.me/5491170595319?text=Pedido%20%2312%20por%20%2411.500");
  });

  it("codifica los saltos de línea del mensaje del back", () => {
    // El mensaje del servidor viene en varias líneas: sin codificar, el link
    // se corta en la primera.
    const link = linkWhatsApp("5491170595319", "Pedido #12\n- 6 x Cookies: $9.000");
    expect(link).toContain("%0A");
    expect(link).not.toContain("\n");
  });

  it("un mensaje vacío no agrega un ?text= pelado", () => {
    expect(linkWhatsApp("5491170595319", "")).toBe("https://wa.me/5491170595319");
  });
});
