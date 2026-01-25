import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { BackendIngredientsApi } from "../../api/backendIngredientsApi.js";
import { OrdersApi } from "../../api/ordersApi.js";
import { ProductsApi } from "../../api/productsApi.js";
import { RecipesApi } from "../../api/recipesApi.js";
import { SiteApi } from "../../api/siteApi.js";
import { UsersApi } from "../../api/usersApi.js";

const initialRecipeFormState = {
  title: "",
  summary: "",
  ingredients: "",
  steps: "",
  image_url: "",
  category: "general",
  status: "published",
};

const initialIngredientFormState = {
  name: "",
  unit: "",
};

const initialProductFormState = {
  name: "",
  description: "",
  price: "",
  category: "general",
  image_url: "",
  available: true,
  ingredient_ids: [],
};

export default function Admin() {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [aboutContent, setAboutContent] = useState("");
  const [status, setStatus] = useState("loading");
  const [recipeError, setRecipeError] = useState("");
  const [ingredientError, setIngredientError] = useState("");
  const [productError, setProductError] = useState("");
  const [aboutError, setAboutError] = useState("");
  const [formState, setFormState] = useState(initialRecipeFormState);
  const [ingredientFormState, setIngredientFormState] = useState(
    initialIngredientFormState
  );
  const [productFormState, setProductFormState] = useState(
    initialProductFormState
  );
  const [editingId, setEditingId] = useState(null);
  const [ingredientEditingId, setIngredientEditingId] = useState(null);
  const [productEditingId, setProductEditingId] = useState(null);
  const [productFilter, setProductFilter] = useState("all");
  const { isLoggedIn, token, user } = useAuth();

  const isEditing = useMemo(() => editingId !== null, [editingId]);
  const isIngredientEditing = useMemo(
    () => ingredientEditingId !== null,
    [ingredientEditingId]
  );
  const isProductEditing = useMemo(
    () => productEditingId !== null,
    [productEditingId]
  );

  const loadRecipes = () => {
    setStatus("loading");
    RecipesApi.list()
      .then((data) => {
        setRecipes(data);
        setStatus("ready");
      })
      .catch((err) => {
        setRecipeError(err.message);
        setStatus("error");
      });
  };

  useEffect(() => {
    loadRecipes();
    BackendIngredientsApi.list()
      .then((data) => setIngredients(data))
      .catch((err) => setIngredientError(err.message));
    ProductsApi.list()
      .then((data) => setProducts(data))
      .catch((err) => setProductError(err.message));
    SiteApi.getAbout()
      .then((data) => setAboutContent(data.content || ""))
      .catch(() => setAboutContent(""));
  }, []);

  useEffect(() => {
    if (isLoggedIn && user?.is_admin) {
      OrdersApi.list(token)
        .then((data) => setOrders(data))
        .catch((err) => setProductError(err.message));
      UsersApi.list(token)
        .then((data) => setUsers(data))
        .catch((err) => setProductError(err.message));
    } else {
      setOrders([]);
      setUsers([]);
    }
  }, [isLoggedIn, token, user?.is_admin]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setRecipeError("");
    if (!isLoggedIn) {
      setRecipeError("Iniciá sesión para administrar recetas.");
      return;
    }
    if (!user?.is_admin) {
      setRecipeError("Tu usuario no tiene permisos de admin.");
      return;
    }

    try {
      if (isEditing) {
        await RecipesApi.update(editingId, formState, token);
      } else {
        await RecipesApi.create(formState, token);
      }
      setFormState(initialRecipeFormState);
      setEditingId(null);
      loadRecipes();
    } catch (err) {
      setRecipeError(err.message);
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
    setRecipeError("");
    if (!isLoggedIn) {
      setRecipeError("Iniciá sesión para administrar recetas.");
      return;
    }
    if (!user?.is_admin) {
      setRecipeError("Tu usuario no tiene permisos de admin.");
      return;
    }
    try {
      await RecipesApi.remove(recipeId, token);
      loadRecipes();
    } catch (err) {
      setRecipeError(err.message);
    }
  };

  const handleIngredientChange = (event) => {
    const { name, value } = event.target;
    setIngredientFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleIngredientSubmit = async (event) => {
    event.preventDefault();
    setIngredientError("");
    if (!isLoggedIn || !user?.is_admin) {
      setIngredientError("Necesitás permisos de admin para esto.");
      return;
    }
    try {
      if (isIngredientEditing) {
        await BackendIngredientsApi.update(
          ingredientEditingId,
          ingredientFormState,
          token
        );
      } else {
        await BackendIngredientsApi.create(ingredientFormState, token);
      }
      setIngredientFormState(initialIngredientFormState);
      setIngredientEditingId(null);
      const data = await BackendIngredientsApi.list();
      setIngredients(data);
    } catch (err) {
      setIngredientError(err.message);
    }
  };

  const handleIngredientEdit = (ingredient) => {
    setIngredientEditingId(ingredient.id);
    setIngredientFormState({
      name: ingredient.name ?? "",
      unit: ingredient.unit ?? "",
    });
  };

  const handleIngredientDelete = async (ingredientId) => {
    setIngredientError("");
    if (!isLoggedIn || !user?.is_admin) {
      setIngredientError("Necesitás permisos de admin para esto.");
      return;
    }
    try {
      await BackendIngredientsApi.remove(ingredientId, token);
      const data = await BackendIngredientsApi.list();
      setIngredients(data);
    } catch (err) {
      setIngredientError(err.message);
    }
  };

  const handleProductChange = (event) => {
    const { name, value, type, checked } = event.target;
    setProductFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleIngredient = (ingredientId) => {
    setProductFormState((prev) => {
      const selected = new Set(prev.ingredient_ids);
      if (selected.has(ingredientId)) {
        selected.delete(ingredientId);
      } else {
        selected.add(ingredientId);
      }
      return { ...prev, ingredient_ids: Array.from(selected) };
    });
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    setProductError("");
    if (!isLoggedIn || !user?.is_admin) {
      setProductError("Necesitás permisos de admin para esto.");
      return;
    }
    const payload = {
      ...productFormState,
      price: Number(productFormState.price),
    };
    try {
      if (isProductEditing) {
        await ProductsApi.update(productEditingId, payload, token);
      } else {
        await ProductsApi.create(payload, token);
      }
      setProductFormState(initialProductFormState);
      setProductEditingId(null);
      const data = await ProductsApi.list();
      setProducts(data);
    } catch (err) {
      setProductError(err.message);
    }
  };

  const handleProductEdit = (product) => {
    setProductEditingId(product.id);
    setProductFormState({
      name: product.name ?? "",
      description: product.description ?? "",
      price: product.price ?? "",
      category: product.category ?? "general",
      image_url: product.image_url ?? "",
      available: product.available ?? true,
      ingredient_ids: product.ingredients?.map((item) => item.id) ?? [],
    });
  };

  const handleProductDelete = async (productId) => {
    setProductError("");
    if (!isLoggedIn || !user?.is_admin) {
      setProductError("Necesitás permisos de admin para esto.");
      return;
    }
    try {
      await ProductsApi.remove(productId, token);
      const data = await ProductsApi.list();
      setProducts(data);
    } catch (err) {
      setProductError(err.message);
    }
  };

  const handleAboutSubmit = async (event) => {
    event.preventDefault();
    setAboutError("");
    if (!isLoggedIn || !user?.is_admin) {
      setAboutError("Necesitás permisos de admin para esto.");
      return;
    }
    try {
      await SiteApi.updateAbout(aboutContent, token);
    } catch (err) {
      setAboutError(err.message);
    }
  };

  const filteredProducts =
    productFilter === "all"
      ? products
      : products.filter((product) => product.category === productFilter);

  const productCategories = Array.from(
    new Set(products.map((product) => product.category).filter(Boolean))
  );

  return (
    <section className="section admin">
      <div className="section-header">
        <h2>Panel Admin</h2>
        <p>
          La admin puede gestionar recetas, ingredientes, productos, ventas y el
          contenido del sitio.
        </p>
      </div>
      <div className="admin-grid">
        <div className="admin-section">
          <form className="admin-form" onSubmit={handleSubmit}>
            {!isLoggedIn && (
              <p>Iniciá sesión para administrar recetas.</p>
            )}
            {isLoggedIn && !user?.is_admin && (
              <p>Tu usuario no tiene permisos de admin.</p>
            )}
            <label>
              Título de la receta
              <input
                type="text"
                name="title"
                value={formState.title}
                onChange={handleChange}
                placeholder="Tarta de frutillas"
                required
                disabled={!isLoggedIn || !user?.is_admin}
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
                disabled={!isLoggedIn || !user?.is_admin}
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
                disabled={!isLoggedIn || !user?.is_admin}
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
                disabled={!isLoggedIn || !user?.is_admin}
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
                disabled={!isLoggedIn || !user?.is_admin}
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
                disabled={!isLoggedIn || !user?.is_admin}
              />
            </label>
            <label>
              Estado
              <select
                name="status"
                value={formState.status}
                onChange={handleChange}
                disabled={!isLoggedIn || !user?.is_admin}
              >
                <option value="published">Publicada</option>
                <option value="draft">Borrador</option>
              </select>
            </label>
            <button
              type="submit"
              className="secondary"
              disabled={!isLoggedIn || !user?.is_admin}
            >
              {isEditing ? "Actualizar receta" : "Subir receta"}
            </button>
            {isEditing && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setFormState(initialRecipeFormState);
                  setEditingId(null);
                }}
              >
                Cancelar edición
              </button>
            )}
            {recipeError && <p>{recipeError}</p>}
          </form>
          <div className="admin-note">
            <h3>Recetas activas</h3>
            {status === "loading" && <p>Cargando...</p>}
            {status === "error" && (
              <p>No pudimos cargar las recetas. {recipeError}</p>
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
                      disabled={!isLoggedIn || !user?.is_admin}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="secondary button-small"
                      onClick={() => handleDelete(recipe.id)}
                      disabled={!isLoggedIn || !user?.is_admin}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="admin-section">
          <form className="admin-form" onSubmit={handleIngredientSubmit}>
            <h3>Ingredientes</h3>
            <label>
              Nombre
              <input
                type="text"
                name="name"
                value={ingredientFormState.name}
                onChange={handleIngredientChange}
                placeholder="Azúcar"
                required
                disabled={!isLoggedIn || !user?.is_admin}
              />
            </label>
            <label>
              Unidad (opcional)
              <input
                type="text"
                name="unit"
                value={ingredientFormState.unit}
                onChange={handleIngredientChange}
                placeholder="gr, ml..."
                disabled={!isLoggedIn || !user?.is_admin}
              />
            </label>
            <button
              type="submit"
              className="secondary"
              disabled={!isLoggedIn || !user?.is_admin}
            >
              {isIngredientEditing ? "Actualizar ingrediente" : "Agregar ingrediente"}
            </button>
            {isIngredientEditing && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setIngredientFormState(initialIngredientFormState);
                  setIngredientEditingId(null);
                }}
              >
                Cancelar
              </button>
            )}
            {ingredientError && <p>{ingredientError}</p>}
          </form>
          <div className="admin-note">
            <h3>Listado de ingredientes</h3>
            <ul>
              {ingredients.map((ingredient) => (
                <li key={ingredient.id}>
                  <strong>{ingredient.name}</strong>
                  <span>{ingredient.unit || "Sin unidad"}</span>
                  <div>
                    <button
                      type="button"
                      className="secondary button-small"
                      onClick={() => handleIngredientEdit(ingredient)}
                      disabled={!isLoggedIn || !user?.is_admin}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="secondary button-small"
                      onClick={() => handleIngredientDelete(ingredient.id)}
                      disabled={!isLoggedIn || !user?.is_admin}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="admin-section">
          <form className="admin-form" onSubmit={handleProductSubmit}>
            <h3>Productos</h3>
            <label>
              Nombre
              <input
                type="text"
                name="name"
                value={productFormState.name}
                onChange={handleProductChange}
                placeholder="Box desayuno"
                required
                disabled={!isLoggedIn || !user?.is_admin}
              />
            </label>
            <label>
              Descripción
              <textarea
                rows="3"
                name="description"
                value={productFormState.description}
                onChange={handleProductChange}
                placeholder="Ideal para compartir"
                disabled={!isLoggedIn || !user?.is_admin}
              />
            </label>
            <label>
              Precio
              <input
                type="number"
                name="price"
                value={productFormState.price}
                onChange={handleProductChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                disabled={!isLoggedIn || !user?.is_admin}
              />
            </label>
            <label>
              Categoría
              <input
                type="text"
                name="category"
                value={productFormState.category}
                onChange={handleProductChange}
                placeholder="Box, Pastelería..."
                disabled={!isLoggedIn || !user?.is_admin}
              />
            </label>
            <label>
              Foto (link)
              <input
                type="url"
                name="image_url"
                value={productFormState.image_url}
                onChange={handleProductChange}
                placeholder="https://"
                disabled={!isLoggedIn || !user?.is_admin}
              />
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="available"
                checked={productFormState.available}
                onChange={handleProductChange}
                disabled={!isLoggedIn || !user?.is_admin}
              />
              Disponible para venta
            </label>
            <div className="ingredient-picker">
              <p>Ingredientes asociados</p>
              <div className="ingredient-list">
                {ingredients.length === 0 && (
                  <span>Agregá ingredientes para asociarlos.</span>
                )}
                {ingredients.map((ingredient) => (
                  <label key={ingredient.id} className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={productFormState.ingredient_ids.includes(ingredient.id)}
                      onChange={() => toggleIngredient(ingredient.id)}
                      disabled={!isLoggedIn || !user?.is_admin}
                    />
                    {ingredient.name}
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="secondary"
              disabled={!isLoggedIn || !user?.is_admin}
            >
              {isProductEditing ? "Actualizar producto" : "Crear producto"}
            </button>
            {isProductEditing && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setProductFormState(initialProductFormState);
                  setProductEditingId(null);
                }}
              >
                Cancelar
              </button>
            )}
            {productError && <p>{productError}</p>}
          </form>
          <div className="admin-note">
            <div className="admin-row">
              <h3>Productos cargados</h3>
              <label>
                Filtro por categoría
                <select
                  value={productFilter}
                  onChange={(event) => setProductFilter(event.target.value)}
                >
                  <option value="all">Todas</option>
                  {productCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ul>
              {filteredProducts.map((product) => (
                <li key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.category}</span>
                    <span>
                      {product.available ? "Disponible" : "No disponible"}
                    </span>
                    <span>
                      {product.ingredients?.length
                        ? product.ingredients.map((item) => item.name).join(", ")
                        : "Sin ingredientes"}
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="secondary button-small"
                      onClick={() => handleProductEdit(product)}
                      disabled={!isLoggedIn || !user?.is_admin}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="secondary button-small"
                      onClick={() => handleProductDelete(product.id)}
                      disabled={!isLoggedIn || !user?.is_admin}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="admin-section">
          <form className="admin-form" onSubmit={handleAboutSubmit}>
            <h3>Sobre mí</h3>
            <label>
              Texto principal
              <textarea
                rows="4"
                value={aboutContent}
                onChange={(event) => setAboutContent(event.target.value)}
                disabled={!isLoggedIn || !user?.is_admin}
              />
            </label>
            <button
              type="submit"
              className="secondary"
              disabled={!isLoggedIn || !user?.is_admin}
            >
              Guardar contenido
            </button>
            {aboutError && <p>{aboutError}</p>}
          </form>
        </div>

        <div className="admin-section">
          <div className="admin-note">
            <h3>Ventas recientes</h3>
            {!isLoggedIn && <p>Iniciá sesión para ver ventas.</p>}
            {isLoggedIn && !user?.is_admin && (
              <p>Solo admin puede ver ventas.</p>
            )}
            <ul>
              {orders.map((order) => (
                <li key={order.id}>
                  <strong>Pedido #{order.id}</strong>
                  <span>{order.status}</span>
                  <span>${order.total_amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-note">
            <h3>Usuarios</h3>
            {!isLoggedIn && <p>Iniciá sesión para ver usuarios.</p>}
            {isLoggedIn && !user?.is_admin && (
              <p>Solo admin puede ver usuarios.</p>
            )}
            <ul>
              {users.map((currentUser) => (
                <li key={currentUser.id}>
                  <strong>{currentUser.name}</strong>
                  <span>{currentUser.email}</span>
                  <span>{currentUser.is_admin ? "Admin" : "Cliente"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
