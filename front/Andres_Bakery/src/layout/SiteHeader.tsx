import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogIn, LogOut, Menu, ShoppingBag, Sparkles, UserPlus } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { ThemeSwitcher } from "../preferencias/ThemeSwitcher";
import { usePreferences } from "../preferencias/usePreferences";
import { ENLACES_ADMIN, ENLACES_DESTACADOS, ENLACES_TODOS } from "./enlaces";
import { NavDrawer } from "./NavDrawer";

export function SiteHeader() {
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const { itemCount, openCart } = useCart();
  const { isLoggedIn, logout, user } = useAuth();
  const { navModo } = usePreferences();

  const enlacesAdmin = user?.is_admin ? ENLACES_ADMIN : [];
  // En "barra" el drawer sigue existiendo para lo que no entra arriba y para el celular.
  const mostrarDestacados = navModo === "barra";

  return (
    <>
      <header className="sticky top-0 z-40 border-b-[3px] border-borde bg-superficie">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            className="btn-secondary p-2.5"
            onClick={() => setDrawerAbierto(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center gap-3">
            <div className="marco-foto flex h-11 w-11 items-center justify-center bg-acento text-crema">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-lg font-bold leading-tight tracking-tight text-tinta">Andres Bakery</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-tinta-tenue">Dulces de autor</p>
            </div>
          </Link>

          {mostrarDestacados ? (
            <nav className="ml-2 hidden items-center gap-1 md:flex">
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

          {/* Todo lo de la cuenta vive acá, pegado a la derecha, siempre en el mismo lugar. */}
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher className="hidden lg:flex" />

            <button type="button" className="btn-secondary relative p-2.5" onClick={openCart} aria-label={`Abrir carrito, ${itemCount} productos`}>
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 ? (
                <span className="absolute -bottom-2 -right-2 min-w-5 border-[3px] border-borde bg-acento px-1 text-xs font-bold leading-tight text-crema">
                  {itemCount}
                </span>
              ) : null}
            </button>

            {isLoggedIn ? (
              <>
                <span className="hidden border-[3px] border-borde bg-superficie-alt px-3 py-2 text-sm font-bold text-tinta sm:block">
                  {user?.name}
                </span>
                <button type="button" className="btn-secondary p-2.5" onClick={logout} aria-label="Cerrar sesión" title="Salir">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/ingresar" className="btn-primary px-3 py-2.5" title="Ingresar">
                  <LogIn className="h-5 w-5" />
                  <span className="hidden sm:inline">Ingresar</span>
                </Link>
                <Link to="/registro" className="btn-secondary hidden px-3 py-2.5 lg:inline-flex" title="Crear cuenta">
                  <UserPlus className="h-5 w-5" />
                  Crear cuenta
                </Link>
              </>
            )}
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
