import { DetalleDelRenglon } from "../components/DetalleDelRenglon";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { EmptyState, ErrorBanner, LoadingPanel, PaymentBanner, SectionHeading, StatusPill } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { ordersApi } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage, labelForPaymentMethod } from "../lib/format";
import { textoDeLaElegida } from "../lib/pedidos";
import type { Order } from "../lib/types";

export function OrdersPage() {
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
          <article key={order.id} className="pixel-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-tinta-tenue">Pedido #{order.id}</p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-tinta">{formatCurrency(order.total_amount)}</h3>
                <p className="mt-2 text-sm text-tinta-tenue">{formatDate(order.created_at)}</p>
              </div>
              <StatusPill status={order.status} />
            </div>
            <div className="mt-5 space-y-3 border-t-[3px] border-borde pt-5">
              {order.items.map((item, posicion) => (
                /* La clave lleva el id del renglón y, si no vino, la posición:
                   dos tamaños de la misma torta son dos renglones del mismo
                   `product_id` y compartían key. Mismo bug que el resumen del
                   checkout, abierto en esta pantalla (review de T4-F19b). */
                <div
                  key={item.id ?? `${order.id}-${item.product_id}-${posicion}`}
                  className="flex items-start justify-between gap-3 text-sm text-tinta-suave"
                >
                  <div className="min-w-0">
                    <span>
                      {item.quantity} x {item.product_name}
                      {item.variant_name ? ` (${item.variant_name})` : ""}
                    </span>
                    {/* Lo que pidió, en su propio pedido: sin esto, quien
                        encargó una torta con relleno leía "1 x Torta". */}
                    <DetalleDelRenglon
                      elegidas={(item.options ?? []).map(textoDeLaElegida)}
                      nota={item.note}
                      foto={item.reference_image}
                    />
                  </div>
                  <strong className="shrink-0 text-tinta">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>
            {order.delivery ? (
              <div className="mt-5 bg-superficie-alt/90 p-4 text-sm text-tinta-suave">
                <p className="font-semibold text-tinta">Entrega</p>
                <p className="mt-2">{order.delivery.delivery_method === "delivery" ? "Envío local" : "Retiro"} · {order.delivery.neighborhood}</p>
                <p>{order.delivery.address || "Retiro coordinado"}</p>
                <p className="mt-2">Pago elegido: {labelForPaymentMethod(order.delivery.payment_method)}</p>
              </div>
            ) : null}
            {order.payments.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {order.payments.map((payment) => (
                  <span key={payment.id} className="border-[3px] border-borde bg-superficie px-3 py-1 text-xs font-semibold text-tinta-suave">
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
