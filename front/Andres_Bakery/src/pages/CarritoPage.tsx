import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trash2 } from "lucide-react";

import { QuantityPicker } from "../components/QuantityPicker";
import { EmptyState, SectionHeading } from "../components/ui";
import { useCart } from "../contexts/CartContext";
import { useSiteConfig } from "../contexts/SiteConfigContext";
import { heroFallback } from "../lib/constants";
import { formatCurrency } from "../lib/format";

export function CarritoPage() {
  const { bajar, closeCart, items, removeItem, subir, subtotal } = useCart();
  const { config, cargando } = useSiteConfig();

  // Agregar al carrito abre el panel rapido. Estando en esta pagina sobra,
  // y encima la tapa: aca el carrito ya esta a la vista.
  useEffect(() => {
    closeCart();
  }, [closeCart, items.length]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Tu carrito está vacío"
        description="Elegí algo de la carta y va a aparecer acá con el total calculado."
        action={<Link to="/tienda" className="btn-primary">Ver la carta</Link>}
      />
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Carrito"
        title="Lo que te vas a llevar"
        description="Ajustá las cantidades acá. El total final lo confirma el servidor cuando hacés el pedido."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="pixel-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <img
                src={item.image_url || heroFallback[0].image}
                alt={item.name}
                className="marco-foto h-28 w-full object-cover sm:w-28"
              />

              <div className="flex-1">
                <h2 className="font-display text-xl font-bold text-tinta">
                  <Link to={`/producto/${item.slug}`} className="hover:text-acento">
                    {item.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-tinta-tenue">
                  {formatCurrency(item.price)} por {item.unit_label}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <QuantityPicker
                  product={item}
                  cantidad={item.quantity}
                  onSubir={() => subir(item.id)}
                  onBajar={() => bajar(item.id)}
                />

                <p className="min-w-28 text-right font-display text-xl font-bold text-acento">
                  {formatCurrency(item.price * item.quantity)}
                </p>

                <button
                  type="button"
                  className="btn-secondary px-3"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Quitar ${item.name} del carrito`}
                  title="Quitar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </section>

        <aside className="pixel-panel h-fit p-6">
          <h2 className="font-display text-2xl font-bold text-tinta">Resumen</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-tinta-suave">Subtotal</dt>
              <dd className="font-bold text-tinta">{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-tinta-suave">
                {config ? `Envío en ${config.zone_name}` : "Envío"}
              </dt>
              <dd className="font-bold text-tinta">
                {config ? formatCurrency(config.fee) : cargando ? "..." : "a confirmar"}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t-[3px] border-borde pt-3">
              <dt className="font-display text-lg font-bold text-tinta">
                {config ? "Con envío" : "Total sin envío"}
              </dt>
              <dd className="font-display text-lg font-bold text-acento">
                {formatCurrency(subtotal + (config?.fee ?? 0))}
              </dd>
            </div>
          </dl>

          {config ? (
            <p className="mt-4 border-[3px] border-borde bg-superficie-alt p-3 text-xs leading-5 text-tinta-suave">
              Si retirás por {config.pickup_address} no pagás envío. Se elige en el paso siguiente.
            </p>
          ) : (
            <p className="mt-4 border-[3px] border-dashed border-borde p-3 text-xs leading-5 text-tinta-suave">
              No pudimos traer el costo del envío. El total de arriba es solo de los productos: el
              envío se confirma en el checkout.
            </p>
          )}

          <Link to="/checkout" className="btn-primary mt-5 w-full justify-center">
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/tienda" className="btn-secondary mt-3 w-full justify-center">
            Seguir mirando
          </Link>
        </aside>
      </div>
    </div>
  );
}
