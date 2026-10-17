import { Link, Navigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Mail, Package, Settings, User } from "lucide-react";

import { SectionHeading } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { iniciales } from "../lib/iniciales";

/** El perfil de quien está usando el sitio (ADR-021).
 *
 *  No inventa nada que no tengamos: hoy una cuenta son el nombre y el mail, y
 *  eso es lo que se muestra. Lo demás son las puertas a donde esa persona
 *  puede ir desde acá.
 */
export function CuentaPage() {
  const { isLoggedIn, user, logout } = useAuth();

  if (!isLoggedIn || !user) {
    return <Navigate to="/ingresar" replace />;
  }

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading eyebrow="Tu cuenta" title="Perfil" description="Tus datos y tus accesos." />

      <section className="pixel-panel flex flex-wrap items-center gap-5 p-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[3px] border-borde bg-acento font-display text-2xl font-bold text-crema">
          {iniciales(user.name) || <User className="h-8 w-8" />}
        </div>
        <div className="min-w-0">
          <p className="font-display text-3xl font-bold text-tinta">{user.name}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-tinta-suave">
            <Mail className="h-4 w-4 text-acento" />
            <span className="truncate">{user.email}</span>
          </p>
          {user.is_admin ? (
            <span className="mt-3 inline-flex border-[3px] border-borde bg-superficie-alt px-2 py-1 text-xs font-bold text-tinta">
              Cuenta de administradora
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Acceso
          to="/pedidos"
          icono={Package}
          titulo="Mis pedidos"
          detalle="Todo lo que encargaste y en qué estado está."
        />
        <Acceso
          to="/configuracion"
          icono={Settings}
          titulo="Configuración"
          detalle="Estación, tipografía, tamaño de letra y dónde va el menú."
        />
        {user.is_admin ? (
          <Acceso
            to="/admin"
            icono={LayoutDashboard}
            titulo="Administrador"
            detalle="La carta, los pedidos, las métricas y tu perfil público."
          />
        ) : null}
      </section>

      <button type="button" className="btn-secondary" onClick={logout}>
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  );
}

function Acceso({
  to,
  icono: Icono,
  titulo,
  detalle,
}: {
  to: string;
  icono: typeof Package;
  titulo: string;
  detalle: string;
}) {
  return (
    <Link to={to} className="pixel-panel block p-5 transition hover:bg-superficie-alt">
      <p className="flex items-center gap-3 font-display text-2xl font-bold text-tinta">
        <Icono className="h-5 w-5 text-acento" />
        {titulo}
      </p>
      <p className="mt-2 text-sm leading-6 text-tinta-suave">{detalle}</p>
    </Link>
  );
}
