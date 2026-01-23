import { useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Home from "./pages/Home.jsx";
import Recipes from "./pages/Recipes.jsx";
import Orders from "./pages/Orders.jsx";
import Admin from "./pages/Admin.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Login from "./auth/Login.jsx";
import Signup from "./auth/SignUp.jsx";

const routes = {
  "": Home,
  "#/home": Home,
  "#/recetas": Recipes,
  "#/pedidos": Orders,
  "#/admin": Admin,
  "#/sobre-nosotros": About,
  "#/contactanos": Contact,
  "#/login": Login,
  "#/signup": Signup,
};

export default function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const ActivePage = useMemo(() => routes[hash] ?? Home, [hash]);

  return (
    <div className="app">
      <Navbar />
      <div className="layout">
        <Sidebar />
        <main className="content">
          <ActivePage />
        </main>
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
  );
}