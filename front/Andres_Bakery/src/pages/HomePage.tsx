import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChefHat, CreditCard, LayoutDashboard, Truck } from "lucide-react";

import { HeroCarousel } from "../components/HeroCarousel";
import { ProductCard } from "../components/ProductCard";
import { ErrorBanner, InfoCard, SectionHeading, StatCard } from "../components/ui";
import { useCart } from "../contexts/CartContext";
import { productsApi, recipesApi, siteApi } from "../lib/api";
import { heroFallback } from "../lib/constants";
import { formatCurrency, getErrorMessage } from "../lib/format";
import type { Product, Recipe } from "../lib/types";
import type { Slide } from "../lib/ui-types";

export function HomePage() {
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
            text="Checkout enfocado en Villa Maipú, con fee local visible y retiro como alternativa clara."
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
        <StatCard title="Zona de entrega" value="Villa Maipú" detail="Entrega local o retiro" />
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
