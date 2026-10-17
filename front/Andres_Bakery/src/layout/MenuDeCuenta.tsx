import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, LogIn, LogOut, Settings, User, UserPlus } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { iniciales } from "../lib/iniciales";

/** El único botón de cuenta del header (ADR-021).
 *
 *  Antes arriba había cuatro cosas sueltas —el selector de estación, el nombre,
 *  salir y dos botones de ingreso— y el header no daba abasto. Ahora todo eso
 *  vive acá adentro: un círculo con las iniciales que abre el menú.
 */
export function MenuDeCuenta() {
  const { isLoggedIn, user, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  // Cambiar de página cierra el menú: si no, queda flotando sobre la pantalla nueva.
  useEffect(() => setAbierto(false), [pathname]);

  useEffect(() => {
    if (!abierto) {
      return;
    }
    const alTocarAfuera = (evento: MouseEvent) => {
      if (!caja.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    const alApretar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", alTocarAfuera);
    window.addEventListener("keydown", alApretar);
    return () => {
      document.removeEventListener("mousedown", alTocarAfuera);
      window.removeEventListener("keydown", alApretar);
    };
  }, [abierto]);

  const letras = iniciales(user?.name);
  const etiqueta = isLoggedIn ? `Tu cuenta, ${user?.name ?? ""}` : "Entrar o crear una cuenta";

  return (
    <div className="relative" ref={caja}>
      <button
        type="button"
        onClick={() => setAbierto((estaba) => !estaba)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={etiqueta}
        title={etiqueta}
        className={`flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-borde font-display text-sm font-bold transition ${
          abierto || isLoggedIn ? "bg-acento text-crema" : "bg-superficie-alt text-tinta hover:bg-superficie"
        }`}
      >
        {isLoggedIn && letras ? letras : <User className="h-5 w-5" />}
      </button>

      {abierto ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 border-[3px] border-borde bg-superficie p-2 shadow-[6px_6px_0_0_var(--color-sombra)]"
        >
          {isLoggedIn ? (
            <>
              <p className="truncate px-3 py-2 text-xs uppercase tracking-[0.2em] text-tinta-tenue">
                {user?.name}
              </p>
              <Opcion to="/cuenta" icono={User} texto="Perfil" />
              {user?.is_admin ? (
                <Opcion to="/admin" icono={LayoutDashboard} texto="Administrador" />
              ) : null}
              <Opcion to="/configuracion" icono={Settings} texto="Configuración" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAbierto(false);
                  logout();
                }}
                className="mt-1 flex w-full items-center gap-3 border-t-[3px] border-borde px-3 py-3 text-left text-sm font-bold text-tinta hover:bg-superficie-alt"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </>
          ) : (
            <>
              <Opcion to="/ingresar" icono={LogIn} texto="Ingresar" />
              <Opcion to="/registro" icono={UserPlus} texto="Crear cuenta" />
              <Opcion to="/configuracion" icono={Settings} texto="Configuración" />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Opcion({
  to,
  icono: Icono,
  texto,
}: {
  to: string;
  icono: typeof User;
  texto: string;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-3 px-3 py-3 text-sm font-bold text-tinta hover:bg-superficie-alt"
    >
      <Icono className="h-4 w-4" />
      {texto}
    </Link>
  );
}
