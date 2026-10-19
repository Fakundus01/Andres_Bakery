import { useCallback, useMemo, useState } from "react";

import { ingredientsApi } from "../../lib/api";
import type { Ingredient, Product } from "../../lib/types";
import { altaDeIngrediente } from "./altaDeIngrediente";

const ordenarPorNombre = (lista: Ingredient[]): Ingredient[] =>
  [...lista].sort((uno, otro) => uno.name.localeCompare(otro.name, "es"));

/** Todo lo de ingredientes del panel, junto (F20).
 *
 *  Vive afuera de `usePanelDeAdmin` porque esa pieza ya estaba al borde de las
 *  300 líneas (R05), y porque son una unidad: la lista, cuánto se usa cada
 *  uno, y las tres operaciones que Andrea puede hacer sobre ellos.
 */
export function useIngredientesDelPanel({
  token,
  productos,
  avisarError,
}: {
  token: string;
  productos: Product[];
  avisarError: (motivo: unknown) => void;
}) {
  const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);

  /** Estable a propósito: `cargar` la mete en su `useCallback`, y una función
   *  nueva por render ahí adentro es un bucle de recargas o una closure
   *  vieja. `setIngredientes` ya es estable, así que `[]` alcanza. */
  const recibirIngredientes = useCallback(
    (lista: Ingredient[]) => setIngredientes(ordenarPorNombre(lista)),
    [],
  );

  /** Cuántos productos usan cada uno. Es lo que le deja decir al panel "está
   *  en 3 productos" **antes** de borrarlo: borrar uno lo saca de todos, y eso
   *  no se puede descubrir después. */
  const usosDeIngredientes = useMemo(() => {
    const cuenta: Record<number, number> = {};
    for (const producto of productos) {
      for (const ingrediente of producto.ingredients ?? []) {
        cuenta[ingrediente.id] = (cuenta[ingrediente.id] ?? 0) + 1;
      }
    }
    return cuenta;
  }, [productos]);

  /** El alta vive en `altaDeIngrediente.ts`, con sus tests. Acá solo se
   *  traduce el resultado a estado: recargar el panel entero volaría lo que
   *  Andrea tenga escrito en el formulario (ADR-020). */
  const crearIngrediente = async (nombre: string): Promise<Ingredient | null> => {
    const resultado = await altaDeIngrediente(nombre, token, ingredientsApi);
    if (resultado.estado === "creado") {
      setIngredientes((actuales) => ordenarPorNombre([...actuales, resultado.ingrediente]));
      return resultado.ingrediente;
    }
    if (resultado.estado === "ya-existia") {
      setIngredientes(ordenarPorNombre(resultado.lista));
      return resultado.ingrediente;
    }
    if (resultado.estado === "error") {
      avisarError(resultado.motivo);
    }
    return null;
  };

  return {
    ingredientes,
    recibirIngredientes,
    usosDeIngredientes,
    crearIngrediente,
    // Crudas a propósito: el aviso y la recarga los pone `usePanelDeAdmin`
    // con `conAviso`, igual que para productos y etiquetas. Pasarle `conAviso`
    // a este hook armaba un ciclo, porque él depende de `cargar` y `cargar`
    // depende de esto.
    renombrar: (id: number, nombre: string) =>
      ingredientsApi.update(id, { name: nombre }, token).then(() => undefined),
    borrar: (id: number) => ingredientsApi.remove(id, token).then(() => undefined),
  };
}
