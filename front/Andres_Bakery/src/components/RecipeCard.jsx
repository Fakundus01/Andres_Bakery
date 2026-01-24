export default function RecipeCard({ recipe }) {
  if (!recipe) {
    return null;
  }

  const { title, description, image, time, servings, tags = [] } = recipe;

  return (
    <article className="recipe-card">
      {image && (
        <div className="recipe-card__media">
          <img src={image} alt={title} />
        </div>
      )}
      <div className="recipe-card__content">
        <header>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </header>
        <div className="recipe-card__meta">
          {time && <span>⏱ {time}</span>}
          {servings && <span>🍰 {servings}</span>}
        </div>
        {tags.length > 0 && (
          <div className="recipe-card__tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}