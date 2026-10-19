import { Link } from "react-router-dom";

import { urlDeImagen } from "../lib/imagenes";

/** Lo que se eligió para un renglón, dicho igual en los tres lugares donde
 *  se lee: el cajón del carrito, la página del carrito y el panel de Andrea
 *  (F19a, F58).
 *
 *  Recibe texto ya armado y no un `CartItem` ni un `OrderItem` a propósito:
 *  en el carrito los sabores son objetos y en el pedido son nombres
 *  copiados (ADR-031). La pantalla tiene que mostrar lo mismo en los dos
 *  casos, y era el lugar donde se iban a desincronizar.
 */
export function DetalleDelRenglon({
  tamano,
  elegidas,
  nota,
  foto,
  rearmarEn,
}: {
  tamano?: string | null;
  elegidas?: string[];
  nota?: string | null;
  foto?: string | null;
  /** Slug del producto: con esto, el renglón ofrece volver a la ficha. Solo
   *  lo pasa el carrito; en el panel de Andrea no tiene sentido. */
  rearmarEn?: string;
}) {
  const sinNada = !tamano && !elegidas?.length && !nota && !foto;
  if (sinNada) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1 text-xs leading-5 text-tinta-suave">
      {tamano ? <p className="font-bold text-tinta">{tamano}</p> : null}
      {elegidas?.length ? <p>{elegidas.join(" · ")}</p> : null}
      {nota ? <p className="break-words italic">“{nota}”</p> : null}
      {rearmarEn ? (
        /* La salida de los tres callejones sin salida que encontró el review
           de T18: la foto se barre a las 24 h, o Andrea borra el sabor que el
           carrito tenía, y el pedido vuelve 400 en el checkout con un mensaje
           que pide algo que esta pantalla no puede hacer. Desde acá se rearma
           en la ficha, que es donde está el control. */
        <Link to={`/producto/${rearmarEn}`} className="inline-block font-bold underline">
          Cambiar lo elegido
        </Link>
      ) : null}
      {foto ? (
        <a
          href={urlDeImagen(foto)}
          target="_blank"
          rel="noreferrer"
          className="inline-block"
          title="Ver la foto de referencia en grande"
        >
          <img
            src={urlDeImagen(foto)}
            alt="Foto de referencia del pedido"
            className="h-16 w-16 border-[3px] border-borde object-cover"
          />
        </a>
      ) : null}
    </div>
  );
}
