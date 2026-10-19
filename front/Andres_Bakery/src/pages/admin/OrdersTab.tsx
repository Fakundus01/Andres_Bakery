import { DetalleDelRenglon } from "../../components/DetalleDelRenglon";
import { orderStatusOptions } from "../../lib/constants";
import { formatCurrency, formatDate, labelForPaymentMethod } from "../../lib/format";
import { quienPidio } from "../../lib/pedidos";
import type { Order } from "../../lib/types";

export function OrdersTab({
  orders,
  onUpdateStatus,
}: {
  orders: Order[];
  onUpdateStatus: (orderId: number, status: string) => void;
}) {
  return (
    <section className="grid gap-4">
      {orders.map((order) => {
        const quien = quienPidio(order);
        return (
          <article key={order.id} className="pixel-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-tinta-tenue">
                  Pedido #{order.id}
                  {quien.sinCuenta ? " · sin cuenta" : null}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-tinta">
                  {quien.nombre} · {formatCurrency(order.total_amount)}
                </h3>
                <p className="mt-2 text-sm text-tinta-tenue">{formatDate(order.created_at)}</p>
              </div>
              <select className="field min-w-48" value={order.status} onChange={(event) => onUpdateStatus(order.id, event.target.value)}>
                {orderStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="bg-superficie-alt/90 p-4 text-sm text-tinta-suave">
                <p className="font-semibold text-tinta">Items</p>
                <ul className="mt-3 space-y-3">
                  {order.items.map((item, posicion) => (
                    /* La clave lleva la posición: con tortas personalizadas,
                       dos renglones pueden ser del mismo producto y antes
                       compartían key. */
                    <li key={item.id ?? `${order.id}-${item.product_id}-${posicion}`}>
                      <span className="font-semibold text-tinta">
                        {item.quantity} x {item.product_name}
                      </span>
                      {/* Lo que le pidieron: sin esto, una torta a pedido le
                          llega al panel como "1 x Torta" y el relleno solo
                          existe en el WhatsApp (F58). */}
                      <DetalleDelRenglon
                        tamano={item.variant_name}
                        elegidas={(item.options ?? []).map(
                          (elegida) => `${elegida.group_name}: ${elegida.option_name}`,
                        )}
                        nota={item.note}
                        foto={item.reference_image}
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-superficie-alt/90 p-4 text-sm text-tinta-suave">
                <p className="font-semibold text-tinta">Contacto y entrega</p>
                {/* Un pedido de invitado no tiene usuario: sus datos están
                    acá y en ningún otro lado (F23, ADR-025). Antes esta
                    tarjeta decía "undefined" y no mostraba ni el teléfono. */}
                {quien.contacto ? (
                  <p className="mt-3">
                    <a className="font-semibold underline" href={quien.contacto.href}>
                      {quien.contacto.texto}
                    </a>
                  </p>
                ) : null}
                <p className="mt-3">{order.delivery?.delivery_method === "delivery" ? "Envío local" : "Retiro"}</p>
                <p>{order.delivery?.address || "Retiro coordinado"}</p>
                {order.delivery?.notes ? <p className="mt-2 italic">“{order.delivery.notes}”</p> : null}
                <p className="mt-2">{labelForPaymentMethod(order.delivery?.payment_method)}</p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
