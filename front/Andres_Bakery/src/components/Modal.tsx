import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Un pop-up para editar sin perder de vista lo que había atrás.
 *
 *  Es un `<dialog>` nativo y no un `<div>` con `position: fixed`, y la razón
 *  es toda de accesibilidad: el navegador ya sabe **atrapar el foco** adentro,
 *  cerrar con Escape, marcar el resto de la página como inerte y devolver el
 *  foco al botón que lo abrió. Reimplementar eso a mano es la clase de cosa
 *  que funciona con el mouse y deja afuera a quien usa teclado o lector de
 *  pantalla.
 *
 *  **Solo se usa en pantallas grandes** (ver `usePantallaGrande`): en un
 *  celular un formulario largo adentro de un pop-up es peor que en la página,
 *  porque el teclado virtual se come la mitad de la pantalla.
 */
export function Modal({
  abierto,
  titulo,
  descripcion,
  onCerrar,
  children,
  pie,
}: {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  children: ReactNode;
  /** Lo que queda fijo abajo: los botones de guardar. Sin esto, en un
   *  formulario largo hay que scrollear hasta el fondo para guardar. */
  pie?: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) {
      return;
    }
    if (abierto && !elemento.open) {
      elemento.showModal();
    }
    if (!abierto && elemento.open) {
      elemento.close();
    }
  }, [abierto]);

  /** El scroll del fondo se bloquea a mano: `showModal` hace inerte el resto
   *  de la página pero no impide que la rueda del mouse la mueva detrás. */
  useEffect(() => {
    if (!abierto) {
      return;
    }
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [abierto]);

  return (
    <dialog
      ref={dialogo}
      className="modal-pixel"
      aria-label={titulo}
      // `cancel` es Escape: se deja que cierre, pero avisándole al padre para
      // que su estado no quede diciendo que sigue abierto.
      onCancel={(evento) => {
        evento.preventDefault();
        onCerrar();
      }}
      onClose={onCerrar}
      onClick={(evento) => {
        // Clic en el fondo = cerrar. El `<dialog>` ocupa toda la pantalla y
        // su ::backdrop no recibe eventos, así que el fondo *es* el dialog.
        if (evento.target === dialogo.current) {
          onCerrar();
        }
      }}
    >
      <div className="flex max-h-[88vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b-[3px] border-borde px-6 py-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-tinta">{titulo}</h2>
            {descripcion ? (
              <p className="mt-1 text-xs leading-5 text-tinta-suave">{descripcion}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn-secondary shrink-0 p-2"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {pie ? (
          <div className="border-t-[3px] border-borde bg-superficie-alt px-6 py-4">{pie}</div>
        ) : null}
      </div>
    </dialog>
  );
}
