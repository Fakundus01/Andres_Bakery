import { useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import CartSummary from "./components/CartSummary.jsx";
import { CartProvider } from "./components/CartContext.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import Home from "./pages/Home.jsx";
import Recipes from "./pages/Recipes.jsx";
import Orders from "./pages/Orders.jsx";
import Admin from "./pages/Admin.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Login from "./auth/Login.jsx";
import Signup from "./auth/Signup.jsx";

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <HashRouter>
      <AuthProvider>
        <CartProvider>
          <div className="app">
            <Navbar onToggleSidebar={toggleSidebar} />
            <div className="layout">
              <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
              <main className="content">
                <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/recetas" element={<Recipes />} />
                  <Route path="/pedidos" element={<Orders />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/sobre-nosotros" element={<About />} />
                  <Route path="/contactanos" element={<Contact />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
              </main>
              <CartSummary />
            </div>
            <footer id="contacto" className="footer">
              <div>
                <h3>Contacto</h3>
                <p>Escribinos y te respondemos con amor.</p>
              </div>
              <div className="footer-links">
                <a href="https://instagram.com" target="_blank" rel="noreferrer">
                  Instagram
                </a>
                <a href="https://wa.me/000000000" target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
                <a href="https://facebook.com" target="_blank" rel="noreferrer">
                  Facebook
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </div>
              <p className="footer-copy">
                © 2024 Andres Bakery. Hecho con pastel vibes.
              </p>
            </footer>
          </div>
        </CartProvider>
      </AuthProvider>
    </HashRouter>
  );
}