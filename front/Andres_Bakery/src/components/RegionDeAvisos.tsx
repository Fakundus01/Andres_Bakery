import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useAvisos } from "../contexts/AvisosContext";
import type { TonoDeAviso } from "../lib/avisos";

const COLOR: Record<TonoDeAviso, string> = {
  exito: "bg-exito-suave",
  error: "bg-error-suave",
  aviso: "bg-alerta-suave",
};

const ICONO: Record<TonoDeAviso, typeof CircleCheck> = {
  exito: CircleCheck,
  error: CircleAlert,
  aviso: Info,
};

export function RegionDeAvisos() {
  const { avisos, descartar } = useAvisos();

  return (
    /* La región existe siempre, vacía incluso: un `aria-live` que aparece
       junto con su contenido no se anuncia en varios lectores de pantalla.
       `bottom` y no `top` porque a 390px arriba están el header y el carrito. */
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4"
    >
      {avisos.map((aviso) => {
        const Icono = ICONO[aviso.tono];
        return (
          <div
            key={aviso.id}
            /* El error va como `alert` para que se anuncie sin esperar turno;
               el resto queda en el `polite` de la región (C5). */
            role={aviso.tono === "error" ? "alert" : "status"}
            /* Sin `pointer-events-auto` en el cartel: medido a 390px, el aviso
               se dibujaba encima de «Ir al checkout» del carrito y se comía el
               clic, así que agregar algo bloqueaba el camino a pagar por
               cuatro segundos. Lo clickeable son el link y la X, nada más. */
            className={`pixel-panel-plano pointer-events-none flex w-full max-w-md items-start gap-3 px-4 py-3 text-sm text-tinta ${COLOR[aviso.tono]}`}
          >
            <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {/* `min-w-0` y `break-words`: sin las dos, un nombre de producto
                de 40 caracteres sin espacios desbordaba la PÁGINA 242px a
                390px y mandaba la X a x=396, o sea el aviso no se podía
                cerrar (lo midió el review de T23). Es el desborde clásico de
                flexbox: el hijo no baja de su `min-content` salvo que se le
                diga, y el texto no corta palabras salvo que se le diga. */}
            <div className="min-w-0 flex-1">
              <p className="break-words font-bold">{aviso.texto}</p>
              {/* El link es una capacidad del mecanismo que hoy NO usa nadie:
                  el aviso del carrito lo perdió a propósito (ADR-037) porque
                  se dibujaba encima de los botones del carrito abierto. Quien
                  vuelva a pasar un link tiene que volver a medir a 390px el
                  robo de clics sobre «Ir al checkout» y «Ayuda». */}
              {aviso.link ? (
                <Link
                  to={aviso.link.href}
                  onClick={() => descartar(aviso.id)}
                  className="pointer-events-auto mt-1 inline-block font-bold text-acento underline"
                >
                  {aviso.link.texto}
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => descartar(aviso.id)}
              aria-label={`Cerrar el aviso «${aviso.texto}»`}
              className="pointer-events-auto shrink-0 cursor-pointer text-tinta-suave hover:text-tinta"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
