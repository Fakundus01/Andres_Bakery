import { useEffect, useMemo, useState } from "react";

import { AuthApi } from "../../api/authApi.js";
import { RecipesApi } from "../../api/recipesApi.js";

const initialFormState = {
  title: "",
  summary: "",
  ingredients: "",
  steps: "",
  image_url: "",
  category: "general",
  status: "published",
};

export default function Admin() {
  const [recipes, setRecipes] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [formState, setFormState] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem("ab_admin_token") || "",
  );
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const loadRecipes = () => {
    setStatus("loading");
    RecipesApi.list()
      .then((data) => {
        setRecipes(data);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await AuthApi.login(loginEmail, loginPassword);
      const accessToken = response.access_token;
      const profile = await AuthApi.me(accessToken);
      if (!profile.is_admin) {
        setError("Tu usuario no tiene permisos de admin.");
        return;
      }
      setToken(accessToken);
      localStorage.setItem("ab_admin_token", accessToken);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTokenReset = () => {
    setToken("");
    localStorage.removeItem("ab_admin_token");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      if (isEditing) {
        await RecipesApi.update(editingId, formState, token);
      } else {
        await RecipesApi.create(formState, token);
      }
      setFormState(initialFormState);
      setEditingId(null);
      loadRecipes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (recipe) => {
    setEditingId(recipe.id);
    setFormState({
      title: recipe.title ?? "",
      summary: recipe.summary ?? "",
      ingredients: recipe.ingredients ?? "",
      steps: recipe.steps ?? "",
      image_url: recipe.image_url ?? "",
      category: recipe.category ?? "general",
      status: recipe.status ?? "published",
    });
  };

  const handleDelete = async (recipeId) => {
    setError("");
    try {
      await RecipesApi.remove(recipeId, token);
      loadRecipes();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="section admin">
      <div className="section-header">
        <h2>Panel Admin</h2>
        <p>La admin puede subir, editar y borrar recetas nuevas.</p>
      </div>
      <div className="admin-grid">
          <form className="admin-form" onSubmit={handleAdminLogin}>
            <h3>Login admin</h3>
            <p>
              Necesitás un usuario con rol admin. El login demo no crea tokens
              reales.
            </p>
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="admin@email.com"
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="******"
                required
              />
            </label>
            <button type="submit" className="secondary">
              Obtener token
            </button>
          </form>
          <div className="admin-form-stack">
          <form className="admin-form" onSubmit={handleAdminLogin}>
            <h3>Login admin</h3>
            <p>
              Necesitás un usuario con rol admin. El login demo no crea tokens
              reales.
            </p>
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="admin@email.com"
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="******"
                required
              />
            </label>
            <button type="submit" className="secondary">
              Obtener token
            </button>
            {token && (
              <div>
                <p>Token guardado ✅</p>
                <button
                  type="button"
                  className="secondary"
                  onClick={handleTokenReset}
                >
                  Borrar token
                </button>
              </div>
            )}
          </form>
          <form className="admin-form" onSubmit={handleSubmit}>        
          <label>
            Título de la receta
            <input
              type="text"
              name="title"
              value={formState.title}
              onChange={handleChange}
              placeholder="Tarta de frutillas"
              required
            />
          </label>
          <label>
            Descripción corta
            <textarea
              rows="3"
              name="summary"
              value={formState.summary}
              onChange={handleChange}
              placeholder="Contanos lo especial de esta receta"
            required
            />
          </label>
          <label>
            Ingredientes principales
            <input
              type="text"
              name="ingredients"
              value={formState.ingredients}
              onChange={handleChange}
              placeholder="Harina, azúcar, frutillas..."
              required
            />
          </label>
          <label>
            Pasos
            <textarea
              rows="3"
              name="steps"
              value={formState.steps}
              onChange={handleChange}
              placeholder="Mezclar, hornear 30 min..."
              required
            />
          </label>
          <label>
            Foto (link)
            <input
              type="url"
              name="image_url"
              value={formState.image_url}
              onChange={handleChange}
              placeholder="https://"
            />
          </label>
          <label>
            Categoría
            <input
              type="text"
              name="category"
              value={formState.category}
              onChange={handleChange}
              placeholder="Dulce, Salado..."
            />
          </label>
          <label>
            Estado
            <select name="status" value={formState.status} onChange={handleChange}>
              <option value="published">Publicada</option>
              <option value="draft">Borrador</option>
            </select>
          </label>
          <button type="submit" className="secondary">
            {isEditing ? "Actualizar receta" : "Subir receta"}
          </button>
          {isEditing && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setFormState(initialFormState);
                setEditingId(null);
              }}
            >
              Cancelar edición
            </button>
          )}
          {error && <p>{error}</p>}
          </form>
          </div>
        <div className="admin-note">
          <h3>Recetas activas</h3>
          {status === "loading" && <p>Cargando...</p>}
          {status === "error" && (
            <p>No pudimos cargar las recetas. {error}</p>
          )}
          <ul>
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <strong>{recipe.title}</strong>
                <span>{recipe.status}</span>
                <div>
                  <button
                    type="button"
                    className="secondary button-small"
                    onClick={() => handleEdit(recipe)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="secondary button-small"
                    onClick={() => handleDelete(recipe.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}