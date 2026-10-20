import { useCallback, useMemo, useState } from "react";

import { optionGroupsApi, tagsApi } from "../../lib/api";
import { NOMBRE_TAG_PERSONALIZABLE, TAG_PERSONALIZABLE } from "../../lib/carrito";
import { normalizar } from "../../lib/ingredientes";
import type { OptionGroup, Product, Tag } from "../../lib/types";

const ordenar = (lista: OptionGroup[]): OptionGroup[] =>
  [...lista].sort((uno, otro) => uno.sort_order - otro.sort_order || uno.name.localeCompare(otro.name, "es"));

/** Todo lo de grupos de sabores del panel, junto (F57).
 *
 *  Mismo reparto que `useIngredientesDelPanel`: la lista y cuánto se usa cada
 *  grupo viven acá, y el aviso y la recarga los pone `usePanelDeAdmin` con
 *  `conAviso`. Pasarle `conAviso` a este hook armaría un ciclo, porque él
 *  depende de `cargar` y `cargar` depende de esto.
 */
export function useOpcionesDelPanel({
  token,
  productos,
  etiquetas,
}: {
  token: string;
  productos: Product[];
  etiquetas: Tag[];
}) {
  const [gruposDeOpciones, setGrupos] = useState<OptionGroup[]>([]);

  const recibirGruposDeOpciones = useCallback(
    (lista: OptionGroup[]) => setGrupos(ordenar(lista)),
    [],
  );

  /** En cuántos productos está cada grupo. Es lo que le deja decir al panel
   *  "está en 3 productos" **antes** de borrarlo, igual que con los
   *  ingredientes: borrarlo lo saca de todos. */
  const usosDeGrupos = useMemo(() => {
    const cuenta: Record<number, number> = {};
    for (const producto of productos) {
      for (const grupo of producto.option_groups ?? []) {
        cuenta[grupo.id] = (cuenta[grupo.id] ?? 0) + 1;
      }
    }
    return cuenta;
  }, [productos]);

  /** El grupo que ya existe con ese nombre, escrito como se escriba.
   *
   *  Lo decide el back igual (ADR-030/031); acá sirve para no mandar un alta
   *  que va a volver con el que ya estaba. */
  const buscarGrupo = (nombre: string): OptionGroup | null => {
    const buscado = normalizar(nombre);
    if (!buscado) {
      return null;
    }
    return gruposDeOpciones.find((grupo) => normalizar(grupo.name) === buscado) ?? null;
  };

  /** La etiqueta que habilita la personalización. Sin ella, todo lo de esta
   *  pestaña no se ve en la ficha, así que el panel lo dice y la ofrece. */
  const etiquetaDeTortasLista = etiquetas.some((etiqueta) => etiqueta.slug === TAG_PERSONALIZABLE);

  return {
    gruposDeOpciones,
    etiquetaDeTortasLista,
    recibirGruposDeOpciones,
    usosDeGrupos,
    buscarGrupo,
    // Crudas: el aviso y la recarga los pone `usePanelDeAdmin`.
    crearEtiquetaDeTortas: () =>
      tagsApi.create({ name: NOMBRE_TAG_PERSONALIZABLE }, token).then(() => undefined),
    crearGrupo: (nombre: string, obligatorio: boolean) =>
      optionGroupsApi
        .create({ name: nombre, required: obligatorio, sort_order: gruposDeOpciones.length }, token)
        .then(() => undefined),
    renombrarGrupo: (id: number, nombre: string) =>
      optionGroupsApi.update(id, { name: nombre }, token).then(() => undefined),
    cambiarObligatoriedad: (id: number, obligatorio: boolean) =>
      optionGroupsApi.update(id, { required: obligatorio }, token).then(() => undefined),
    borrarGrupo: (id: number) => optionGroupsApi.remove(id, token).then(() => undefined),
    crearOpcion: (grupoId: number, nombre: string, recargo: number) =>
      optionGroupsApi
        .crearOpcion(grupoId, { name: nombre, price_delta: recargo }, token)
        .then(() => undefined),
    editarOpcion: (grupoId: number, opcionId: number, nombre: string, recargo: number) =>
      optionGroupsApi
        .editarOpcion(grupoId, opcionId, { name: nombre, price_delta: recargo }, token)
        .then(() => undefined),
    borrarOpcion: (grupoId: number, opcionId: number) =>
      optionGroupsApi.borrarOpcion(grupoId, opcionId, token).then(() => undefined),
  };
}
