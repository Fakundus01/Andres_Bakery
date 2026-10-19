import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, ShoppingBag } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { usePreferences } from "../preferencias/usePreferences";
import { ENLACES_ADMIN, ENLACES_DESTACADOS, ENLACES_TODOS } from "./enlaces";
import { MenuDeCuenta } from "./MenuDeCuenta";
import { NavDrawer } from "./NavDrawer";

/** El header tiene tres cosas y nada más (ADR-021): el menú (solo en celular),
 *  la marca, y a la derecha el carrito y la cuenta.
 *
 *  Lo que estaba suelto acá arriba —el selector de estación, el nombre, salir,
 *  ingresar y crear cuenta— se fue: la estación a Configuración y el resto
 *  adentro del círculo de la cuenta. */
export function SiteHeader() {
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const { itemCount } = useCart();
  const { user } = useAuth();
  const { navModo } = usePreferences();

  const enlacesAdmin = user?.is_admin ? ENLACES_ADMIN : [];

  return (
    <>
      <header className="sticky top-0 z-40 flex min-h-[var(--alto-header)] items-center border-b-[3px] border-borde bg-superficie">
        <div className="mx-auto flex w-full max-w-7xl xl:max-w-[88rem] 2xl:max-w-[104rem] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* La hamburguesa es del celular. En pantalla grande el menú está en
              la barra o en el panel lateral, y un botón más sería ruido. */}
          <button
            type="button"
            className="btn-secondary p-2.5 lg:hidden"
            onClick={() => setDrawerAbierto(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* El logo que mandó Andrea, no un ícono prestado. Venía en JPEG con
              fondo negro de WhatsApp: se le devolvió la transparencia y se
              recortó el aire sobrante. El original queda intacto en
              `material-cliente/logo/`.

              El nombre sigue escrito al lado: a 44px de alto las letras del
              logo no se leen, y el logo solo no dice dónde está parado. */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo-andres-bakery.png"
              alt="Andres Bakery"
              className="h-11 w-auto shrink-0"
              width={75}
              height={44}
            />
            <div className="hidden sm:block">
              <p className="font-display text-lg font-bold leading-tight tracking-tight text-tinta">Andres Bakery</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-tinta-tenue">Dulces de autor</p>
            </div>
          </Link>

          {navModo === "barra" ? (
            <nav className="ml-2 hidden items-center gap-1 lg:flex">
              {ENLACES_DESTACADOS.map((enlace) => (
                <NavLink
                  key={enlace.to}
                  to={enlace.to}
                  className={({ isActive }) =>
                    `border-[3px] border-borde px-4 py-2 text-sm font-bold ${
                      isActive ? "bg-acento text-crema" : "bg-superficie-alt text-tinta hover:bg-superficie"
                    }`
                  }
                >
                  {enlace.label}
                </NavLink>
              ))}
            </nav>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/carrito"
              className="btn-secondary relative p-2.5"
              aria-label={`Ver el carrito, ${itemCount} productos`}
              title="Ver el carrito"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 ? (
                <span className="absolute -bottom-2 -right-2 min-w-5 border-[3px] border-borde bg-acento px-1 text-xs font-bold leading-tight text-crema">
                  {itemCount}
                </span>
              ) : null}
            </Link>

            <MenuDeCuenta />
          </div>
        </div>
      </header>

      <NavDrawer
        abierto={drawerAbierto}
        onCerrar={() => setDrawerAbierto(false)}
        enlaces={ENLACES_TODOS}
        enlacesAdmin={enlacesAdmin}
      />
    </>
  );
}
