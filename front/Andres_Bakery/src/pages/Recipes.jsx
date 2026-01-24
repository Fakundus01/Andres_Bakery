import { useEffect, useState } from "react";

import { RecipesApi } from "../../api/recipesApi.js";
import { useCart } from "../components/CartContext.jsx";

export default function Recipes() {
  const { addItem } = useCart();
  const [recipes, setRecipes] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let isMounted = true;
    RecipesApi.list()
      .then((data) => {
        if (isMounted) {
          setRecipes(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="section">
      <div className="section-header">
        <h2>Recetas del pueblo</h2>
        <p>Explorá nuestras favoritas para desayunos, meriendas y cenas.</p>
      </div>
       {status === "loading" && <p>Cargando recetas...</p>}
      {status === "error" && (
        <p>No pudimos cargar las recetas. Intentá más tarde.</p>
      )}
      <div className="grid">
        {recipes.map((recipe) => (
          <article className="card" key={recipe.id}>
            <h3>{recipe.title}</h3>
            <p>{recipe.summary}</p>
            <span className="tag">{recipe.category}</span>
            <button
              className="primary button-small"
              type="button"
              onClick={() =>
                addItem({
                  id: recipe.id,
                  name: recipe.title,
                  category: recipe.category,
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