import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { AyudaPanel } from "../components/AyudaPanel";
import { CartDrawer } from "../components/CartDrawer";
import { useAuth } from "../contexts/AuthContext";
import { AboutPage } from "../pages/AboutPage";
import { AdminPage } from "../pages/admin/AdminPage";
import { CarritoPage } from "../pages/CarritoPage";
import { CheckoutPage } from "../pages/CheckoutPage";
import { ConfiguracionPage } from "../pages/ConfiguracionPage";
import { CuentaPage } from "../pages/CuentaPage";
import { CvPage } from "../pages/CvPage";
import { HomePage } from "../pages/HomePage";
import { ProductPage } from "../pages/ProductPage";
import { LoginPage } from "../pages/LoginPage";
import { OrdersPage } from "../pages/OrdersPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ShopPage } from "../pages/ShopPage";
import { useContarVisitas } from "../lib/useContarVisitas";
import { usePreferences } from "../preferencias/usePreferences";
import { ENLACES_ADMIN, ENLACES_TODOS } from "./enlaces";
import { NavLateral } from "./NavLateral";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function AppShell() {
  useContarVisitas();
  const { navModo, panelLateral } = usePreferences();
  const { user } = useAuth();

  /** El panel es un espacio de trabajo, no una página de lectura: usa todo el
   *  ancho de la pantalla. En el sitio público el ancho sigue acotado —una
   *  línea de texto de 2000px no se lee— pero más holgado que antes, que en un
   *  monitor grande dejaba la página flotando en el medio. */
  const { pathname } = useLocation();
  const anchoDelMain = pathname.startsWith("/admin")
    ? "max-w-none"
    : "max-w-7xl xl:max-w-[88rem] 2xl:max-w-[104rem]";

  return (
    <div className="relative flex min-h-screen flex-col text-tinta">
      <SiteHeader />

      <div className="flex flex-1">
        {navModo === "drawer" ? (
          <NavLateral
            enlaces={ENLACES_TODOS}
            enlacesAdmin={user?.is_admin ? ENLACES_ADMIN : []}
            modo={panelLateral}
          />
        ) : null}

        {/* min-w-0: sin esto, un gráfico o una tabla ancha estiran la columna
            y el panel lateral termina empujando la página fuera de pantalla. */}
        <main
          className={`mx-auto flex w-full min-w-0 flex-1 flex-col px-4 pb-24 pt-8 sm:px-6 lg:px-8 ${anchoDelMain}`}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tienda" element={<ShopPage />} />
            <Route path="/producto/:slug" element={<ProductPage />} />
            <Route path="/historia" element={<AboutPage />} />
            <Route path="/cv" element={<CvPage />} />
            <Route path="/cuenta" element={<CuentaPage />} />
            <Route path="/configuracion" element={<ConfiguracionPage />} />
            <Route path="/carrito" element={<CarritoPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/pedidos" element={<OrdersPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/ingresar" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <SiteFooter />
      <CartDrawer />
      <AyudaPanel />
    </div>
  );
}
