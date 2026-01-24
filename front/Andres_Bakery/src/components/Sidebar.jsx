import { NavLink } from "react-router-dom";

export default function Sidebar({ isOpen, onClose, onToggle }) {
  return (
      <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="sidebar-header">
          <h2>Menú</h2>
          <button
          type="button"
          className="sidebar-handle"
          onClick={isOpen ? onClose : onToggle}
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <span aria-hidden>{isOpen ? "❮" : "❯"}</span>
        </button>
        </div>
        <nav>
          <NavLink to="/admin">Admin</NavLink>
          <NavLink to="/recetas">Recetas</NavLink>
          <NavLink to="/recetas-del-dia">Recetas del día</NavLink>
          <NavLink to="/pedidos">Pedidos</NavLink>
        </nav>
      </aside>
  );
}