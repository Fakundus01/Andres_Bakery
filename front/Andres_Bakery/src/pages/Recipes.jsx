import { useCart } from "../components/CartContext.jsx";

const recipes = [
  {
    id: "receta-empanadas",
    title: "Empanadas veggie",
    text: "Calabaza, choclo y queso cremoso con masa casera.",
    tag: "Salado",
  },
  {
    id: "receta-budin",
    title: "Budín cítrico",
    text: "Limón y naranja con glaseado de vainilla.",
    tag: "Dulce",
  },
  {
    id: "receta-sopa",
    title: "Sopa de calabaza",
    text: "Con croutons, crema y semillas tostadas.",
    tag: "Calentito",
  },
  {
    id: "receta-tartas",
    title: "Tartas mini",
    text: "Frutas de estación con masa sableé.",
    tag: "Estación",
  },
];

export default function Recipes() {
  const { addItem } = useCart();

  return (
    <section className="section">
      <div className="section-header">
        <h2>Recetas del pueblo</h2>
        <p>Explorá nuestras favoritas para desayunos, meriendas y cenas.</p>
      </div>
      <div className="grid">
        {recipes.map((recipe) => (
          <article className="card" key={recipe.id}>
            <h3>{recipe.title}</h3>
            <p>{recipe.text}</p>
            <span className="tag">{recipe.tag}</span>
            <button
              className="primary button-small"
              type="button"
              onClick={() =>
                addItem({
                  id: recipe.id,
                  name: recipe.title,
                  category: recipe.tag,
                })
              }
            >
              Agregar al carrito
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}