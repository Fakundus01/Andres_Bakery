import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChefHat, HelpCircle, LayoutDashboard, Tags, Truck } from "lucide-react";

import { HeroCarousel } from "../components/HeroCarousel";
import { ProductCard } from "../components/ProductCard";
import { ErrorBanner, InfoCard, SectionHeading, StatCard } from "../components/ui";
import { useCart } from "../contexts/CartContext";
import { useSiteConfig } from "../contexts/SiteConfigContext";
import { productsApi, siteApi } from "../lib/api";
import { heroFallback } from "../lib/constants";
import { precioDesde } from "../lib/carrito";
import { urlDeImagen } from "../lib/imagenes";
import { formatCurrency, getErrorMessage } from "../lib/format";
import type { Product } from "../lib/types";
import type { Slide } from "../lib/ui-types";

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [about, setAbout] = useState("");
  const [error, setError] = useState("");
  const { addItem } = useCart();
  const { config } = useSiteConfig();

  useEffect(() => {
    let active = true;

    Promise.all([productsApi.list({ soloDisponibles: true }), siteApi.getAbout()])
      .then(([productsData, aboutData]) => {
        if (!active) {
          return;
        }
        setProducts(productsData);
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
  // Desde T3 la receta es un campo del producto (ADR-001): "lo que publica su
  // receta" es simplemente lo que tiene pasos cargados.
  const conReceta = products.filter((product) => Boolean(product.steps)).slice(0, 3);
  const slides = useMemo<Slide[]>(() => {
    if (!products.length) {
      return heroFallback;
    }

    return products.slice(0, 3).map((product) => ({
      eyebrow: product.category || "Catalogo",
      title: product.name,
      description: product.description || "Dulce artesanal listo para sumar al carrito.",
      image: urlDeImagen(product.image_url) || heroFallback[0].image,
      // Con tamaños, el precio base puede no ser comprable: la portada
      // dice "desde" y el más barato, igual que la tarjeta (F19a).
      accent: product.variants?.length
        ? `Disponible desde ${formatCurrency(precioDesde(product))}`
        : `Disponible por ${formatCurrency(product.price)}`,
      ctaLabel: "Ver la ficha",
      ctaTo: `/producto/${product.slug}`,
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
            text={`Entrega en ${config?.zone_name ?? "la zona"} o retiro, con el costo a la vista antes de confirmar.`}
          />
          <InfoCard
            icon={<Tags className="h-5 w-5" />}
            title="Etiquetas que ella decide"
            text="Sin TACC, vegano, sin lactosa: las carga Andrea y filtran la carta. Son su declaración, no un certificado."
          />
          <InfoCard
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="Admin listo para vender"
            text="Andrea carga productos con precio por unidad, mínimo de pedido, receta y etiquetas desde una sola pantalla."
          />
          <div className="pixel-panel relative overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-acento" />
            <p className="text-xs uppercase tracking-[0.3em] text-tinta-tenue">Soporte</p>
            <h3 className="mt-3 flex items-center gap-2 font-display text-2xl font-semibold text-tinta">
              <HelpCircle className="h-5 w-5 text-acento" />
              Ayuda abajo a la izquierda
            </h3>
            <p className="mt-3 text-sm leading-6 text-tinta-suave">
              Las preguntas de siempre contestadas, y de ahí sale el WhatsApp o el mail. No hay un chat
              que finja que alguien está del otro lado (ADR-013).
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Pedidos"
          value={config?.payments_enabled ? "Pago online" : "Por WhatsApp"}
          detail={config?.payments_enabled ? "Mercado Pago, Visa y Mastercard" : "Se coordina el pago con Andrea"}
        />
        <StatCard title="Zona de entrega" value={config?.zone_name ?? "Villa Maipú"} detail="Entrega local o retiro" />
        <StatCard title="La carta" value={String(products.length)} detail="Productos disponibles hoy" />
      </section>

      <SectionHeading
        eyebrow="Lo más pedido"
        title="La carta de Andrea, con precio por unidad y qué lleva cada cosa"
        description="Tocá la foto de una tarjeta y se da vuelta con los ingredientes. Si algo se vende de a 6, lo dice antes de que llegues al carrito."
      />
      {error ? <ErrorBanner message={error} /> : null}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {featuredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={() => addItem(product)} />
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="pixel-panel p-7">
          <p className="text-xs uppercase tracking-[0.32em] text-tinta-tenue">Historia</p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-tinta">
            Una pastelería digital con tono cálido y venta real.
          </h2>
          <p className="mt-4 text-base leading-7 text-tinta-suave">
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
            eyebrow="Con receta"
            title="Lo que además te enseña cómo se hace"
            description="Andrea publica la receta de algunos productos. Podés hacerla en casa o encargársela a ella: las dos cosas están bien."
          />
          {conReceta.length === 0 ? (
            <p className="mt-6 border-[3px] border-dashed border-borde p-5 text-sm leading-6 text-tinta-suave">
              Todavía ningún producto tiene la receta cargada. Cuando Andrea escriba los pasos de alguno,
              aparece acá solo.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {conReceta.map((product) => (
                <article key={product.id} className="pixel-panel overflow-hidden p-0">
                  <img
                    src={urlDeImagen(product.image_url) || heroFallback[2].image}
                    alt={product.name}
                    className="h-48 w-full border-b-[3px] border-borde object-cover"
                  />
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-[0.28em] text-tinta-tenue">{product.category}</p>
                    <h3 className="mt-3 font-display text-2xl font-semibold text-tinta">{product.name}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-tinta-suave">{product.description}</p>
                    <Link
                      to={`/producto/${product.slug}`}
                      className="mt-4 inline-flex items-center gap-2 border-[3px] border-borde bg-tinta px-3 py-1.5 text-xs font-bold text-crema"
                    >
                      <ChefHat className="h-3.5 w-3.5" />
                      Ver la receta
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
