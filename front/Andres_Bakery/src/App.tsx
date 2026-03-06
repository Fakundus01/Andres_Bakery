import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  HashRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowRight,
  ChefHat,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  X,
} from "lucide-react";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider, useCart } from "./contexts/CartContext";
import {
  contactApi,
  ordersApi,
  paymentsApi,
  productsApi,
  recipesApi,
  siteApi,
  usersApi,
} from "./lib/api";
import type {
  DeliveryMethod,
  Order,
  PaymentMethod,
  Product,
  Recipe,
  User,
} from "./lib/types";

const DELIVERY_FEE = 2500;
const DEFAULT_NEIGHBORHOOD = "Villa Maipu";
const DEFAULT_CITY = "General San Martin";

type DashboardTab = "overview" | "products" | "recipes" | "orders" | "story";

type Slide = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  accent: string;
  ctaLabel: string;
  ctaTo: string;
};

type ChatMessage = {
  role: "bot" | "user";
  text: string;
};

const heroFallback: Slide[] = [
  {
    eyebrow: "Edicion especial",
    title: "Dulces de autor con entrega local en Villa Maipu",
    description:
      "Una vidriera pastel con compras simples, checkout por Mercado Pago y una identidad mucho mas editorial.",
    image:
      "https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=1400&q=80",
    accent: "Recetas, cajas y tortas hechas por la admin",
    ctaLabel: "Explorar la tienda",
    ctaTo: "/tienda",
  },
  {
    eyebrow: "Pedidos guiados",
    title: "Comprá online y terminá el pago con Mercado Pago, Visa o Mastercard",
    description:
      "El flujo de compra queda orientado a carrito, checkout y seguimiento, sin una UI improvisada ni pasos sueltos.",
    image:
      "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1400&q=80",
    accent: "Checkout claro, historial y mails automáticos",
    ctaLabel: "Ir al checkout",
    ctaTo: "/checkout",
  },
  {
    eyebrow: "Panel admin",
    title: "Gestioná recetas, productos y pedidos desde un dashboard visual",
    description:
      "Alta, edición y baja de dulces, control de ventas y contenido del sitio desde una sola vista con foco comercial.",
    image:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1400&q=80",
    accent: "Dashboard bonito y pensado para operar el negocio",
    ctaLabel: "Ver panel",
    ctaTo: "/admin",
  },
];

const paymentOptions: Array<{ id: PaymentMethod; title: string; description: string }> = [
  {
    id: "mercado_pago",
    title: "Mercado Pago",
    description: "Wallet o checkout general con todas las opciones disponibles.",
  },
  {
    id: "visa",
    title: "Visa",
    description: "Pagás con Visa dentro del checkout seguro de Mercado Pago.",
  },
  {
    id: "mastercard",
    title: "Mastercard",
    description: "Pagás con Mastercard dentro del checkout seguro de Mercado Pago.",
  },
];

const orderStatusOptions = [
  "pending",
  "payment_pending",
  "paid",
  "in_progress",
  "ready",
  "delivered",
  "payment_failed",
];

const supportReplies = [
  {
    label: "Envios en Villa Maipu",
    answer:
      "Hacemos entregas dentro de Villa Maipu. En el checkout podés elegir envío local o retiro por el punto de entrega.",
  },
  {
    label: "Medios de pago",
    answer:
      "Trabajamos con Mercado Pago. Desde ahí podés completar con saldo, Visa o Mastercard, según la opción que elijas al comprar.",
  },
  {
    label: "Pedidos personalizados",
    answer:
      "Si querés una caja regalo o una torta especial, dejá el detalle en el chat y lo derivamos al mail de soporte para seguimiento.",
  },
];

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </AuthProvider>
    </HashRouter>
  );
}

function AppShell() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(248,197,167,0.38),_transparent_34%),linear-gradient(180deg,_#fffaf6_0%,_#fff3ea_46%,_#fff7f3_100%)] text-stone-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_right,_rgba(223,128,86,0.18),_transparent_35%)]" />
      <div className="pointer-events-none absolute left-0 top-32 h-56 w-56 rounded-full bg-rose-200/25 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-80 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl flex-col px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tienda" element={<ShopPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/ingresar" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SiteFooter />
      <CartDrawer />
      <SupportChat />
    </div>
  );
}

