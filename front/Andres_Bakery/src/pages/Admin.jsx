const initialRecipes = [
  {
    id: "receta-empanadas",
    name: "Empanadas veggie",
    status: "Publicada",
  },
  {
    id: "receta-budin",
    name: "Budín cítrico",
    status: "Borrador",
  },
];

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
          <h3>Recetas activas</h3>
          <ul>
            {initialRecipes.map((recipe) => (
              <li key={recipe.id}>
                <strong>{recipe.name}</strong>
                <span>{recipe.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}