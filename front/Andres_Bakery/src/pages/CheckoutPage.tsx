import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CreditCard, MapPin, Truck } from "lucide-react";

import { ChoiceCard, EmptyState, ErrorBanner, Field, SectionHeading } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { ordersApi, paymentsApi } from "../lib/api";
import { DEFAULT_CITY, DEFAULT_NEIGHBORHOOD, DELIVERY_FEE, paymentOptions } from "../lib/constants";
import { formatCurrency, getErrorMessage } from "../lib/format";
import type { DeliveryMethod, PaymentMethod } from "../lib/types";

export function CheckoutPage() {
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
        description="Agregá dulces desde la tienda y después volvé para elegir envío por Villa Maipú y completar el pago."
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
            <ChoiceCard active={deliveryMethod === "delivery"} icon={<Truck className="h-5 w-5" />} title="Envío Villa Maipú" description="Entrega local con fee fijo y validación de zona." onClick={() => setDeliveryMethod("delivery")} />
            <ChoiceCard active={deliveryMethod === "pickup"} icon={<MapPin className="h-5 w-5" />} title="Retiro" description="Sin costo de envío, ideal para coordinar por mensaje." onClick={() => setDeliveryMethod("pickup")} />
          </div>

          {deliveryMethod === "delivery" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Dirección">
                <input className="field" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Calle, número y piso" required />
              </Field>
              <Field label="Barrio">
                <input className="field" value={form.neighborhood} onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))} placeholder="Villa Maipú" required />
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
