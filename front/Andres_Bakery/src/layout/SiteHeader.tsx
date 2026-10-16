import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogIn, LogOut, Menu, ShoppingBag, Sparkles, X } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { ThemeSwitcher } from "../theme/ThemeSwitcher";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const { isLoggedIn, logout, user } = useAuth();

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/tienda", label: "Tienda" },
    { to: "/historia", label: "Andrea" },
    { to: "/pedidos", label: "Pedidos" },
    ...(user?.is_admin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-borde bg-superficie">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="marco-foto flex h-12 w-12 items-center justify-center bg-acento text-crema">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-xl font-bold tracking-tight text-tinta">Andres Bakery</p>
            <p className="text-xs uppercase tracking-[0.3em] text-tinta-tenue">Dulces de autor</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 border-[3px] border-borde bg-superficie-alt p-1 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-acento text-crema"
                    : "text-tinta-suave hover:bg-superficie hover:text-tinta"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeSwitcher />
          <button className="btn-secondary" type="button" onClick={openCart}>
            <ShoppingBag className="h-4 w-4" />
            Carrito ({itemCount})
          </button>
          {isLoggedIn ? (
            <>
              <span className="border-[3px] border-borde bg-superficie-alt px-4 py-2 text-sm font-bold text-tinta-suave">
                {user?.name}
              </span>
              <button className="btn-secondary" type="button" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </>
          ) : (
            <Link to="/ingresar" className="btn-primary">
              <LogIn className="h-4 w-4" />
              Ingresar
            </Link>
          )}
        </div>

        <button
          type="button"
          className="marco-foto inline-flex h-11 w-11 items-center justify-center bg-superficie text-tinta lg:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t-[3px] border-borde bg-superficie px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-2">
            <ThemeSwitcher className="self-start" />
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `border-[3px] border-borde px-4 py-3 text-sm font-bold ${
                    isActive ? "bg-acento text-crema" : "bg-superficie-alt text-tinta-suave"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button className="btn-secondary mt-2" type="button" onClick={openCart}>
              <ShoppingBag className="h-4 w-4" />
              Abrir carrito ({itemCount})
            </button>
            {isLoggedIn ? (
              <button className="btn-secondary" type="button" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            ) : (
              <Link to="/ingresar" className="btn-primary" onClick={() => setMobileOpen(false)}>
                <LogIn className="h-4 w-4" />
                Ingresar
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
