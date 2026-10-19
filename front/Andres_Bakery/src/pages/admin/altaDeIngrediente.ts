import { buscarIngrediente, limpiarNombre } from "../../lib/ingredientes";
import type { Ingredient } from "../../lib/types";

/** Lo que el alta necesita de la API. Se inyecta para poder probarla sin red,
 *  igual que `FakeMercadoPagoClient` y `FakeRecipeClient` del lado del back. */
export type ApiDeIngredientes = {
  create: (ingrediente: { name: string }, token: string) => Promise<{ id: number; name?: string }>;
  list: () => Promise<Ingredient[]>;
};

export type ResultadoDelAlta =
  | { estado: "creado"; ingrediente: Ingredient }
  | { estado: "ya-existia"; ingrediente: Ingredient; lista: Ingredient[] }
  | { estado: "vacio" }
  | { estado: "error"; motivo: unknown };

/** Crea el ingrediente, y si el alta falla **relee la lista antes de rendirse**.
 *
 *  El caso que importa es el duplicado: la unicidad del back es por nombre
 *  exacto, así que un ingrediente creado en otra pestaña —o en la ventana
 *  entre dos clics sobre dos grafías del mismo nombre— devuelve 400 y nuestra
 *  copia local no se entera. Sin la relectura, el reintento fallaba igual para
 *  siempre y la única salida era recargar el panel entero, perdiendo lo que
 *  Andrea tuviera escrito (lo marcó el reviewer de T6-F20).
 */
export async function altaDeIngrediente(
  nombre: string,
  token: string,
  api: ApiDeIngredientes,
): Promise<ResultadoDelAlta> {
  const limpio = limpiarNombre(nombre);
  if (!limpio) {
    return { estado: "vacio" };
  }

  try {
    const creado = await api.create({ name: limpio }, token);
    // El nombre sale de la respuesta: con 200 el back devuelve el que YA
    // estaba, que puede estar escrito distinto del que se acaba de tipear
    // (ADR-030). Quedarse con lo tipeado le muestra a Andrea un nombre que no
    // es el que se guardo.
    return {
      estado: "creado",
      ingrediente: { id: creado.id, name: creado.name || limpio, unit: null },
    };
  } catch (motivo: unknown) {
    try {
      const lista = await api.list();
      const existente = buscarIngrediente(lista, limpio);
      if (existente) {
        return { estado: "ya-existia", ingrediente: existente, lista };
      }
    } catch {
      // La relectura es un intento de rescate: si tampoco sale, el error que
      // vale contar es el del alta, no el de esta segunda vuelta.
    }
    return { estado: "error", motivo };
  }
}
