import type { FormEvent } from "react";

import { productsApi, tagsApi } from "../../lib/api";
import { queFaltaEnLosTamanos } from "../../lib/variantes";
import type { ProductForm, TagForm } from "../../lib/ui-types";
import { payloadDeLaEtiqueta, payloadDelProducto } from "./payloadDelProducto";

/** Guardar un producto y guardar una etiqueta, con su validación previa.
 *
 *  Salió de `usePanelDeAdmin`, que volvió a pasar las 300 líneas (R05) cuando
 *  los guardados empezaron a **devolver si salieron bien** — lo que deja
 *  cerrar el pop-up solo cuando el back dijo que sí.
 */
export function guardadosDelPanel(partes: {
  token: string;
  /** `true` si se guardó. Lo decide `usePanelDeAdmin.conAviso`. */
  conAviso: (trabajo: () => Promise<void>, mensaje: string) => Promise<boolean>;
  setError: (mensaje: string) => void;
  producto: { editado: number | null; form: ProductForm; reset: () => void };
  etiqueta: { editada: number | null; form: TagForm; reset: () => void };
}) {
  const { token, conAviso, setError, producto, etiqueta } = partes;

  return {
    guardarProducto: async (evento: FormEvent<HTMLFormElement>): Promise<boolean> => {
      evento.preventDefault();
      // Lo de los tamaños se frena acá y no en el 400: es lo que define
      // precios, y el formulario ya lo tiene medido (F19b).
      const faltaUnTamano = queFaltaEnLosTamanos(producto.form.variants);
      if (faltaUnTamano) {
        setError(faltaUnTamano);
        return false;
      }
      return conAviso(async () => {
        const payload = payloadDelProducto(producto.form);
        if (producto.editado) {
          await productsApi.update(producto.editado, payload, token);
        } else {
          await productsApi.create(payload, token);
        }
        producto.reset();
      }, "Producto guardado correctamente.");
    },

    guardarEtiqueta: async (evento: FormEvent<HTMLFormElement>): Promise<boolean> => {
      evento.preventDefault();
      return conAviso(async () => {
        const payload = payloadDeLaEtiqueta(etiqueta.form);
        if (etiqueta.editada) {
          await tagsApi.update(etiqueta.editada, payload, token);
        } else {
          await tagsApi.create(payload, token);
        }
        etiqueta.reset();
      }, "Etiqueta guardada.");
    },
  };
}