function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const { isLoggedIn, logout, user } = useAuth();

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/tienda", label: "Tienda" },
    { to: "/pedidos", label: "Pedidos" },
    ...(user?.is_admin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-lg shadow-stone-900/10 transition-transform duration-300 group-hover:-translate-y-1">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold tracking-tight text-stone-950">Andres Bakery</p>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Dulces de autor</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-stone-200/80 bg-white/80 px-2 py-2 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button className="btn-secondary" type="button" onClick={openCart}>
            <ShoppingBag className="h-4 w-4" />
            Carrito ({itemCount})
          </button>
          {isLoggedIn ? (
            <>
              <span className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600">
                {user?.name}
              </span>
              <button className="btn-secondary" type="button" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </>
          ) : (
            <Link to="/ingresar" className="btn-primary">
              <LogIn className="h-4 w-4" />
              Ingresar
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-900 md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-stone-200/70 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isActive ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button className="btn-secondary mt-2" type="button" onClick={openCart}>
              <ShoppingBag className="h-4 w-4" />
              Abrir carrito ({itemCount})
            </button>
            {isLoggedIn ? (
              <button className="btn-secondary" type="button" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            ) : (
              <Link to="/ingresar" className="btn-primary" onClick={() => setMobileOpen(false)}>
                <LogIn className="h-4 w-4" />
                Ingresar
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [about, setAbout] = useState("");
  const [error, setError] = useState("");
  const { addItem } = useCart();

  useEffect(() => {
    let active = true;

    Promise.all([productsApi.list(), recipesApi.list(), siteApi.getAbout()])
      .then(([productsData, recipesData, aboutData]) => {
        if (!active) {
          return;
        }
        setProducts(productsData.filter((product) => product.available));
        setRecipes(recipesData.filter((recipe) => recipe.status !== "draft"));
        setAbout(aboutData.content);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(getErrorMessage(reason));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const featuredProducts = products.slice(0, 4);
  const featuredRecipes = recipes.slice(0, 3);
  const slides = useMemo<Slide[]>(() => {
    if (!products.length) {
      return heroFallback;
    }

    return products.slice(0, 3).map((product) => ({
      eyebrow: product.category || "Catalogo",
      title: product.name,
      description: product.description || "Dulce artesanal listo para sumar al carrito.",
      image: product.image_url || heroFallback[0].image,
      accent: `Disponible por ${formatCurrency(product.price)}`,
      ctaLabel: "Comprar ahora",
      ctaTo: "/checkout",
    }));
  }, [products]);

  return (
    <div className="space-y-14 pb-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <HeroCarousel slides={slides} />
        <div className="grid gap-4">
          <InfoCard
            icon={<Truck className="h-5 w-5" />}
            title="Envio local organizado"
            text="Checkout enfocado en Villa Maipu, con fee local visible y retiro como alternativa clara."
          />
          <InfoCard
            icon={<CreditCard className="h-5 w-5" />}
            title="Pago guiado"
            text="Mercado Pago como motor del checkout para wallet, Visa y Mastercard dentro del mismo flujo."
          />
          <InfoCard
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="Admin listo para vender"
            text="Dashboard con CRUD de productos, recetas, pedidos recientes y contenido general del sitio."
          />
          <div className="glass-panel relative overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-rose-400 to-amber-300" />
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Soporte</p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-stone-950">Chat guiado abajo a la derecha</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Resuelve dudas de envío, medios de pago y pedidos personalizados sin sacar al cliente del flujo de compra.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pago online" value="MP + tarjetas" detail="Mercado Pago, Visa y Mastercard" />
        <StatCard title="Zona de entrega" value="Villa Maipu" detail="Entrega local o retiro" />
        <StatCard title="Experiencia" value="Ecommerce" detail="Carrito, checkout y pedidos" />
      </section>

      <SectionHeading
        eyebrow="Lo mas pedido"
        title="Un catalogo visual que ahora sí parece una tienda"
        description="Cada tarjeta prioriza decisión de compra: foto, categoría, precio, disponibilidad y acción directa al carrito."
      />
      {error ? <ErrorBanner message={error} /> : null}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {featuredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={() => addItem(product)} />
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel p-7">
          <p className="text-xs uppercase tracking-[0.32em] text-stone-500">Historia</p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-stone-950">
            Una pastelería digital con tono cálido y venta real.
          </h2>
          <p className="mt-4 text-base leading-7 text-stone-600">
            {about ||
              "Una tienda orientada a dulces hechos por la admin, con recetas publicadas como contenido editorial y una estética más boutique."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/tienda" className="btn-primary">
              Ver todos los productos
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/admin" className="btn-secondary">
              <LayoutDashboard className="h-4 w-4" />
              Panel admin
            </Link>
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow="Recetas publicadas"
            title="Contenido que acompaña la venta"
            description="La tienda vende dulces, pero el sitio también posiciona a la marca con recetas cuidadas y visuales fuertes."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredRecipes.map((recipe) => (
              <article key={recipe.id} className="glass-panel overflow-hidden p-0">
                <img src={recipe.image_url || heroFallback[2].image} alt={recipe.title} className="h-48 w-full object-cover" />
                <div className="p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{recipe.category}</p>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-stone-950">{recipe.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{recipe.summary}</p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-stone-900/90 px-3 py-1 text-xs font-semibold text-white">
                    <ChefHat className="h-3.5 w-3.5" />
                    Receta publicada
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { addItem } = useCart();

  useEffect(() => {
    setLoading(true);
    productsApi
      .list()
      .then((data) => setProducts(data.filter((product) => product.available)))
      .catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const loweredSearch = deferredSearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const haystack = `${product.name} ${product.description ?? ""}`.toLowerCase();
      const matchesSearch = !loweredSearch || haystack.includes(loweredSearch);
      return matchesCategory && matchesSearch;
    });
  }, [category, deferredSearch, products]);

  return (
    <div className="space-y-10 pb-10">
      <SectionHeading
        eyebrow="Tienda"
        title="Vendé mejor con una grilla clara, rápida y con mejor jerarquía visual"
        description="El catálogo ahora tiene filtros, búsqueda, CTA consistente y una estética menos improvisada y más boutique."
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-[1fr_220px]">
        <div>
          <label className="text-sm font-semibold text-stone-700" htmlFor="search-products">Buscar dulces</label>
          <input
            id="search-products"
            className="field mt-2"
            placeholder="Cookies, brownie, box regalo..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-stone-700" htmlFor="category-products">Categoría</label>
          <select
            id="category-products"
            className="field mt-2"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">Todas</option>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </section>

      {loading ? <LoadingPanel label="Cargando catálogo" /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {!loading && !error && filteredProducts.length === 0 ? (
        <EmptyState
          title="No encontramos productos con ese filtro"
          description="Probá cambiar la categoría o limpiar la búsqueda para ver todo el catálogo cargado por la admin."
        />
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={() => addItem(product)} />
        ))}
      </section>
    </div>
  );
}
function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { isLoggedIn, token, user } = useAuth();
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mercado_pago");
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    address: "",
    neighborhood: DEFAULT_NEIGHBORHOOD,
    city: DEFAULT_CITY,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name ?? current.name,
      email: user?.email ?? current.email,
    }));
  }, [user?.email, user?.name]);

  const shippingAmount = deliveryMethod === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + shippingAmount;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isLoggedIn) {
      setError("Necesitás iniciar sesión para completar la compra.");
      return;
    }

    if (!items.length) {
      setError("Tu carrito está vacío.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await ordersApi.create(
        {
          items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
          customer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
          },
          delivery: {
            method: deliveryMethod,
            address: deliveryMethod === "delivery" ? form.address : undefined,
            neighborhood: deliveryMethod === "delivery" ? form.neighborhood : DEFAULT_NEIGHBORHOOD,
            city: deliveryMethod === "delivery" ? form.city : DEFAULT_CITY,
            notes: form.notes,
            shipping_amount: shippingAmount,
          },
          payment_method: paymentMethod,
        },
        token,
      );

      const checkout = await paymentsApi.checkout(order.order_id, paymentMethod, token);
      clearCart();

      if (checkout.checkout_url) {
        window.location.href = checkout.checkout_url;
        return;
      }

      setSuccess("El pedido fue creado, pero no recibimos una URL de checkout. Revisá la configuración de Mercado Pago.");
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  };

  if (!items.length) {
    return (
      <EmptyState
        title="Tu checkout todavía no tiene productos"
        description="Agregá dulces desde la tienda y después volvé para elegir envío por Villa Maipu y completar el pago."
        action={<Link to="/tienda" className="btn-primary">Ir a la tienda</Link>}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="glass-panel p-7">
        <SectionHeading
          eyebrow="Checkout"
          title="Un flujo claro y corto para no perder ventas"
          description="Datos del cliente, tipo de entrega y medio de pago en una sola pantalla, con el resumen siempre visible."
        />

        {!isLoggedIn ? (
          <div className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            Necesitás una cuenta para comprar. <Link className="font-semibold underline" to="/ingresar">Ingresá acá</Link> o registrate antes de seguir.
          </div>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre">
              <input className="field" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre y apellido" required />
            </Field>
            <Field label="Email">
              <input className="field" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="nombre@email.com" required />
            </Field>
          </div>

          <Field label="Teléfono">
            <input className="field" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="WhatsApp para coordinar el pedido" />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <ChoiceCard active={deliveryMethod === "delivery"} icon={<Truck className="h-5 w-5" />} title="Envío Villa Maipu" description="Entrega local con fee fijo y validación de zona." onClick={() => setDeliveryMethod("delivery")} />
            <ChoiceCard active={deliveryMethod === "pickup"} icon={<MapPin className="h-5 w-5" />} title="Retiro" description="Sin costo de envío, ideal para coordinar por mensaje." onClick={() => setDeliveryMethod("pickup")} />
          </div>

          {deliveryMethod === "delivery" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Dirección">
                <input className="field" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Calle, número y piso" required />
              </Field>
              <Field label="Barrio">
                <input className="field" value={form.neighborhood} onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))} placeholder="Villa Maipu" required />
              </Field>
            </div>
          ) : null}

          <Field label="Notas para el pedido">
            <textarea className="field min-h-28" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Aclaraciones, dedicatorias o coordinación de entrega" />
          </Field>

          <div>
            <p className="text-sm font-semibold text-stone-700">Cómo querés pagar</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {paymentOptions.map((option) => (
                <ChoiceCard key={option.id} active={paymentMethod === option.id} icon={<CreditCard className="h-5 w-5" />} title={option.title} description={option.description} onClick={() => setPaymentMethod(option.id)} />
              ))}
            </div>
          </div>

          {error ? <ErrorBanner message={error} /> : null}
          {success ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div> : null}

          <button className="btn-primary w-full justify-center" type="submit" disabled={submitting || !isLoggedIn}>
            {submitting ? "Preparando checkout..." : "Crear pedido y pagar"}
          </button>
        </form>
      </div>

      <aside className="glass-panel h-fit p-7">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Resumen</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-stone-950">Tu pedido</h2>
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 border-b border-stone-200/70 pb-4">
              <div>
                <p className="font-semibold text-stone-900">{item.name}</p>
                <p className="text-sm text-stone-500">Cantidad: {item.quantity}</p>
              </div>
              <p className="font-semibold text-stone-900">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        <dl className="mt-6 space-y-3 text-sm text-stone-600">
          <div className="flex items-center justify-between"><dt>Subtotal</dt><dd className="font-semibold text-stone-900">{formatCurrency(subtotal)}</dd></div>
          <div className="flex items-center justify-between"><dt>Envío</dt><dd className="font-semibold text-stone-900">{formatCurrency(shippingAmount)}</dd></div>
          <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-base"><dt className="font-semibold text-stone-900">Total</dt><dd className="font-semibold text-stone-900">{formatCurrency(total)}</dd></div>
        </dl>
        <div className="mt-6 rounded-3xl bg-stone-900 px-5 py-4 text-sm text-white">
          Vas a ser redirigido a Mercado Pago para completar el pago con la opción que elijas.
        </div>
      </aside>
    </div>
  );
}

function OrdersPage() {
  const { isLoggedIn, token, user } = useAuth();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    setLoading(true);
    ordersApi
      .list(token)
      .then((data) => setOrders(data))
      .catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false));
  }, [isLoggedIn, token]);

  const paymentState = new URLSearchParams(location.search).get("payment");

  if (!isLoggedIn) {
    return (
      <EmptyState
        title="Iniciá sesión para ver tu historial"
        description="Desde acá vas a poder revisar pedidos, estados de pago y seguimiento de la compra."
        action={<Link to="/ingresar" className="btn-primary">Ingresar</Link>}
      />
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Historial" title={`Pedidos de ${user?.name ?? "tu cuenta"}`} description="El historial ahora muestra estado del pedido, detalle de productos, datos de entrega y estado de pagos registrados." />
      {paymentState ? <PaymentBanner paymentState={paymentState} /> : null}
      {loading ? <LoadingPanel label="Cargando pedidos" /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {!loading && !error && orders.length === 0 ? (
        <EmptyState title="Todavía no hay pedidos" description="Cuando completes una compra, el detalle va a aparecer acá junto con los datos de pago y entrega." action={<Link to="/tienda" className="btn-secondary">Ver tienda</Link>} />
      ) : null}
      <section className="grid gap-5 xl:grid-cols-2">
        {orders.map((order) => (
          <article key={order.id} className="glass-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Pedido #{order.id}</p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-stone-950">{formatCurrency(order.total_amount)}</h3>
                <p className="mt-2 text-sm text-stone-500">{formatDate(order.created_at)}</p>
              </div>
              <StatusPill status={order.status} />
            </div>
            <div className="mt-5 space-y-3 border-t border-stone-200/70 pt-5">
              {order.items.map((item) => (
                <div key={`${order.id}-${item.product_id}`} className="flex items-center justify-between text-sm text-stone-600">
                  <span>{item.quantity} x {item.product_name}</span>
                  <strong className="text-stone-900">{formatCurrency(item.unit_price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            {order.delivery ? (
              <div className="mt-5 rounded-3xl bg-stone-100/90 p-4 text-sm text-stone-600">
                <p className="font-semibold text-stone-900">Entrega</p>
                <p className="mt-2">{order.delivery.delivery_method === "delivery" ? "Envío local" : "Retiro"} · {order.delivery.neighborhood}</p>
                <p>{order.delivery.address || "Retiro coordinado"}</p>
                <p className="mt-2">Pago elegido: {labelForPaymentMethod(order.delivery.payment_method)}</p>
              </div>
            ) : null}
            {order.payments.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {order.payments.map((payment) => (
                  <span key={payment.id} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600">
                    {payment.provider} · {payment.status}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}

function AdminPage() {
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
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", category: "general", image_url: "", available: true });
  const [recipeForm, setRecipeForm] = useState({ title: "", summary: "", ingredients: "", steps: "", image_url: "", category: "general", status: "published" });

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
    setProductForm({ name: "", description: "", price: "", category: "general", image_url: "", available: true });
  };

  const resetRecipeForm = () => {
    setEditingRecipeId(null);
    setRecipeForm({ title: "", summary: "", ingredients: "", steps: "", image_url: "", category: "general", status: "published" });
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
      {feedback ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">{feedback}</div> : null}
      {activeTab === "overview" ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-panel p-6">
            <h3 className="font-display text-3xl font-semibold text-stone-950">Pedidos recientes</h3>
            <div className="mt-5 space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="rounded-3xl border border-stone-200/70 bg-white/90 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-900">Pedido #{order.id}</p>
                      <p className="text-sm text-stone-500">{order.user?.name} · {formatDate(order.created_at)}</p>
                    </div>
                    <StatusPill status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel p-6">
            <h3 className="font-display text-3xl font-semibold text-stone-950">Usuarios</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {users.slice(0, 6).map((currentUser) => (
                <div key={currentUser.id} className="rounded-3xl border border-stone-200/70 bg-white/90 p-4">
                  <p className="font-semibold text-stone-900">{currentUser.name}</p>
                  <p className="mt-1 text-sm text-stone-500">{currentUser.email}</p>
                  <span className="mt-3 inline-flex rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">{currentUser.is_admin ? "Admin" : "Cliente"}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "products" ? (
        <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <form className="glass-panel space-y-4 p-6" onSubmit={handleProductSubmit}>
            <h3 className="font-display text-3xl font-semibold text-stone-950">{editingProductId ? "Editar producto" : "Nuevo producto"}</h3>
            <Field label="Nombre"><input className="field" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} required /></Field>
            <Field label="Descripción"><textarea className="field min-h-28" value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Precio"><input className="field" type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} required /></Field>
              <Field label="Categoría"><input className="field" value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} /></Field>
            </div>
            <Field label="Imagen"><input className="field" value={productForm.image_url} onChange={(event) => setProductForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="https://..." /></Field>
            <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700">
              <input type="checkbox" checked={productForm.available} onChange={(event) => setProductForm((current) => ({ ...current, available: event.target.checked }))} />
              Disponible en la tienda
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" type="submit">{editingProductId ? "Guardar cambios" : "Crear producto"}</button>
              <button className="btn-secondary" type="button" onClick={resetProductForm}>Limpiar</button>
            </div>
          </form>
          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className="glass-panel overflow-hidden p-0">
                <img src={product.image_url || heroFallback[0].image} alt={product.name} className="h-44 w-full object-cover" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{product.category}</p>
                      <h3 className="mt-2 font-display text-2xl font-semibold text-stone-950">{product.name}</h3>
                    </div>
                    <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">{product.available ? "Activo" : "Oculto"}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{product.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-lg font-semibold text-stone-950">{formatCurrency(product.price)}</p>
                    <div className="flex gap-2">
                      <button className="btn-secondary" type="button" onClick={() => { setEditingProductId(product.id); setProductForm({ name: product.name, description: product.description ?? "", price: String(product.price), category: product.category, image_url: product.image_url ?? "", available: product.available }); }}>Editar</button>
                      <button className="btn-secondary" type="button" onClick={() => void handleDeleteProduct(product.id)}>Eliminar</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "recipes" ? (
        <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <form className="glass-panel space-y-4 p-6" onSubmit={handleRecipeSubmit}>
            <h3 className="font-display text-3xl font-semibold text-stone-950">{editingRecipeId ? "Editar receta" : "Nueva receta"}</h3>
            <Field label="Título"><input className="field" value={recipeForm.title} onChange={(event) => setRecipeForm((current) => ({ ...current, title: event.target.value }))} required /></Field>
            <Field label="Resumen"><textarea className="field min-h-24" value={recipeForm.summary} onChange={(event) => setRecipeForm((current) => ({ ...current, summary: event.target.value }))} required /></Field>
            <Field label="Ingredientes"><textarea className="field min-h-24" value={recipeForm.ingredients} onChange={(event) => setRecipeForm((current) => ({ ...current, ingredients: event.target.value }))} required /></Field>
            <Field label="Pasos"><textarea className="field min-h-32" value={recipeForm.steps} onChange={(event) => setRecipeForm((current) => ({ ...current, steps: event.target.value }))} required /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Categoría"><input className="field" value={recipeForm.category} onChange={(event) => setRecipeForm((current) => ({ ...current, category: event.target.value }))} /></Field>
              <Field label="Estado"><select className="field" value={recipeForm.status} onChange={(event) => setRecipeForm((current) => ({ ...current, status: event.target.value }))}><option value="published">Publicado</option><option value="draft">Borrador</option></select></Field>
            </div>
            <Field label="Imagen"><input className="field" value={recipeForm.image_url} onChange={(event) => setRecipeForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="https://..." /></Field>
            <div className="flex flex-wrap gap-3"><button className="btn-primary" type="submit">{editingRecipeId ? "Guardar cambios" : "Publicar receta"}</button><button className="btn-secondary" type="button" onClick={resetRecipeForm}>Limpiar</button></div>
          </form>
          <div className="grid gap-4 md:grid-cols-2">
            {recipes.map((recipe) => (
              <article key={recipe.id} className="glass-panel overflow-hidden p-0">
                <img src={recipe.image_url || heroFallback[1].image} alt={recipe.title} className="h-44 w-full object-cover" />
                <div className="p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{recipe.category}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-stone-950">{recipe.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{recipe.summary}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <StatusPill status={recipe.status} compact />
                    <div className="flex gap-2">
                      <button className="btn-secondary" type="button" onClick={() => { setEditingRecipeId(recipe.id); setRecipeForm({ title: recipe.title, summary: recipe.summary, ingredients: recipe.ingredients, steps: recipe.steps, image_url: recipe.image_url ?? "", category: recipe.category, status: recipe.status }); }}>Editar</button>
                      <button className="btn-secondary" type="button" onClick={() => void handleDeleteRecipe(recipe.id)}>Eliminar</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "orders" ? (
        <section className="grid gap-4">
          {orders.map((order) => (
            <article key={order.id} className="glass-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Pedido #{order.id}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-stone-950">{order.user?.name} · {formatCurrency(order.total_amount)}</h3>
                  <p className="mt-2 text-sm text-stone-500">{formatDate(order.created_at)}</p>
                </div>
                <select className="field min-w-48" value={order.status} onChange={(event) => void handleUpdateOrderStatus(order.id, event.target.value)}>
                  {orderStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-stone-100/90 p-4 text-sm text-stone-600">
                  <p className="font-semibold text-stone-900">Items</p>
                  <ul className="mt-3 space-y-2">{order.items.map((item) => <li key={`${order.id}-${item.product_id}`}>{item.quantity} x {item.product_name}</li>)}</ul>
                </div>
                <div className="rounded-3xl bg-stone-100/90 p-4 text-sm text-stone-600">
                  <p className="font-semibold text-stone-900">Entrega y pago</p>
                  <p className="mt-3">{order.delivery?.delivery_method === "delivery" ? "Envío local" : "Retiro"}</p>
                  <p>{order.delivery?.address || "Retiro coordinado"}</p>
                  <p className="mt-2">{labelForPaymentMethod(order.delivery?.payment_method)}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === "story" ? (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="glass-panel p-6">
            <h3 className="font-display text-3xl font-semibold text-stone-950">Texto institucional</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Editá la narrativa de la marca para que el home acompañe mejor el posicionamiento del ecommerce.</p>
            <textarea className="field mt-5 min-h-72" value={aboutContent} onChange={(event) => setAboutContent(event.target.value)} />
            <button className="btn-primary mt-4" type="button" onClick={() => void handleSaveStory()}>Guardar contenido</button>
          </div>
          <div className="glass-panel p-6">
            <h3 className="font-display text-3xl font-semibold text-stone-950">Preview editorial</h3>
            <div className="mt-5 rounded-[32px] bg-stone-900 p-6 text-stone-100">
              <p className="text-xs uppercase tracking-[0.32em] text-stone-400">Manifiesto</p>
              <p className="mt-4 font-display text-3xl font-semibold leading-tight">{aboutContent || "Tu historia de marca va a aparecer acá."}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { isLoggedIn, isLoading, login, user } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  if (isLoggedIn) {
    return <Navigate to={user?.is_admin ? "/admin" : "/tienda"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await login(form);
      navigate("/tienda");
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  return (
    <AuthLayout eyebrow="Acceso" title="Ingresá para comprar, seguir pedidos o administrar la tienda" description="La cuenta habilita historial de compras, checkout y dashboard para la admin." alternate={<Link to="/registro" className="font-semibold text-stone-900 underline">Crear cuenta</Link>}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Email"><input className="field" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></Field>
        <Field label="Contraseña"><input className="field" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required /></Field>
        {error ? <ErrorBanner message={error} /> : null}
        <button className="btn-primary w-full justify-center" type="submit" disabled={isLoading}>{isLoading ? "Ingresando..." : "Ingresar"}</button>
      </form>
    </AuthLayout>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const { isLoggedIn, isLoading, register, user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  if (isLoggedIn) {
    return <Navigate to={user?.is_admin ? "/admin" : "/tienda"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/tienda");
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  return (
    <AuthLayout eyebrow="Cuenta nueva" title="Creá tu cuenta para comprar y recibir confirmaciones" description="El registro conecta carrito, historial y mails de confirmación de compra en un mismo recorrido." alternate={<Link to="/ingresar" className="font-semibold text-stone-900 underline">Ya tengo cuenta</Link>}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Nombre"><input className="field" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></Field>
        <Field label="Email"><input className="field" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></Field>
        <Field label="Contraseña"><input className="field" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required /></Field>
        {error ? <ErrorBanner message={error} /> : null}
        <button className="btn-primary w-full justify-center" type="submit" disabled={isLoading}>{isLoading ? "Creando cuenta..." : "Crear cuenta"}</button>
      </form>
    </AuthLayout>
  );
}
function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const tick = useEffectEvent(() => {
    setCurrentIndex((current) => (current + 1) % slides.length);
  });

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }
    const id = window.setInterval(() => tick(), 5200);
    return () => window.clearInterval(id);
  }, [slides.length, tick]);

  const currentSlide = slides[currentIndex] ?? heroFallback[0];

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-stone-950 text-white shadow-2xl shadow-orange-950/15">
      <img src={currentSlide.image} alt={currentSlide.title} className="absolute inset-0 h-full w-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-br from-stone-950/90 via-stone-950/60 to-orange-900/25" />
      <div className="relative flex h-full min-h-[520px] flex-col justify-between p-7 sm:p-10">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.34em] text-white/80">
          <Sparkles className="h-3.5 w-3.5" />
          {currentSlide.eyebrow}
        </div>
        <div>
          <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">{currentSlide.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">{currentSlide.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to={currentSlide.ctaTo} className="btn-primary bg-white text-stone-950 hover:bg-stone-100">
              {currentSlide.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">{currentSlide.accent}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button key={slide.title} type="button" className={`h-2.5 rounded-full transition-all ${currentIndex === index ? "w-14 bg-white" : "w-6 bg-white/35"}`} onClick={() => setCurrentIndex(index)} aria-label={`Ir al slide ${index + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  return (
    <article className="product-card overflow-hidden rounded-[32px] border border-white/70 bg-white/90 p-0 shadow-xl shadow-orange-950/5 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-orange-950/10">
      <img src={product.image_url || heroFallback[0].image} alt={product.name} className="h-64 w-full object-cover" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{product.category}</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-stone-950">{product.name}</h3>
          </div>
          <div className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">{product.available ? "Stock" : "Pausa"}</div>
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">{product.description}</p>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-stone-500">Precio</p>
            <p className="mt-1 text-2xl font-semibold text-stone-950">{formatCurrency(product.price)}</p>
          </div>
          <button className="btn-primary" type="button" onClick={onAddToCart}>
            <ShoppingBag className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}

function CartDrawer() {
  const navigate = useNavigate();
  const { closeCart, isCartOpen, items, openCart, removeItem, subtotal, updateQuantity } = useCart();

  return (
    <>
      {!isCartOpen ? (
        <button type="button" className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-stone-900/20" onClick={openCart}>
          <ShoppingBag className="h-4 w-4" />
          Ver carrito
        </button>
      ) : null}
      {isCartOpen ? (
        <div className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-sm" onClick={closeCart}>
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl shadow-stone-950/20" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Carrito</p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-stone-950">Tu compra</h2>
              </div>
              <button type="button" className="rounded-2xl border border-stone-200 p-3" onClick={closeCart}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
              {items.length === 0 ? (
                <EmptyState title="Todavía no agregaste productos" description="Sumá un box, torta o cookies desde la tienda para iniciar el checkout." />
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-stone-200/70 bg-stone-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-900">{item.name}</p>
                        <p className="mt-1 text-sm text-stone-500">{formatCurrency(item.price)} c/u</p>
                      </div>
                      <button type="button" className="text-sm font-semibold text-stone-500" onClick={() => removeItem(item.id)}>Quitar</button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white p-1">
                        <button className="rounded-full px-3 py-1 text-sm" type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                        <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button className="rounded-full px-3 py-1 text-sm" type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                      <strong className="text-stone-900">{formatCurrency(item.price * item.quantity)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between text-sm text-stone-600"><span>Subtotal</span><strong className="text-stone-900">{formatCurrency(subtotal)}</strong></div>
              <button className="btn-primary mt-4 w-full justify-center" type="button" onClick={() => { closeCart(); navigate("/checkout"); }} disabled={items.length === 0}>
                Ir al checkout
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function SupportChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "bot", text: "Hola, soy el asistente de Andres Bakery. Puedo ayudarte con envíos en Villa Maipu, pagos o pedidos personalizados." }]);
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", message: "" });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setForm((current) => ({ ...current, name: user?.name ?? current.name, email: user?.email ?? current.email }));
  }, [user?.email, user?.name]);

  const addReply = (label: string, answer: string) => {
    setMessages((current) => [...current, { role: "user", text: label }, { role: "bot", text: answer }]);
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setFeedback("");
    try {
      await contactApi.send({ name: form.name || "Cliente web", email: form.email || "sin-email@local.dev", message: form.message });
      setMessages((current) => [...current, { role: "user", text: form.message }, { role: "bot", text: "Mensaje enviado. La admin lo va a recibir por mail para darte seguimiento." }]);
      setForm((current) => ({ ...current, message: "" }));
      setFeedback("Consulta enviada correctamente.");
    } catch (reason: unknown) {
      setFeedback(getErrorMessage(reason));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(380px,calc(100vw-32px))]">
      {isOpen ? (
        <div className="overflow-hidden rounded-[32px] border border-white/80 bg-white/95 shadow-2xl shadow-stone-950/20 backdrop-blur">
          <div className="flex items-center justify-between bg-stone-950 px-5 py-4 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Soporte</p>
              <h3 className="mt-1 font-display text-2xl font-semibold">Chat guiado</h3>
            </div>
            <button type="button" onClick={() => setIsOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 ${message.role === "bot" ? "bg-stone-100 text-stone-700" : "ml-auto bg-stone-900 text-white"}`}>
                {message.text}
              </div>
            ))}
          </div>
          <div className="border-t border-stone-200 px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {supportReplies.map((reply) => (
                <button key={reply.label} className="btn-secondary text-xs" type="button" onClick={() => addReply(reply.label, reply.answer)}>{reply.label}</button>
              ))}
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleSend}>
              <input className="field" placeholder="Tu nombre" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <input className="field" placeholder="Tu email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <textarea className="field min-h-24" placeholder="Escribí tu consulta" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} required />
              {feedback ? <p className="text-xs text-stone-500">{feedback}</p> : null}
              <button className="btn-primary w-full justify-center" type="submit" disabled={sending}><Send className="h-4 w-4" />{sending ? "Enviando..." : "Enviar consulta"}</button>
            </form>
          </div>
        </div>
      ) : null}
      <button type="button" className="ml-auto flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 shadow-xl shadow-stone-950/15" onClick={() => setIsOpen((value) => !value)}>
        <MessageCircle className="h-4 w-4 text-orange-500" />
        Soporte guiado
      </button>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-stone-500 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-xl font-semibold text-stone-950">Andres Bakery</p>
          <p className="mt-1">Ecommerce de dulces artesanales con entrega local en Villa Maipu.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <span>Mercado Pago, Visa y Mastercard</span>
          <span>Pedidos con mail automático</span>
          <span>Dashboard admin</span>
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs uppercase tracking-[0.34em] text-stone-500">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-stone-600 sm:text-lg">{description}</p>
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="glass-panel p-5">
      <div className="inline-flex rounded-2xl bg-stone-900 p-3 text-white">{icon}</div>
      <h3 className="mt-4 font-display text-2xl font-semibold text-stone-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-stone-600">{text}</p>
    </div>
  );
}

function StatCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="glass-panel p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{title}</p>
      <p className="mt-3 font-display text-3xl font-semibold text-stone-950">{value}</p>
      <p className="mt-2 text-sm text-stone-600">{detail}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function ChoiceCard({ active, icon, title, description, onClick }: { active: boolean; icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-[28px] border p-4 text-left transition ${active ? "border-stone-950 bg-stone-950 text-white shadow-xl shadow-stone-950/10" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"}`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex rounded-2xl p-3 ${active ? "bg-white/10" : "bg-stone-100"}`}>{icon}</span>
        <div>
          <p className="font-display text-2xl font-semibold">{title}</p>
          <p className={`mt-2 text-sm leading-6 ${active ? "text-white/75" : "text-stone-500"}`}>{description}</p>
        </div>
      </div>
    </button>
  );
}

function StatusPill({ status, compact = false }: { status: string; compact?: boolean }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${compact ? "text-xs" : "text-sm"} ${getStatusTone(status)}`}>{status.replaceAll("_", " ")}</span>;
}

function PaymentBanner({ paymentState }: { paymentState: string }) {
  const messageMap: Record<string, string> = {
    approved: "Pago aprobado. El pedido ya quedó registrado en tu historial.",
    pending: "El pago quedó pendiente. En cuanto Mercado Pago responda, el estado va a actualizarse.",
    failure: "El pago no se pudo completar. Podés volver a intentar desde un nuevo pedido.",
  };
  return <div className="rounded-3xl border border-stone-200 bg-white/90 px-5 py-4 text-sm text-stone-700 shadow-sm">{messageMap[paymentState] ?? "Estado de pago actualizado."}</div>;
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <section className="glass-panel mx-auto max-w-2xl p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-900 text-white"><Package className="h-7 w-7" /></div>
      <h2 className="mt-5 font-display text-3xl font-semibold text-stone-950">{title}</h2>
      <p className="mt-3 text-base leading-7 text-stone-600">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </section>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return <div className="glass-panel flex items-center gap-3 p-5 text-sm text-stone-600"><Clock3 className="h-5 w-5 animate-spin-slow text-orange-500" />{label}</div>;
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{message}</div>;
}

function AuthLayout({ eyebrow, title, description, alternate, children }: { eyebrow: string; title: string; description: string; alternate: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="glass-panel flex flex-col justify-between p-7">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{eyebrow}</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-stone-950">{title}</h1>
          <p className="mt-4 text-base leading-7 text-stone-600">{description}</p>
        </div>
        <div className="mt-8 inline-flex items-center gap-2 text-sm text-stone-500"><ShieldCheck className="h-4 w-4" />{alternate}</div>
      </div>
      <div className="glass-panel p-7">{children}</div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getErrorMessage(reason: unknown) {
  if (reason instanceof Error) {
    return reason.message;
  }
  return "Ocurrió un error inesperado.";
}

function getStatusTone(status: string) {
  switch (status) {
    case "paid":
    case "published":
    case "delivered":
      return "bg-emerald-100 text-emerald-800";
    case "payment_pending":
    case "pending":
    case "in_progress":
      return "bg-amber-100 text-amber-800";
    case "payment_failed":
    case "draft":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-stone-200 text-stone-700";
  }
}

function labelForPaymentMethod(paymentMethod?: string | null) {
  switch (paymentMethod) {
    case "visa":
      return "Visa vía Mercado Pago";
    case "mastercard":
      return "Mastercard vía Mercado Pago";
    case "mercado_pago":
      return "Mercado Pago";
    default:
      return "Mercado Pago";
  }
}
