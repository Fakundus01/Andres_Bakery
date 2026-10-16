import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { ProductCard } from "../components/ProductCard";
import { EmptyState, ErrorBanner, LoadingPanel, SectionHeading } from "../components/ui";
import { useCart } from "../contexts/CartContext";
import { productsApi } from "../lib/api";
import { getErrorMessage } from "../lib/format";
import type { Product } from "../lib/types";

export function ShopPage() {
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
