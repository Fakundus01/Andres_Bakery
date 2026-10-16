import { Cookie, Home, LayoutDashboard, Package, Settings, Sparkles } from "lucide-react";
import type { ComponentType } from "react";

export type EnlaceNav = {
  to: string;
  label: string;
  icono: ComponentType<{ className?: string }>;
};

/** Los que viven arriba cuando el modo es "barra": lo que trae gente, nada más. */
export const ENLACES_DESTACADOS: EnlaceNav[] = [
  { to: "/tienda", label: "Carta", icono: Cookie },
  { to: "/historia", label: "Andrea", icono: Sparkles },
];

/** El menú completo del drawer. */
export const ENLACES_TODOS: EnlaceNav[] = [
  { to: "/", label: "Inicio", icono: Home },
  ...ENLACES_DESTACADOS,
  { to: "/pedidos", label: "Mis pedidos", icono: Package },
  { to: "/configuracion", label: "Configuración", icono: Settings },
];

export const ENLACES_ADMIN: EnlaceNav[] = [{ to: "/admin", label: "Panel", icono: LayoutDashboard }];
