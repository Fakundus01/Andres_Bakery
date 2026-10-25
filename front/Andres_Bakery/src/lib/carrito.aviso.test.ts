import { describe, expect, it } from "vitest";

import { agregarAviso, nuevoAviso, type Aviso } from "./avisos";
import { avisoDeAgregado } from "./carrito";
import type { ProductVariant } from "./types";

// Archivo propio y no un `describe` más en `carrito.test.ts`: ese archivo
// estaba en 298 líneas y el tope de R05 son 300.

const ocho: ProductVariant = { id: 7, name: "8 porciones", price: 14200 };
const doce: ProductVariant = { id: 8, name: "12 porciones", price: 19800 };
const cheesecake = { name: "Cheesecake de Frutos Rojos" };

describe("avisoDeAgregado", () => {
  it("dice QUÉ entró y no ofrece un segundo camino al carrito (ADR-037)", () => {
    // `toEqual` contra el objeto entero a propósito: el día que alguien le
    // vuelva a colgar un link, este test se pone rojo (ADR-037).
    expect(avisoDeAgregado({ name: "Brownie Tentacion" })).toEqual({
      texto: "«Brownie Tentacion» se agregó al carrito",
    });
  });

  it("el nombre entra tal como lo escribió Andrea, sin recortar", () => {
    const largo = "TortaDeChocolateConDulceDeLecheYMerengue";
    expect(avisoDeAgregado({ name: largo }).texto).toContain(largo);
  });

  it("nombra el tamaño cuando se eligió uno (D29)", () => {
    expect(avisoDeAgregado(cheesecake, doce)).toEqual({
      texto: "«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito",
    });
  });

  it("sin variante el texto queda igual que siempre", () => {
    expect(avisoDeAgregado(cheesecake, null).texto).toBe(
      "«Cheesecake de Frutos Rojos» se agregó al carrito",
    );
  });

  it("una variante sin nombre no deja un paréntesis vacío colgado", () => {
    expect(avisoDeAgregado(cheesecake, { id: 9, name: "   ", price: 1 }).texto).toBe(
      "«Cheesecake de Frutos Rojos» se agregó al carrito",
    );
  });

  it("los dos tamaños de la misma torta dan DOS avisos, no uno (D29)", () => {
    // El caso exacto que midió el review de T23 (hallazgo 6) en el navegador
    // con la carta real: 8 porciones y después 12 del mismo Cheesecake daban
    // UN aviso —el dedup se llevaba el primero— mientras el carrito mostraba
    // correctamente los dos renglones. Se prueba contra `agregarAviso` porque
    // el bug no estaba en el texto ni en el dedup por separado, sino en el
    // encuentro de los dos.
    const cola = [ocho, doce].reduce(
      (acumulada: Aviso[], variante) =>
        agregarAviso(
          acumulada,
          nuevoAviso({ tono: "exito", texto: avisoDeAgregado(cheesecake, variante).texto }),
        ),
      [],
    );

    expect(cola.map((aviso) => aviso.texto)).toEqual([
      "«Cheesecake de Frutos Rojos» (8 porciones) se agregó al carrito",
      "«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito",
    ]);
  });

  it("el mismo tamaño dos veces sigue dando UN aviso: el dedup no se rompió", () => {
    const cola = [doce, doce].reduce(
      (acumulada: Aviso[], variante) =>
        agregarAviso(
          acumulada,
          nuevoAviso({ tono: "exito", texto: avisoDeAgregado(cheesecake, variante).texto }),
        ),
      [],
    );

    expect(cola).toHaveLength(1);
  });
});
