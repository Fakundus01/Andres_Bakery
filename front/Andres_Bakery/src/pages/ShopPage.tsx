import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { ProductCard } from "../components/ProductCard";
import { EmptyState, ErrorBanner, LoadingPanel, SectionHeading } from "../components/ui";
import { useCart } from "../contexts/CartContext";
import { productsApi, tagsApi } from "../lib/api";
import { getErrorMessage } from "../lib/format";
import type { Product, Tag } from "../lib/types";

export function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [tagSlug, setTagSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { addItem } = useCart();

  // El filtro por etiqueta lo resuelve el back (`?tag=`), no un filtrado en
  // memoria: es la misma consulta que usa el link compartible.
  useEffect(() => {
    let vigente = true;
    setLoading(true);
    productsApi
      .list({ tag: tagSlug || undefined, soloDisponibles: true })
      .then((data) => {
        if (vigente) {
          setProducts(data);
        }
      })
      .catch((reason: unknown) => {
        if (vigente) {
          setError(getErrorMessage(reason));
        }
      })
      .finally(() => {
        if (vigente) {
          setLoading(false);
        }
      });
    return () => {
      vigente = false;
    };
  }, [tagSlug]);

  useEffect(() => {
    tagsApi
      .list()
      .then(setTags)
      // Sin etiquetas la carta funciona igual: no vale la pena un error rojo.
      .catch(() => setTags([]));
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
        eyebrow="La carta"
        title="Todo lo que Andrea tiene para encargar"
        description="Buscá por nombre, filtrá por categoría o por etiqueta. Cada tarjeta se da vuelta y te muestra qué lleva."
      />

      <section className="pixel-panel grid gap-4 p-5 md:grid-cols-[1fr_220px]">
        <div>
          <label className="text-sm font-semibold text-tinta-suave" htmlFor="search-products">Buscar dulces</label>
          <input
            id="search-products"
            className="field mt-2"
            placeholder="Cookies, brownie, box regalo..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-tinta-suave" htmlFor="category-products">Categoría</label>
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

        {tags.length > 0 ? (
          <div className="md:col-span-2">
            <p className="text-sm font-semibold text-tinta-suave">Etiquetas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={tagSlug === ""}
                onClick={() => setTagSlug("")}
                className={`border-[3px] border-borde px-3 py-1.5 text-xs font-bold ${
                  tagSlug === "" ? "bg-acento text-crema" : "bg-superficie-alt text-tinta"
                }`}
              >
                Todo
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={tagSlug === tag.slug}
                  onClick={() => setTagSlug(tag.slug)}
                  className={`border-[3px] border-borde px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                    tagSlug === tag.slug ? "bg-acento text-crema" : "bg-superficie-alt text-tinta"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {loading ? <LoadingPanel label="Cargando catálogo" /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {!loading && !error && filteredProducts.length === 0 ? (
        <EmptyState
          title="No encontramos productos con ese filtro"
          description="Probá cambiar la categoría, sacar la etiqueta o limpiar la búsqueda para ver toda la carta."
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
