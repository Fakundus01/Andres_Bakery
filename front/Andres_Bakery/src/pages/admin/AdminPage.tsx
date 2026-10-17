import { startTransition, useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { ErrorBanner, LoadingPanel, SectionHeading, StatCard } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { ordersApi, productsApi, siteApi, tagsApi, usersApi } from "../../lib/api";
import { formatCurrency, getErrorMessage } from "../../lib/format";
import type { Order, Product, Tag, User } from "../../lib/types";
import type { DashboardTab, ProductForm, TagForm } from "../../lib/ui-types";
import { OrdersTab } from "./OrdersTab";
import { OverviewTab } from "./OverviewTab";
import { ProductsTab } from "./ProductsTab";
import { StoryTab } from "./StoryTab";
import { TagsTab } from "./TagsTab";

const emptyProductForm: ProductForm = {
  name: "",
  description: "",
  steps: "",
  prep_note: "",
  price: "",
  unit_label: "unidad",
  min_qty: "1",
  qty_step: "1",
  category: "general",
  image_url: "",
  available: true,
  allows_pickup: true,
  allows_delivery: true,
  tag_ids: [],
};
const emptyTagForm: TagForm = { name: "", color_token: "acento", sort_order: "0" };

const PESTANAS: Array<{ key: DashboardTab; label: string }> = [
  { key: "overview", label: "Resumen" },
  { key: "products", label: "La carta" },
  { key: "tags", label: "Etiquetas" },
  { key: "orders", label: "Pedidos" },
  { key: "story", label: "Tu historia" },
];

export function AdminPage() {
  const { isLoggedIn, token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [aboutContent, setAboutContent] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [tagForm, setTagForm] = useState<TagForm>(emptyTagForm);

  const loadDashboard = async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [productsData, tagsData, ordersData, usersData, aboutData] = await Promise.all([
        productsApi.list(),
        tagsApi.list(),
        ordersApi.list(token),
        usersApi.list(token),
        siteApi.getAbout(),
      ]);
      setProducts(productsData);
      setTags(tagsData);
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
      sinPrecio: products.filter((product) => product.price === 0).length,
    };
  }, [orders, products, users]);

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

  const resetTagForm = () => {
    setEditingTagId(null);
    setTagForm(emptyTagForm);
  };

  const recargar = () =>
    startTransition(() => {
      void loadDashboard();
    });

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    try {
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        min_qty: Number(productForm.min_qty || 1),
        qty_step: Number(productForm.qty_step || 1),
      };
      if (editingProductId) {
        await productsApi.update(editingProductId, payload, token);
      } else {
        await productsApi.create(payload, token);
      }
      setFeedback("Producto guardado correctamente.");
      resetProductForm();
      recargar();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  const handleTagSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    try {
      const payload = {
        name: tagForm.name,
        color_token: tagForm.color_token,
        sort_order: Number(tagForm.sort_order || 0),
      };
      if (editingTagId) {
        await tagsApi.update(editingTagId, payload, token);
      } else {
        await tagsApi.create(payload, token);
      }
      setFeedback("Etiqueta guardada.");
      resetTagForm();
      recargar();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await productsApi.remove(productId, token);
      setFeedback("Producto eliminado.");
      recargar();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      await tagsApi.remove(tagId, token);
      setFeedback("Etiqueta eliminada. Los productos que la tenían siguen igual.");
      recargar();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
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
      recargar();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Tu panel"
        title="Todo lo que vendés, desde una sola pantalla"
        description="Cargá la carta con precio por unidad, mínimo de pedido, receta y etiquetas; mirá los pedidos y escribí tu historia."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Facturación total" value={formatCurrency(metrics.revenue)} detail="Suma de pedidos creados" />
        <StatCard title="Pedidos pagos" value={String(metrics.paidOrders)} detail="Pagos confirmados" />
        <StatCard title="Clientes" value={String(metrics.customers)} detail="Cuentas que no son admin" />
        <StatCard
          title="Productos en la carta"
          value={String(products.length)}
          detail={metrics.sinPrecio > 0 ? `${metrics.sinPrecio} todavía sin precio` : "Todos con precio"}
        />
      </section>
      <div className="flex flex-wrap gap-3">
        {PESTANAS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {loading ? <LoadingPanel label="Cargando el panel" /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {feedback ? <div className="pixel-panel-plano bg-exito-suave px-5 py-4 text-sm text-tinta">{feedback}</div> : null}

      {activeTab === "overview" ? <OverviewTab orders={orders} users={users} /> : null}

      {activeTab === "products" ? (
        <ProductsTab
          products={products}
          tags={tags}
          productForm={productForm}
          setProductForm={setProductForm}
          editingProductId={editingProductId}
          setEditingProductId={setEditingProductId}
          onSubmit={handleProductSubmit}
          onReset={resetProductForm}
          onDelete={(productId) => void handleDeleteProduct(productId)}
        />
      ) : null}

      {activeTab === "tags" ? (
        <TagsTab
          tags={tags}
          tagForm={tagForm}
          setTagForm={setTagForm}
          editingTagId={editingTagId}
          setEditingTagId={setEditingTagId}
          onSubmit={handleTagSubmit}
          onReset={resetTagForm}
          onDelete={(tagId) => void handleDeleteTag(tagId)}
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
