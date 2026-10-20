import { useRef, useState } from "react";
import { ImageUp, LoaderCircle, Trash2 } from "lucide-react";

import { uploadsApi } from "../../lib/api";
import { TOPE_NOTA, notaParaElPedido } from "../../lib/carrito";
import { textoDelRecargo } from "../../lib/recargos";
import { getErrorMessage } from "../../lib/format";
import { urlDeImagen } from "../../lib/imagenes";
import type { OptionGroup } from "../../lib/types";

/** El cliente arma su torta: elige de la lista de ella, escribe cómo la
 *  quiere y puede mandar una foto de referencia (F58, F59, ADR-031).
 *
 *  La frontera de la feature está acá: **los sabores se eligen, no se
 *  escriben**. Si el cliente pudiera escribir el sabor, el pedido sería una
 *  carta de deseos y Andrea no podría cumplirlo. Lo libre es el diseño, que
 *  va en la nota.
 */
export function Personalizacion({
  grupos,
  elegidas,
  onElegir,
  nota,
  onNota,
  foto,
  onFoto,
}: {
  grupos: OptionGroup[];
  elegidas: Record<number, number | undefined>;
  onElegir: (grupoId: number, opcionId: number) => void;
  nota: string;
  onNota: (valor: string) => void;
  foto: string;
  onFoto: (url: string) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [errorDeFoto, setErrorDeFoto] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  const subir = async (archivo: File | undefined) => {
    if (!archivo) {
      return;
    }
    setErrorDeFoto("");
    setSubiendo(true);
    try {
      const subida = await uploadsApi.subirReferencia(archivo);
      onFoto(subida.url);
    } catch (reason: unknown) {
      setErrorDeFoto(getErrorMessage(reason));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="space-y-5 border-t-[3px] border-borde pt-5">
      {grupos.map((grupo) => (
        <div key={grupo.id}>
          <p className="text-sm font-bold text-tinta-suave">
            {grupo.name}
            {grupo.required ? null : (
              <span className="ml-2 text-xs font-normal text-tinta-tenue">(opcional)</span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {grupo.options.map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                aria-pressed={elegidas[grupo.id] === opcion.id}
                onClick={() => onElegir(grupo.id, opcion.id)}
                className={`max-w-full break-words border-[3px] border-borde px-3 py-2 text-left text-sm font-bold ${
                  elegidas[grupo.id] === opcion.id
                    ? "bg-acento text-crema"
                    : "bg-superficie-alt text-tinta"
                }`}
              >
                {opcion.name}
                {/* El recargo va en el mismo botón y no en una lista aparte:
                    el precio tiene que estar donde se decide, no dos párrafos
                    más abajo. Un sabor sin recargo no dice nada (ADR-036). */}
                {textoDelRecargo(opcion) ? (
                  <span className="ml-2 font-normal opacity-80">{textoDelRecargo(opcion)}</span>
                ) : null}
              </button>
            ))}
          </div>
          {grupo.options.length === 0 ? (
            <p className="mt-2 border-[3px] border-dashed border-borde p-3 text-xs leading-5 text-tinta-suave">
              Andrea todavía no cargó opciones de {grupo.name.toLowerCase()}.
            </p>
          ) : null}
        </div>
      ))}

      <div>
        <label className="text-sm font-bold text-tinta-suave" htmlFor="nota-de-la-torta">
          ¿Cómo la querés?
        </label>
        <textarea
          id="nota-de-la-torta"
          className="field mt-2 min-h-24"
          value={nota}
          onChange={(evento) => onNota(evento.target.value)}
          placeholder="Contanos el diseño: colores, si lleva un cartel y qué dice, para quién es…"
        />
        {/* El contador mide lo que va a medir el servidor, no los caracteres
            tipeados: cada salto de línea viaja como " · " y ocupa tres. */}
        <p
          className={`mt-1 text-right text-xs ${
            notaParaElPedido(nota).length > TOPE_NOTA ? "font-bold text-acento" : "text-tinta-tenue"
          }`}
        >
          {notaParaElPedido(nota).length}/{TOPE_NOTA}
          {notaParaElPedido(nota).length > TOPE_NOTA
            ? " · se va a recortar: sacale algo o usá menos renglones"
            : ""}
        </p>
      </div>

      <div>
        <p className="text-sm font-bold text-tinta-suave">Foto de referencia (opcional)</p>
        <p className="mt-1 text-xs leading-5 text-tinta-suave">
          Si viste una torta que te gustó, mandala. JPG o PNG, hasta 2 MB.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-4">
          {foto ? (
            <img
              src={urlDeImagen(foto)}
              alt="Foto de referencia que subiste"
              className="h-24 w-24 border-[3px] border-borde object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center border-[3px] border-borde bg-superficie-alt">
              <ImageUp className="h-7 w-7 text-tinta-tenue" />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary px-3 py-2 text-sm"
              type="button"
              onClick={() => entrada.current?.click()}
              disabled={subiendo}
            >
              {subiendo ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ImageUp className="h-4 w-4" />
              )}
              {subiendo ? "Subiendo…" : foto ? "Cambiar" : "Elegir imagen"}
            </button>
            {foto ? (
              <button
                className="btn-secondary px-3 py-2 text-sm"
                type="button"
                onClick={() => onFoto("")}
              >
                <Trash2 className="h-4 w-4" />
                Quitar
              </button>
            ) : null}
          </div>
        </div>

        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(evento) => {
            void subir(evento.target.files?.[0]);
            // Sin esto, elegir el mismo archivo dos veces no dispara `change`.
            evento.target.value = "";
          }}
        />

        {errorDeFoto ? (
          <p className="mt-2 border-[3px] border-borde bg-superficie-alt px-3 py-2 text-xs leading-5 text-tinta">
            {errorDeFoto}
          </p>
        ) : null}
      </div>
    </div>
  );
}
