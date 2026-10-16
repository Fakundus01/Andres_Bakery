import { Navigate, Route, Routes } from "react-router-dom";

import { AyudaPanel } from "../components/AyudaPanel";
import { CartDrawer } from "../components/CartDrawer";
import { AboutPage } from "../pages/AboutPage";
import { AdminPage } from "../pages/admin/AdminPage";
import { CarritoPage } from "../pages/CarritoPage";
import { CheckoutPage } from "../pages/CheckoutPage";
import { ConfiguracionPage } from "../pages/ConfiguracionPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { OrdersPage } from "../pages/OrdersPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ShopPage } from "../pages/ShopPage";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function AppShell() {
  return (
    <div className="relative flex min-h-screen flex-col text-tinta">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tienda" element={<ShopPage />} />
          <Route path="/historia" element={<AboutPage />} />
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
      <SiteFooter />
      <CartDrawer />
      <AyudaPanel />
    </div>
  );
}
