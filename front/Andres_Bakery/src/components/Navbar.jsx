import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Navbar({ onToggleSidebar, isSidebarOpen }) {
  const { isLoggedIn } = useAuth();
  const profileImage = import.meta.env.VITE_PROFILE_DEFAULT;

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <span className="logo-pixel">AB</span>
          <div>
            <h1>Andres Bakery</h1>
            <p>Recetas dulces y saladas con magia de granja</p>
          </div>
        </div>
      </div>
      <nav className="navbar-links">
        <NavLink to="/home">Home</NavLink>
        <NavLink to="/sobre-nosotros">Sobre nosotros</NavLink>
        <NavLink to="/contactanos">Contactanos</NavLink>
        <NavLink to="/login">Login</NavLink>
        <NavLink to="/signup">Sign up</NavLink>
      </nav>
      {isLoggedIn && (
        <div className="profile">
          <img src={profileImage} alt="Perfil" />
        </div>
      )}
    </header>
  );
}