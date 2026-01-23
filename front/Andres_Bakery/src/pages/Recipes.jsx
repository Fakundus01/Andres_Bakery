const recipes = [
  {
    title: "Empanadas veggie",
    text: "Calabaza, choclo y queso cremoso con masa casera.",
    tag: "Salado",
  },
  {
    title: "Budín cítrico",
    text: "Limón y naranja con glaseado de vainilla.",
    tag: "Dulce",
  },
  {
    title: "Sopa de calabaza",
    text: "Con croutons, crema y semillas tostadas.",
    tag: "Calentito",
  },
  {
    title: "Tartas mini",
    text: "Frutas de estación con masa sableé.",
    tag: "Estación",
  },
];

export default function Recipes() {
  return (
    <section className="section">
      <div className="section-header">
        <h2>Recetas del pueblo</h2>
        <p>Explorá nuestras favoritas para desayunos, meriendas y cenas.</p>
      </div>
      <div className="grid">
        {recipes.map((recipe) => (
          <article className="card" key={recipe.title}>
            <h3>{recipe.title}</h3>
            <p>{recipe.text}</p>
            <span className="tag">{recipe.tag}</span>
          </article>
        ))}
      </div>
    </section>
  );
}