import RecipeCard from "../components/RecipeCard.jsx";

const dailyRecipes = [
  {
    title: "Panqueques de frutilla",
    description: "Esponjosos, con un toque de miel y frutas frescas.",
    image: "https://images.unsplash.com/photo-1495214783159-3503fd1b572d?auto=format&fit=crop&w=800&q=80",
    time: "25 min",
    servings: "2 porciones",
    tags: ["Dulce", "Retro", "Fácil"],
  },
  {
    title: "Tarta de limón granja",
    description: "Clásica, cremosa y con merengue dorado.",
    image: "https://images.unsplash.com/photo-1458642849426-cfb724f15ef7?auto=format&fit=crop&w=800&q=80",
    time: "50 min",
    servings: "6 porciones",
    tags: ["Clásico", "Cítrico"],
  },
  {
    title: "Galletas de avena",
    description: "Crocantes, con chips de chocolate y canela.",
    image: "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=800&q=80",
    time: "30 min",
    servings: "12 unidades",
    tags: ["Snack", "Rápido"],
  },
];

export default function DailyRecipes() {
  return (
    <section className="section">
      <div className="section-header">
        <h2>Recetas del día</h2>
        <p>
          Una selección diaria con vibes retro para cocinar algo rico en casa.
        </p>
      </div>
      <div className="grid">
        {dailyRecipes.map((recipe) => (
          <RecipeCard key={recipe.title} recipe={recipe} />
        ))}
      </div>
    </section>
  );
}