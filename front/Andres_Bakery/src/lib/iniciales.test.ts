import { describe, expect, it } from "vitest";

import { iniciales } from "./iniciales";

describe("iniciales", () => {
  it("toma la primera y la última palabra", () => {
    expect(iniciales("Facundo Moreno")).toBe("FM");
    expect(iniciales("Maria del Carmen Perez")).toBe("MP");
  });

  it("con una sola palabra usa sus dos primeras letras", () => {
    // Una sola letra en un círculo se lee como un error de carga.
    expect(iniciales("Andrea")).toBe("AN");
  });

  it("no parte los emojis al medio", () => {
    // Regresión: se indexaba por posiciones del string y un emoji ocupa dos,
    // así que salía un rombo con signo de pregunta adentro del círculo.
    expect(iniciales("🍰 Pastelera")).toBe("🍰P");
    expect(iniciales("Andrea 🍰")).toBe("A🍰");
    expect(iniciales("🍰")).toBe("🍰");
  });

  it("respeta los acentos y la eñe", () => {
    expect(iniciales("Ángela Ñandú")).toBe("ÁÑ");
    expect(iniciales("ñ")).toBe("Ñ");
  });

  it("ignora los espacios de más", () => {
    expect(iniciales("  Andrea   Lopez  ")).toBe("AL");
  });

  it("sin nombre devuelve vacío, para que el botón muestre el ícono", () => {
    // No inventa iniciales: eso es lo que le dice al componente que dibuje
    // la silueta en lugar de letras.
    expect(iniciales("")).toBe("");
    expect(iniciales("   ")).toBe("");
    expect(iniciales(null)).toBe("");
    expect(iniciales(undefined)).toBe("");
  });

  it("nunca devuelve más de dos caracteres", () => {
    for (const nombre of ["Andrea", "Facundo Moreno", "🍰 Pastelera", "Maria del Carmen Perez", "A"]) {
      expect([...iniciales(nombre)].length).toBeLessThanOrEqual(2);
    }
  });
});
