import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChefHat, Clock, ShoppingBag, Store, Truck } from "lucide-react";

import { QuantityPicker } from "../components/QuantityPicker";
import { TagBadge } from "../components/TagBadge";
import { EmptyState, ErrorBanner, LoadingPanel } from "../components/ui";
import { useCart } from "../contexts/CartContext";
import { useSiteConfig } from "../contexts/SiteConfigContext";
import { Personalizacion } from "./producto/Personalizacion";
import { usePersonalizacion } from "./producto/usePersonalizacion";
import { productsApi } from "../lib/api";
import { bajarCantidad, cantidadInicial, subirCantidad } from "../lib/cantidades";
import { heroFallback } from "../lib/constants";
import { urlDeImagen } from "../lib/imagenes";
import { formatCurrency, getErrorMessage } from "../lib/format";
import type { Product } from "../lib/types";

export function ProductPage() {
  const { slug = "" } = useParams();
  const { addItem } = useCart();
  const { config } = useSiteConfig();
  const [product, setProduct] = useState<Product | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const armado = usePersonalizacion(product);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError("");
    productsApi
      .getBySlug(slug)
      .then((datos) => {
        if (!vigente) {
          return;
        }
        setProduct(datos);
        setCantidad(cantidadInicial(datos));
      })
      .catch((reason: unknown) => {
        if (vigente) {
          setError(getErrorMessage(reason));
        }
      })
      .finally(() => {
        if (vigente) {
          setCargando(false);
        }
      });
    return () => {
      vigente = false;
    };
  }, [slug]);

  // Andrea escribe los pasos con o sin numerar. El número lo pone la lista,
  // así que si ella ya puso "1." se lo saca para no mostrarlo dos veces.
  const pasos = useMemo(
    () =>
      (product?.steps ?? "")
        .split("\n")
        .map((linea) => linea.trim().replace(/^\d+[.)-]\s*/, ""))
        .filter(Boolean),
    [product?.steps],
  );

  if (cargando) {
    return <LoadingPanel label="Buscando el producto" />;
  }
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error} />
        <Link to="/tienda" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" />
          Volver a la carta
        </Link>
      </div>
    );
  }
  if (!product) {
    return (
      <EmptyState
        title="No encontramos ese producto"
        description="Puede que Andrea lo haya dado de baja o que el link esté mal escrito."
        action={
          <Link to="/tienda" className="btn-primary">
            Ver la carta
          </Link>
        }
      />
    );
  }

  const { grupos, variante, setVariante, varianteElegida: elegida, falta, precio } = armado;

  return (
    <div className="space-y-8 pb-10">
      <Link to="/tienda" className="btn-secondary w-fit">
        <ArrowLeft className="h-4 w-4" />
        Volver a la carta
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="pixel-panel overflow-hidden p-0">
          <img
            src={urlDeImagen(product.image_url) || heroFallback[0].image}
            alt={product.name}
            className="h-[22rem] w-full border-b-[3px] border-borde object-cover"
          />
          <div className="space-y-4 p-6">
            {product.tags && product.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <li key={tag.id}>
                    <TagBadge tag={tag} />
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="text-sm leading-7 text-tinta-suave">
              {product.description || "Andrea todavía no cargó la descripción de este producto."}
            </p>

            {product.ingredients && product.ingredients.length > 0 ? (
              <div>
                <h2 className="font-display text-xl font-bold text-tinta">Qué lleva</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {product.ingredients.map((ingrediente) => (
                    <li
                      key={ingrediente.id}
                      className="border-[3px] border-borde bg-superficie-alt px-2 py-1 text-xs font-bold text-tinta"
                    >
                      {ingrediente.name}
                      {ingrediente.unit ? (
                        <span className="ml-1 font-normal text-tinta-tenue">({ingrediente.unit})</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="pixel-panel h-fit space-y-5 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">{product.category}</p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-tinta">{product.name}</h1>
          </div>

          <p className="font-display text-4xl font-bold text-acento">
            {formatCurrency(precio)}
            <span className="ml-2 font-sans text-sm font-bold text-tinta-tenue">
              / {elegida ? elegida.name : product.unit_label}
            </span>
          </p>

          {product.variants && product.variants.length > 0 ? (
            <div>
              <p className="text-sm font-bold text-tinta-suave">Tamaño</p>
              <div className="mt-2 grid gap-2">
                {product.variants.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === variante}
                    onClick={() => setVariante(item.id)}
                    className={`flex items-center justify-between border-[3px] border-borde px-4 py-3 text-left ${
                      item.id === variante ? "bg-acento text-crema" : "bg-superficie-alt text-tinta"
                    }`}
                  >
                    <span className="font-bold">{item.name}</span>
                    <span className="font-display font-bold">{formatCurrency(item.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {armado.personalizable ? (
            <Personalizacion
              grupos={grupos}
              elegidas={armado.elegidas}
              onElegir={armado.elegir}
              nota={armado.nota}
              onNota={armado.setNota}
              foto={armado.foto}
              onFoto={armado.setFoto}
            />
          ) : null}

          {product.prep_note ? (
            <p className="flex items-start gap-2 border-[3px] border-borde bg-superficie-alt p-3 text-sm leading-6 text-tinta-suave">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              {product.prep_note}
            </p>
          ) : null}

          <div className="space-y-2 text-sm text-tinta-suave">
            <p className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              {product.allows_delivery
                ? `Se entrega en ${config?.zone_name ?? "la zona de reparto"}`
                : "Este producto no sale a reparto"}
            </p>
            <p className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              {product.allows_pickup ? "Se puede retirar" : "No se retira, solo envío"}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t-[3px] border-borde pt-5">
            <QuantityPicker
              product={product}
              cantidad={cantidad}
              onSubir={() => setCantidad((actual) => subirCantidad(product, actual))}
              onBajar={() =>
                setCantidad((actual) => bajarCantidad(product, actual) || cantidadInicial(product))
              }
              etiquetaBajar="Restar"
            />
            <button
              type="button"
              className="btn-primary flex-1 justify-center"
              disabled={!product.available || Boolean(falta)}
              onClick={() => addItem(product, cantidad, armado.personalizacion)}
            >
              <ShoppingBag className="h-4 w-4" />
              {product.available ? `Agregar ${cantidad}` : "Sin stock"}
            </button>
          </div>

          {/* El aviso va pegado al botón, que es donde la persona está
              mirando. El servidor valida lo mismo (ADR-031): esto es para no
              hacerle descubrir en el checkout que falta elegir el relleno. */}
          {falta ? (
            <p className="border-[3px] border-borde bg-superficie-alt px-3 py-2 text-xs leading-5 text-tinta">
              {falta}
            </p>
          ) : null}

          <p className="text-right font-display text-xl font-bold text-tinta">
            {formatCurrency(precio * cantidad)}
          </p>
        </aside>
      </div>

      {pasos.length > 0 ? (
        <section className="pixel-panel p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-tinta">
            <ChefHat className="h-5 w-5" />
            Cómo se hace
          </h2>
          <p className="mt-2 text-sm text-tinta-suave">
            Andrea publica la receta de este producto. Podés hacerla en casa o encargársela a ella.
          </p>
          <ol className="mt-5 space-y-3">
            {pasos.map((paso, indice) => (
              <li key={`${indice}-${paso}`} className="flex gap-3 border-[3px] border-borde bg-superficie-alt p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-[3px] border-borde bg-superficie font-display font-bold text-tinta">
                  {indice + 1}
                </span>
                <p className="text-sm leading-7 text-tinta-suave">{paso}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
