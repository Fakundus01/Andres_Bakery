import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import {
  avisoDeLosTamanos,
  filaVacia,
  moverTamano,
  queFaltaEnLosTamanos,
  type FilaDeVariante,
} from "../../lib/variantes";
import { formatCurrency } from "../../lib/format";
import type { ProductVariant } from "../../lib/types";

/** Cargar los tamaños de una torta desde el panel (F19b).
 *
 *  Es lo que faltaba de F19 desde T3: el modelo, la API y el selector de la
 *  ficha estaban, y los tamaños se cargaban por API o a mano. Lo que esta
 *  pantalla carga **define precios**, así que el servidor valida lo mismo
 *  (ADR-029): esto avisa antes para que no sea un 400.
 *
 *  **Cerrado hasta que se pida**, porque el formulario ya es largo y la mayoría
 *  de la carta se vende por unidad: no crece para los veinte productos por
 *  culpa de los dos que tienen tamaños.
 */
export function VariantesDelProducto({
  filas,
  variantesGuardadas,
  onCambiar,
}: {
  filas: FilaDeVariante[];
  /** Lo que el producto tiene guardado, para poder avisar qué se borra. */
  variantesGuardadas?: ProductVariant[];
  onCambiar: (filas: FilaDeVariante[]) => void;
}) {
  /** `null` = nadie lo tocó todavía, así que lo decide el producto: abierto si
   *  tiene tamaños. Con `useState(filas.length > 0)` quedaba **cerrado** al
   *  apretar "Editar" sobre una torta con tamaños, porque el estado inicial se
   *  calcula una sola vez y en ese momento el formulario estaba vacío (se vio
   *  en el navegador). Y una vez que ella lo abre o lo cierra, manda su
   *  decisión: no se le vuelve a mover al cambiar de producto. */
  const [abiertoAMano, setAbiertoAMano] = useState<boolean | null>(null);
  const abierto = abiertoAMano ?? filas.length > 0;
  const falta = queFaltaEnLosTamanos(filas);
  const aviso = avisoDeLosTamanos(filas, variantesGuardadas);

  const cambiar = (indice: number, campo: "name" | "price", valor: string) =>
    onCambiar(filas.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)));

  const agregar = () => {
    setAbiertoAMano(true);
    onCambiar([...filas, filaVacia()]);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-tinta-suave">Tamaños y su precio</p>
        {filas.length > 0 ? (
          <button
            className="btn-secondary px-2 py-1 text-xs"
            type="button"
            aria-expanded={abierto}
            onClick={() => setAbiertoAMano(!abierto)}
          >
            {abierto ? "Ocultar" : `Ver los ${filas.length}`}
          </button>
        ) : null}
      </div>

      {!abierto ? (
        <p className="mt-2 text-xs leading-5 text-tinta-tenue">
          {filas.length === 0
            ? "Este producto se vende al precio de arriba. Si se vende por tamaños (una torta de 8 y de 12 porciones), cargalos acá."
            : "Los tamaños están cargados. Abrí para verlos o cambiarlos."}
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {filas.map((fila, indice) => (
            <li
              key={fila.id ?? `nuevo-${indice}`}
              className="border-[3px] border-borde bg-superficie p-3"
            >
              <div className="flex flex-wrap gap-2">
                <input
                  className="field min-w-32 flex-1"
                  value={fila.name}
                  onChange={(evento) => cambiar(indice, "name", evento.target.value)}
                  placeholder="8 porciones"
                  aria-label={`Nombre del tamaño ${indice + 1}`}
                />
                <input
                  className="field w-28"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fila.price}
                  onChange={(evento) => cambiar(indice, "price", evento.target.value)}
                  placeholder="14200"
                  aria-label={`Precio del tamaño ${indice + 1}`}
                />
                <div className="flex shrink-0 gap-1">
                  <button
                    className="btn-secondary px-2"
                    type="button"
                    onClick={() => onCambiar(moverTamano(filas, indice, indice - 1))}
                    disabled={indice === 0}
                    aria-label={`Subir el tamaño ${indice + 1}`}
                    title="Subir"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-secondary px-2"
                    type="button"
                    onClick={() => onCambiar(moverTamano(filas, indice, indice + 1))}
                    disabled={indice === filas.length - 1}
                    aria-label={`Bajar el tamaño ${indice + 1}`}
                    title="Bajar"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-secondary px-2"
                    type="button"
                    onClick={() => onCambiar(filas.filter((_, i) => i !== indice))}
                    aria-label={`Borrar el tamaño ${indice + 1}`}
                    title="Borrar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {fila.price && Number(fila.price) > 0 ? (
                <p className="mt-1 text-xs text-tinta-tenue">
                  Se va a cobrar {formatCurrency(Number(fila.price))}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <button className="btn-secondary mt-2 px-3 py-1 text-xs" type="button" onClick={agregar}>
        <Plus className="h-4 w-4" />
        Agregar un tamaño
      </button>

      {/* Lo que falta para poder guardar. El back valida lo mismo y contesta
          400; esto es para que no lo descubra después de apretar guardar. */}
      {falta ? (
        <p className="mt-2 border-[3px] border-borde bg-superficie px-3 py-2 text-xs leading-5 text-tinta">
          {falta}
        </p>
      ) : null}

      {/* Y lo que va a pasar si guarda: el precio de arriba deja de cobrarse,
          y los tamaños borrados dejan carritos que hay que rearmar. */}
      {aviso ? (
        <p className="mt-2 border-[3px] border-borde bg-superficie-alt px-3 py-2 text-xs leading-5 text-tinta-suave">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
