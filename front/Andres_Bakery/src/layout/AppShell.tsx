import { Navigate, Route, Routes } from "react-router-dom";

import { CartDrawer } from "../components/CartDrawer";
import { SupportChat } from "../components/SupportChat";
import { AdminPage } from "../pages/admin/AdminPage";
import { CheckoutPage } from "../pages/CheckoutPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { OrdersPage } from "../pages/OrdersPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ShopPage } from "../pages/ShopPage";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function AppShell() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(248,197,167,0.38),_transparent_34%),linear-gradient(180deg,_#fffaf6_0%,_#fff3ea_46%,_#fff7f3_100%)] text-stone-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_right,_rgba(223,128,86,0.18),_transparent_35%)]" />
      <div className="pointer-events-none absolute left-0 top-32 h-56 w-56 rounded-full bg-rose-200/25 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-80 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl flex-col px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tienda" element={<ShopPage />} />
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
      <SupportChat />
    </div>
  );
}
