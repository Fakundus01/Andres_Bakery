import { describe, expect, it } from "vitest";

import { agregarAviso, nuevoAviso, type Aviso } from "./avisos";
import { avisoDeAgregado, claveDelRenglon } from "./carrito";
import type { OptionChoice, ProductVariant } from "./types";

/** D36 · El dedup de la cola de avisos compara el ASUNTO, no el texto.
 *
 *  Archivo propio y no un `describe` más en `avisos.test.ts` (245 líneas) ni
 *  en `carrito.aviso.test.ts`: R05, y el tema es el encuentro de los dos
 *  módulos, que no es de ninguno de los dos.
 *
 *  Por qué el asunto y no un texto más largo: nombrar también los sabores
 *  suma 34 caracteres y el cartel pasa de 64 a 104 px, con lo que la X se
 *  para encima de otra parte del botón de abajo. Sería arreglar un aviso
 *  perdido creando el robo de clics que T23 y T24 tardaron dos tarjetas en
 *  sacar. El último `it` de este archivo es el candado de esa decisión.
 */

const doce: ProductVariant = { id: 8, name: "12 porciones", price: 19800 };
const dulceDeLeche: OptionChoice = { id: 11, name: "Dulce de leche", sort_order: 1 };
const chocolate: OptionChoice = { id: 12, name: "Chocolate", sort_order: 2, price_delta: 800 };
const cheesecake = { id: 3, price: 14200, name: "Cheesecake de Frutos Rojos" };

/** Lo mismo que hace `addItem`: el texto lo arma `avisoDeAgregado` y el asunto
 *  es la clave del renglón que acaba de entrar. Se compone con las funciones
 *  de producción a propósito: el bug de D36 no estaba en el texto ni en el
 *  dedup por separado, estaba en el encuentro. */
const avisoDelRenglon = (opciones: OptionChoice[]) =>
  nuevoAviso({
    tono: "exito",
    texto: avisoDeAgregado(cheesecake, doce).texto,
    asunto: claveDelRenglon({ ...cheesecake, variante: doce, opciones }),
  });

const colaCon = (...avisos: Array<Aviso | null>) => avisos.reduce(agregarAviso, [] as Aviso[]);

describe("el dedup compara el asunto (D36)", () => {
  it("dos rellenos distintos del mismo tamaño dan DOS avisos", () => {
    // El caso que el reviewer reprodujo en el navegador: dos Cheesecakes de
    // 12 porciones, uno con Dulce de leche y otro con Chocolate, son dos
    // renglones en el carrito ($40.400) y daban UN solo aviso, porque el
    // texto de los dos es idéntico y el dedup se llevaba el primero.
    const cola = colaCon(avisoDelRenglon([dulceDeLeche]), avisoDelRenglon([chocolate]));

    expect(cola).toHaveLength(2);
  });

  it("el mismo renglón dos veces sigue dando UN aviso, con el plazo de nuevo", () => {
    const primero = avisoDelRenglon([dulceDeLeche]);
    const cola = colaCon(primero, avisoDelRenglon([dulceDeLeche]));

    expect(cola).toHaveLength(1);
    // Se reemplaza, no se conserva: el id nuevo es lo que hace que los cuatro
    // segundos vuelvan a empezar.
    expect(cola[0]!.id).not.toBe(primero!.id);
  });

  it("sin asunto el dedup sigue mirando el texto: el panel no cambia", () => {
    // «Etiqueta guardada.» dos veces seguidas sigue siendo un solo cartel.
    const cola = colaCon(
      nuevoAviso({ tono: "exito", texto: "Etiqueta guardada." }),
      nuevoAviso({ tono: "exito", texto: "Etiqueta guardada." }),
    );

    expect(cola).toHaveLength(1);
  });

  it("sin asunto, dos textos distintos se apilan como siempre", () => {
    const cola = colaCon(
      nuevoAviso({ tono: "exito", texto: "Etiqueta guardada." }),
      nuevoAviso({ tono: "exito", texto: "Producto guardado." }),
    );

    expect(cola.map((aviso) => aviso.texto)).toEqual(["Etiqueta guardada.", "Producto guardado."]);
  });

  it("el tono sigue siendo parte de la identidad", () => {
    const cola = colaCon(
      nuevoAviso({ tono: "exito", texto: "quedó", asunto: "mismo-asunto" }),
      nuevoAviso({ tono: "error", texto: "no quedó", asunto: "mismo-asunto" }),
    );

    expect(cola.map((aviso) => aviso.tono)).toEqual(["exito", "error"]);
  });

  it("el arreglo NO alarga el cartel: el texto de los dos avisos es el mismo", () => {
    // El candado de la decisión: si alguien «arregla» D36 metiendo los sabores
    // en el texto, esto se pone rojo. Los 34 caracteres de los sabores llevan
    // el cartel de 64 a 104 px y le devuelven el robo de clics a la X.
    const [uno, otro] = [avisoDelRenglon([dulceDeLeche]), avisoDelRenglon([chocolate])];

    expect(uno!.texto).toBe(otro!.texto);
    expect(uno!.texto).toBe("«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito");
    expect(uno!.texto).not.toContain("Dulce de leche");
    expect(uno!.texto).not.toContain("Chocolate");
  });
});
