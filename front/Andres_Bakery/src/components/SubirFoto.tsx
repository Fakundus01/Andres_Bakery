import { useRef, useState, type DragEvent } from "react";
import { ImageUp, LoaderCircle, Trash2 } from "lucide-react";

import { uploadsApi } from "../lib/api";
import { getErrorMessage } from "../lib/format";
import { urlDeImagen } from "../lib/imagenes";

/** Subir una foto sin salir del panel (F45, F49).
 *
 *  Acepta arrastrar y soltar y también el botón, porque arrastrar no existe en
 *  celular. El campo de texto con la URL **sigue estando** en el formulario:
 *  si ella ya tiene la foto en otro lado, pegar el link sigue siendo válido y
 *  más rápido que subirla de nuevo.
 */
export function SubirFoto({
  valor,
  onSubida,
  onBorrar,
  token,
  etiqueta = "Foto",
}: {
  valor: string;
  onSubida: (url: string) => void;
  onBorrar: () => void;
  token: string;
  etiqueta?: string;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [encima, setEncima] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const subir = async (archivo: File | undefined) => {
    if (!archivo) {
      return;
    }
    setError("");
    setSubiendo(true);
    try {
      const subida = await uploadsApi.subirImagen(archivo, token);
      onSubida(subida.url);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    } finally {
      setSubiendo(false);
    }
  };

  const alSoltar = (evento: DragEvent<HTMLDivElement>) => {
    evento.preventDefault();
    setEncima(false);
    void subir(evento.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-3">
      <div
        className="border-[3px] border-dashed p-4 transition-colors"
        style={{ borderColor: encima ? "var(--color-acento)" : "var(--color-borde)" }}
        onDragOver={(evento) => {
          evento.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={alSoltar}
      >
        <div className="flex flex-wrap items-center gap-4">
          {valor ? (
            <img
              src={urlDeImagen(valor)}
              alt={`${etiqueta} cargada`}
              className="h-24 w-24 border-[3px] border-borde object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center border-[3px] border-borde bg-superficie-alt">
              <ImageUp className="h-7 w-7 text-tinta-tenue" />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <p className="text-sm font-bold text-tinta">{etiqueta}</p>
            <p className="text-xs leading-5 text-tinta-suave">
              Arrastrá la imagen acá o elegila del dispositivo. JPG o PNG, hasta 4 MB.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-secondary px-3 py-2 text-sm"
                type="button"
                onClick={() => entrada.current?.click()}
                disabled={subiendo}
              >
                {subiendo ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
                {subiendo ? "Subiendo…" : "Elegir imagen"}
              </button>
              {valor ? (
                <button className="btn-secondary px-3 py-2 text-sm" type="button" onClick={onBorrar}>
                  <Trash2 className="h-4 w-4" />
                  Quitar
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(evento) => {
            void subir(evento.target.files?.[0]);
            evento.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p className="border-[3px] border-borde bg-superficie-alt px-3 py-2 text-xs leading-5 text-tinta">{error}</p>
      ) : null}
    </div>
  );
}
