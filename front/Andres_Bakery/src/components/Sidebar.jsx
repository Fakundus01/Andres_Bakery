import { NavLink } from "react-router-dom";

export default function Sidebar({ isOpen, onClose, onToggle }) {
  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="sidebar-handle"
          onClick={onToggle}
          aria-label="Abrir menú"
        >
          <span aria-hidden>❯</span>
        </button>
      )}
      <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="sidebar-header">
          <h2>Menú</h2>
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            ❮
          </button>
        </div>
        <nav>
          <NavLink to="/admin">Admin</NavLink>
          <NavLink to="/recetas">Recetas</NavLink>
          <NavLink to="/pedidos">Pedidos</NavLink>
        </nav>
      </aside>
    </>
  );
}