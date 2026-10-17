import { NavLink } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import type { PanelLateral } from "../preferencias/PreferencesProvider";
import type { EnlaceNav } from "./enlaces";

/** El panel lateral de escritorio (ADR-021).
 *
 *  Dos modos, elegibles desde Configuración:
 *  - **fijo**: ocupa su lugar y no se mueve nunca.
 *  - **al pasar el mouse**: queda una cinta angosta y el panel se despliega
 *    encima del contenido cuando te acercás.
 *
 *  En "al pasar el mouse" el panel se dibuja **sobre** el contenido y el lugar
 *  reservado no cambia: si empujara la página al abrirse, cada acercada del
 *  mouse movería todo el texto de lugar. Es el mismo problema que las tarjetas
 *  que temblaban.
 *
 *  En celular no existe: ahí el menú es la hamburguesa (`NavDrawer`).
 */
export function NavLateral({
  enlaces,
  enlacesAdmin,
  modo,
}: {
  enlaces: EnlaceNav[];
  enlacesAdmin: EnlaceNav[];
  modo: PanelLateral;
}) {
  const fijo = modo === "fijo";

  return (
    <div
      className={`relative hidden shrink-0 lg:block ${fijo ? "w-64" : "w-7"}`}
      data-modo={modo}
    >
      <nav
        aria-label="Menú lateral"
        className={`group sticky top-[var(--alto-header)] flex h-[calc(100vh-var(--alto-header))] flex-col gap-2 overflow-x-hidden overflow-y-auto border-r-[3px] border-borde bg-superficie p-3 transition-[width] duration-150 ${
          fijo ? "w-64" : "w-7 hover:w-64 focus-within:w-64"
        }`}
      >
        {fijo ? null : (
          <span
            className="flex items-center justify-center py-2 text-tinta-tenue group-hover:hidden group-focus-within:hidden"
            aria-hidden="true"
          >
            <ChevronRight className="h-4 w-4" />
          </span>
        )}

        <div
          /* Se desvanece, pero NO con visibility:hidden: eso lo saca del
             tabulador y entonces el panel escondido no se puede abrir con el
             teclado. Con opacidad, un Tab enfoca el primer link, dispara
             focus-within y el panel se abre solo. */
          className={`flex flex-col gap-2 transition-opacity duration-150 ${
            fijo ? "" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
        >
          {enlaces.map((enlace) => (
            <EnlaceLateral key={enlace.to} enlace={enlace} />
          ))}

          {enlacesAdmin.length > 0 ? (
            <>
              <p className="mt-4 whitespace-nowrap border-t-[3px] border-borde pt-3 text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">
                Solo Andrea
              </p>
              {enlacesAdmin.map((enlace) => (
                <EnlaceLateral key={enlace.to} enlace={enlace} />
              ))}
            </>
          ) : null}
        </div>
      </nav>
    </div>
  );
}

function EnlaceLateral({ enlace }: { enlace: EnlaceNav }) {
  const Icono = enlace.icono;
  return (
    <NavLink
      to={enlace.to}
      className={({ isActive }) =>
        `flex items-center gap-3 whitespace-nowrap border-[3px] border-borde px-3 py-3 text-sm font-bold ${
          isActive ? "bg-acento text-crema" : "bg-superficie-alt text-tinta hover:bg-superficie"
        }`
      }
    >
      <Icono className="h-4 w-4 shrink-0" />
      {enlace.label}
    </NavLink>
  );
}
