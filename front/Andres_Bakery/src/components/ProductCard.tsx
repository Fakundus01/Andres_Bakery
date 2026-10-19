import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChefHat, RotateCcw, ShoppingBag } from "lucide-react";

import { textoRegla } from "../lib/cantidades";
import { precioDesde, sePersonaliza } from "../lib/carrito";
import { heroFallback } from "../lib/constants";
import { formatCurrency } from "../lib/format";
import { urlDeImagen } from "../lib/imagenes";
import type { Product } from "../lib/types";
import { TagBadge } from "./TagBadge";

/** Se da vuelta **con un clic en la foto**, y con nada más (ADR-022).
 *
 *  Nunca con el hover: la cara de adelante tiene el "Agregar", y una tarjeta
 *  que gira cuando el puntero se acerca le mueve ese botón justo a quien iba a
 *  apretarlo. Girar tiene que ser algo que la persona pide, no algo que le
 *  pasa por mover el mouse.
 *
 *  La foto es el control: es lo más grande de la tarjeta, funciona igual con
 *  dedo que con mouse, y el cartelito de la esquina dice qué hace. */
export function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  const [volteada, setVolteada] = useState(false);
  const regla = textoRegla(product);
  const etiquetas = product.tags ?? [];
  /** Una torta con tamaños o sabores no se puede agregar desde la tarjeta:
   *  si el grupo es obligatorio el servidor rechaza el pedido, y con razón
   *  (ADR-031). La tarjeta manda a la ficha, que es donde se elige. */
  const seArma = sePersonaliza(product);

  const caraDeAdelante = useRef<HTMLElement>(null);
  const dorso = useRef<HTMLElement>(null);
  const yaGiro = useRef(false);

  /** Al girar, el foco se muda a la cara que quedó a la vista.
   *
   *  Poner `inert` en el ancestro de lo que estaba enfocado manda el foco al
   *  `<body>`: con el teclado se podía seguir, pero un lector de pantalla
   *  perdía el hilo y nada anunciaba que la tarjeta había girado. */
  useEffect(() => {
    if (!yaGiro.current) {
      return;
    }
    const cara = volteada ? dorso.current : caraDeAdelante.current;
    cara?.focus();
  }, [volteada]);

  const girar = (haciaElDorso: boolean) => {
    yaGiro.current = true;
    setVolteada(haciaElDorso);
  };

  return (
    <div className="flip-carta" data-volteada={volteada}>
      <div className="flip-carta-interior">
        <article
          ref={caraDeAdelante}
          tabIndex={-1}
          className="flip-cara product-card flex flex-col overflow-hidden"
          aria-hidden={volteada}
          inert={volteada}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => girar(true)}
              className="block w-full cursor-pointer"
              aria-label={`Ver qué lleva ${product.name}`}
            >
              <img
                src={urlDeImagen(product.image_url) || heroFallback[0].image}
                alt={product.name}
                className="h-56 w-full border-b-[3px] border-borde object-cover"
              />
              {/* Que se vea que la foto hace algo: sin esto, el giro es un
                  secreto que solo encuentra quien clickea por curiosidad. */}
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 border-[3px] border-borde bg-superficie px-2 py-1 text-xs font-bold text-tinta">
                <RotateCcw className="h-3.5 w-3.5" />
                Ver qué lleva
              </span>
            </button>
            {/* pointer-events-none en los cartelitos: se dibujan sobre la foto,
                que es el botón que da vuelta la tarjeta. Sin eso, el clic justo
                encima de una etiqueta no hacía nada. */}
            {etiquetas.length > 0 ? (
              <ul className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
                {etiquetas.map((tag) => (
                  <li key={tag.id}>
                    <TagBadge tag={tag} />
                  </li>
                ))}
              </ul>
            ) : null}
            {product.steps ? (
              <span
                className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 border-[3px] border-borde bg-superficie px-2 py-1 text-xs font-bold text-tinta"
                title="Este producto publica su receta"
              >
                <ChefHat className="h-3.5 w-3.5" />
                Con receta
              </span>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">{product.category}</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-tinta">
                  <Link to={`/producto/${product.slug}`} className="hover:text-acento">
                    {product.name}
                  </Link>
                </h3>
              </div>
              <span className="shrink-0 border-[3px] border-borde bg-superficie-alt px-2 py-1 text-xs font-bold text-tinta">
                {product.available ? "Hay" : "Pausa"}
              </span>
            </div>

            <div className="mt-auto pt-4">
              <p className="font-display text-3xl font-bold text-acento">
                {/* Con tamaños, el precio base puede no ser comprable: la
                    tarjeta dice "desde" y el más barato (review de T18). */}
                {product.variants?.length ? (
                  <span className="mr-1 font-sans text-sm font-bold text-tinta-tenue">desde</span>
                ) : null}
                {formatCurrency(precioDesde(product))}
                {product.variants?.length ? null : (
                  <span className="ml-1 font-sans text-sm font-bold text-tinta-tenue">/ {product.unit_label}</span>
                )}
              </p>
              {regla ? (
                <p className="mt-1 inline-block border-[3px] border-borde bg-superficie-alt px-2 py-1 text-xs font-bold text-tinta">
                  {regla}
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              {seArma ? (
                <Link
                  to={`/producto/${product.slug}`}
                  className="btn-primary w-full justify-center"
                  aria-disabled={!product.available}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Elegir y pedir
                </Link>
              ) : (
                <button
                  className="btn-primary w-full justify-center"
                  type="button"
                  onClick={onAddToCart}
                  disabled={!product.available}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Agregar
                </button>
              )}
            </div>
          </div>
        </article>

        <article
          ref={dorso}
          tabIndex={-1}
          aria-label={`Qué lleva ${product.name}`}
          className="flip-cara flip-cara-dorso product-card flex flex-col p-5"
          aria-hidden={!volteada}
          inert={!volteada}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">Qué lleva</p>
          <h3 className="mt-1 font-display text-2xl font-bold text-tinta">{product.name}</h3>

          <p className="mt-4 flex-1 text-sm leading-6 text-tinta-suave">
            {product.description || "Andrea todavía no cargó la descripción de este producto."}
          </p>

          {product.ingredients && product.ingredients.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.ingredients.map((ingrediente) => (
                <li key={ingrediente.id} className="border-[3px] border-borde bg-superficie-alt px-2 py-1 text-xs font-bold text-tinta">
                  {ingrediente.name}
                </li>
              ))}
            </ul>
          ) : null}

          {product.prep_note ? (
            <p className="mt-4 border-[3px] border-dashed border-borde px-3 py-2 text-xs leading-5 text-tinta-suave">
              {product.prep_note}
            </p>
          ) : null}

          <div className="mt-5 space-y-3 border-t-[3px] border-borde pt-4">
            {seArma ? (
              <Link
                to={`/producto/${product.slug}`}
                className="btn-primary w-full justify-center"
                aria-disabled={!product.available}
              >
                <ShoppingBag className="h-4 w-4" />
                Elegir y pedir
              </Link>
            ) : (
              <button
                className="btn-primary w-full justify-center"
                type="button"
                onClick={onAddToCart}
                disabled={!product.available}
              >
                <ShoppingBag className="h-4 w-4" />
                Agregar
              </button>
            )}
            <div className="flex items-center justify-between gap-3">
              <Link to={`/producto/${product.slug}`} className="btn-secondary px-3 py-2 text-sm">
                Ver la ficha
              </Link>
              <button
                className="btn-secondary px-3"
                type="button"
                onClick={() => girar(false)}
                aria-label="Volver a la foto"
                title="Volver"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
