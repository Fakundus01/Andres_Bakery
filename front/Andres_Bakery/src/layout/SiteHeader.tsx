import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogIn, LogOut, Menu, ShoppingBag, Sparkles, X } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const { isLoggedIn, logout, user } = useAuth();

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/tienda", label: "Tienda" },
    { to: "/pedidos", label: "Pedidos" },
    ...(user?.is_admin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-lg shadow-stone-900/10 transition-transform duration-300 group-hover:-translate-y-1">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold tracking-tight text-stone-950">Andres Bakery</p>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Dulces de autor</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-stone-200/80 bg-white/80 px-2 py-2 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button className="btn-secondary" type="button" onClick={openCart}>
            <ShoppingBag className="h-4 w-4" />
            Carrito ({itemCount})
          </button>
          {isLoggedIn ? (
            <>
              <span className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600">
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
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-900 md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-stone-200/70 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isActive ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
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
