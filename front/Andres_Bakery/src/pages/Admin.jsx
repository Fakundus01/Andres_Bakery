export default function Admin() {
  return (
    <section className="section admin">
      <div className="section-header">
        <h2>Panel Admin</h2>
        <p>La admin puede subir recetas nuevas para la comunidad.</p>
      </div>
      <div className="admin-grid">
        <form className="admin-form">
          <label>
            Título de la receta
            <input type="text" placeholder="Tarta de frutillas" />
          </label>
          <label>
            Descripción corta
            <textarea
              rows="3"
              placeholder="Contanos lo especial de esta receta"
            ></textarea>
          </label>
          <label>
            Ingredientes principales
            <input type="text" placeholder="Harina, azúcar, frutillas..." />
          </label>
          <label>
            Foto (link)
            <input type="url" placeholder="https://" />
          </label>
          <button type="submit" className="secondary">
            Subir receta
          </button>
        </form>
        <div className="admin-note">
          <h3>Tips de la admin</h3>
          <ul>
            <li>Agregá recetas de temporada cada semana.</li>
            <li>Destacá ingredientes locales y orgánicos.</li>
            <li>Mantené el catálogo vivo para los usuarios.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}