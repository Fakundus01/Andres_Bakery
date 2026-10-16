import { startTransition, useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { ErrorBanner, LoadingPanel, SectionHeading, StatCard } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { ordersApi, productsApi, recipesApi, siteApi, usersApi } from "../../lib/api";
import { formatCurrency, getErrorMessage } from "../../lib/format";
import type { Order, Product, Recipe, User } from "../../lib/types";
import type { DashboardTab, ProductForm, RecipeForm } from "../../lib/ui-types";
import { OrdersTab } from "./OrdersTab";
import { OverviewTab } from "./OverviewTab";
import { ProductsTab } from "./ProductsTab";
import { RecipesTab } from "./RecipesTab";
import { StoryTab } from "./StoryTab";

const emptyProductForm: ProductForm = { name: "", description: "", price: "", category: "general", image_url: "", available: true };
const emptyRecipeForm: RecipeForm = { title: "", summary: "", ingredients: "", steps: "", image_url: "", category: "general", status: "published" };

export function AdminPage() {
  const { isLoggedIn, token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [aboutContent, setAboutContent] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [recipeForm, setRecipeForm] = useState<RecipeForm>(emptyRecipeForm);

  const loadDashboard = async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [productsData, recipesData, ordersData, usersData, aboutData] = await Promise.all([
        productsApi.list(),
        recipesApi.list(),
        ordersApi.list(token),
        usersApi.list(token),
        siteApi.getAbout(),
      ]);
      setProducts(productsData);
      setRecipes(recipesData);
      setOrders(ordersData);
      setUsers(usersData);
      setAboutContent(aboutData.content || "");
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && user?.is_admin) {
      void loadDashboard();
    }
  }, [isLoggedIn, token, user?.is_admin]);

  const metrics = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const paidOrders = orders.filter((order) => order.status === "paid").length;
    return {
      revenue,
      paidOrders,
      customers: users.filter((currentUser) => !currentUser.is_admin).length,
      catalog: products.length,
    };
  }, [orders, products.length, users]);

  if (!isLoggedIn) {
    return <Navigate to="/ingresar" replace />;
  }
  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
  };

  const resetRecipeForm = () => {
    setEditingRecipeId(null);
    setRecipeForm(emptyRecipeForm);
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    try {
      const payload = { ...productForm, price: Number(productForm.price) };
      if (editingProductId) {
        await productsApi.update(editingProductId, payload, token);
      } else {
        await productsApi.create(payload, token);
      }
      setFeedback("Producto guardado correctamente.");
      resetProductForm();
      startTransition(() => {
        void loadDashboard();
      });
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  const handleRecipeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    try {
      if (editingRecipeId) {
        await recipesApi.update(editingRecipeId, recipeForm, token);
      } else {
        await recipesApi.create(recipeForm, token);
      }
      setFeedback("Receta guardada correctamente.");
      resetRecipeForm();
      startTransition(() => {
        void loadDashboard();
      });
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    await productsApi.remove(productId, token);
    setFeedback("Producto eliminado.");
    startTransition(() => {
      void loadDashboard();
    });
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    await recipesApi.remove(recipeId, token);
    setFeedback("Receta eliminada.");
    startTransition(() => {
      void loadDashboard();
    });
  };

  const handleSaveStory = async () => {
    try {
      await siteApi.updateAbout(aboutContent, token);
      setFeedback("Contenido del sitio actualizado.");
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await ordersApi.updateStatus(orderId, status, token);
      setFeedback(`Pedido #${orderId} actualizado a ${status}.`);
      startTransition(() => {
        void loadDashboard();
      });
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading eyebrow="Dashboard" title="Un panel admin mucho más comercial y menos improvisado" description="Métricas, gestión del catálogo, recetas publicadas, pedidos y contenido institucional desde una misma superficie." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Facturación total" value={formatCurrency(metrics.revenue)} detail="Suma de pedidos creados" />
        <StatCard title="Pedidos pagos" value={String(metrics.paidOrders)} detail="Pagos confirmados" />
        <StatCard title="Clientes" value={String(metrics.customers)} detail="Usuarios no admin" />
        <StatCard title="Productos" value={String(metrics.catalog)} detail="Dulces cargados en catálogo" />
      </section>
      <div className="flex flex-wrap gap-3">
        {[
          { key: "overview", label: "Overview" },
          { key: "products", label: "Productos" },
          { key: "recipes", label: "Recetas" },
          { key: "orders", label: "Pedidos" },
          { key: "story", label: "Contenido" },
        ].map((tab) => (
          <button key={tab.key} type="button" className={activeTab === tab.key ? "btn-primary" : "btn-secondary"} onClick={() => setActiveTab(tab.key as DashboardTab)}>
            {tab.label}
          </button>
        ))}
      </div>
      {loading ? <LoadingPanel label="Cargando dashboard" /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {feedback ? <div className="pixel-panel-plano bg-exito-suave px-5 py-4 text-sm text-tinta">{feedback}</div> : null}
      {activeTab === "overview" ? <OverviewTab orders={orders} users={users} /> : null}

      {activeTab === "products" ? (
        <ProductsTab
          products={products}
          productForm={productForm}
          setProductForm={setProductForm}
          editingProductId={editingProductId}
          setEditingProductId={setEditingProductId}
          onSubmit={handleProductSubmit}
          onReset={resetProductForm}
          onDelete={(productId) => void handleDeleteProduct(productId)}
        />
      ) : null}

      {activeTab === "recipes" ? (
        <RecipesTab
          recipes={recipes}
          recipeForm={recipeForm}
          setRecipeForm={setRecipeForm}
          editingRecipeId={editingRecipeId}
          setEditingRecipeId={setEditingRecipeId}
          onSubmit={handleRecipeSubmit}
          onReset={resetRecipeForm}
          onDelete={(recipeId) => void handleDeleteRecipe(recipeId)}
        />
      ) : null}

      {activeTab === "orders" ? (
        <OrdersTab orders={orders} onUpdateStatus={(orderId, status) => void handleUpdateOrderStatus(orderId, status)} />
      ) : null}

      {activeTab === "story" ? (
        <StoryTab aboutContent={aboutContent} setAboutContent={setAboutContent} onSave={() => void handleSaveStory()} />
      ) : null}
    </div>
  );
}
