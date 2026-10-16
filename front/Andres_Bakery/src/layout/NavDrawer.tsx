import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";

import type { EnlaceNav } from "./enlaces";

export function NavDrawer({
  abierto,
  onCerrar,
  enlaces,
  enlacesAdmin,
}: {
  abierto: boolean;
  onCerrar: () => void;
  enlaces: EnlaceNav[];
  enlacesAdmin: EnlaceNav[];
}) {
  // Escape cierra: si no, con el panel abierto el teclado queda sin salida.
  useEffect(() => {
    if (!abierto) {
      return;
    }
    const alApretar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        onCerrar();
      }
    };
    window.addEventListener("keydown", alApretar);
    return () => window.removeEventListener("keydown", alApretar);
  }, [abierto, onCerrar]);

  if (!abierto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-tinta/40" onClick={onCerrar}>
      <nav
        className="absolute left-0 top-0 flex h-full w-[min(300px,85vw)] flex-col border-r-[4px] border-borde bg-superficie p-5"
        onClick={(evento) => evento.stopPropagation()}
        aria-label="Menú principal"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl font-bold text-tinta">Menú</p>
          <button type="button" className="btn-secondary p-2" onClick={onCerrar} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {enlaces.map((enlace) => (
            <EnlaceDrawer key={enlace.to} enlace={enlace} onCerrar={onCerrar} />
          ))}
        </div>

        {enlacesAdmin.length > 0 ? (
          <>
            <p className="mt-7 border-t-[3px] border-borde pt-4 text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">
              Solo Andrea
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {enlacesAdmin.map((enlace) => (
                <EnlaceDrawer key={enlace.to} enlace={enlace} onCerrar={onCerrar} />
              ))}
            </div>
          </>
        ) : null}
      </nav>
    </div>
  );
}

function EnlaceDrawer({ enlace, onCerrar }: { enlace: EnlaceNav; onCerrar: () => void }) {
  const Icono = enlace.icono;
  return (
    <NavLink
      to={enlace.to}
      onClick={onCerrar}
      className={({ isActive }) =>
        `flex items-center gap-3 border-[3px] border-borde px-4 py-3 text-sm font-bold ${
          isActive ? "bg-acento text-crema" : "bg-superficie-alt text-tinta hover:bg-superficie"
        }`
      }
    >
      <Icono className="h-4 w-4" />
      {enlace.label}
    </NavLink>
  );
}
