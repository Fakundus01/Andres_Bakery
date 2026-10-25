import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useEffect, useRef, type FocusEvent } from "react";
import { Link } from "react-router-dom";

import { useAvisos } from "../contexts/AvisosContext";
import { aDondeVuelveElFoco, type TonoDeAviso } from "../lib/avisos";

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

/** El id del aviso que tiene el foco del teclado adentro, o `null`.
 *
 *  Se lee del DOM y no del estado porque el foco **es** del DOM: quién está
 *  enfocado no lo sabe React, lo sabe el navegador. El `data-aviso` del cartel
 *  es lo que conecta el elemento enfocado con el aviso de la cola. */
function idDelAvisoEnfocado(): string | null {
  const activo = document.activeElement;
  if (!(activo instanceof HTMLElement)) {
    return null;
  }
  return activo.closest<HTMLElement>("[data-aviso]")?.dataset.aviso ?? null;
}

export function RegionDeAvisos() {
  const { avisos, descartar, retener, liberar, escapar } = useAvisos();
  // Dónde estaba el foco antes de entrar al aviso. Es un `ref` y no estado:
  // cambiarlo no tiene que redibujar nada.
  const vueltaDelFoco = useRef<HTMLElement | null>(null);

  /** Devuelve el foco a donde estaba, ANTES de que React desmonte el cartel:
   *  al revés el nodo ya no existe y el foco cae a `body`, que es la mitad del
   *  hallazgo 7 del review de T23 (WCAG 2.4.3). */
  const devolverElFoco = () => {
    const destino = aDondeVuelveElFoco(vueltaDelFoco.current, document.body);
    vueltaDelFoco.current = null;
    destino?.focus();
  };

  const cerrar = (id: string) => {
    // El foco está en la X que se acaba de apretar —con mouse también, los
    // botones se enfocan al clickearlos—, así que se devuelve igual.
    devolverElFoco();
    // Se suelta a mano: si el foco no llegó a moverse a ningún lado, el
    // navegador no dispara `focusout` y la retención quedaría colgada.
    liberar("foco");
    descartar(id);
  };

  // `relatedTarget` en el `focusin` es quien PERDÍA el foco: ahí vuelve cuando
  // el aviso se cierre. Solo se guarda si venía de afuera de la región, para
  // que moverse de la X de un cartel a la de otro no pise el destino.
  const alEntrarElFoco = (evento: FocusEvent<HTMLDivElement>) => {
    if (!evento.currentTarget.contains(evento.relatedTarget)) {
      vueltaDelFoco.current =
        evento.relatedTarget instanceof HTMLElement ? evento.relatedTarget : null;
    }
    retener("foco");
  };

  const alSalirElFoco = (evento: FocusEvent<HTMLDivElement>) => {
    // Pasar de un cartel al de al lado sigue siendo estar adentro.
    if (!evento.currentTarget.contains(evento.relatedTarget)) {
      liberar("foco");
    }
  };

  // Escape cierra (D30). El listener es del documento y no un `onKeyDown` del
  // cartel porque el cartel casi nunca tiene el foco, y `cerrarConEscape`
  // distingue los dos casos: con el foco adentro cierra ese aviso, con el foco
  // afuera se lleva los que se iban a ir solos y deja el error (C3).
  useEffect(() => {
    const alApretarUnaTecla = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") {
        return;
      }
      const enfocado = idDelAvisoEnfocado();
      if (enfocado) {
        devolverElFoco();
        liberar("foco");
      }
      escapar(enfocado);
    };
    document.addEventListener("keydown", alApretarUnaTecla);
    return () => document.removeEventListener("keydown", alApretarUnaTecla);
  }, [escapar, liberar]);

  return (
    /* La región existe siempre, vacía incluso: un `aria-live` que aparece
       junto con su contenido no se anuncia en varios lectores de pantalla.
       `bottom` y no `top` porque a 390px arriba están el header y el carrito. */
    <div
      aria-live="polite"
      aria-atomic="false"
      onFocus={alEntrarElFoco}
      onBlur={alSalirElFoco}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4"
    >
      {avisos.map((aviso) => {
        const Icono = ICONO[aviso.tono];
        return (
          <div
            key={aviso.id}
            /* Lo que conecta el elemento enfocado con el aviso de la cola. */
            data-aviso={aviso.id}
            /* El error va como `alert` para que se anuncie sin esperar turno;
               el resto queda en el `polite` de la región (C5). */
            role={aviso.tono === "error" ? "alert" : "status"}
            /* Sin `pointer-events-auto` en el cartel: medido a 390px, el aviso
               se dibujaba encima de «Ir al checkout» del carrito y se comía el
               clic, así que agregar algo bloqueaba el camino a pagar por
               cuatro segundos. Lo clickeable son el link y la X, nada más.
               Consecuencia de esa decisión: el mouse sobre el CARTEL no se
               puede detectar —no recibe eventos de puntero—, así que la pausa
               por mouse (D30) vive en el link y en la X, que sí los reciben. */
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
                  onClick={() => cerrar(aviso.id)}
                  onMouseEnter={() => retener("mouse")}
                  onMouseLeave={() => liberar("mouse")}
                  className="pointer-events-auto mt-1 inline-block font-bold text-acento underline"
                >
                  {aviso.link.texto}
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => cerrar(aviso.id)}
              onMouseEnter={() => retener("mouse")}
              onMouseLeave={() => liberar("mouse")}
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
