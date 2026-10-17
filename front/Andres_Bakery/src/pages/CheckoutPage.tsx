import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CreditCard, MapPin, MessageCircle, Truck } from "lucide-react";

import { ChoiceCard, EmptyState, ErrorBanner, Field, SectionHeading } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useSiteConfig } from "../contexts/SiteConfigContext";
import { ordersApi, paymentsApi } from "../lib/api";
import { DEFAULT_CITY, paymentOptions } from "../lib/constants";
import { linkWhatsApp } from "../lib/contacto";
import { formatCurrency, getErrorMessage } from "../lib/format";
import type { DeliveryMethod, PaymentMethod } from "../lib/types";

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { isLoggedIn, token, user } = useAuth();
  const { config } = useSiteConfig();
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mercado_pago");
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    address: "",
    neighborhood: "",
    city: DEFAULT_CITY,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name ?? current.name,
      email: user?.email ?? current.email,
    }));
  }, [user?.email, user?.name]);

  // La zona la dice el back: es la misma que valida el pedido del otro lado.
  useEffect(() => {
    if (config?.zone_name) {
      setForm((current) => ({ ...current, neighborhood: current.neighborhood || config.zone_name }));
    }
  }, [config?.zone_name]);

  // Mercado Pago está apagado hasta tener credenciales (ADR-002). Mientras
  // tanto el pedido se registra igual y se coordina por WhatsApp.
  const pagoOnline = config?.payments_enabled === true;
  const shippingAmount = deliveryMethod === "delivery" ? config?.fee ?? 0 : 0;
  const total = subtotal + shippingAmount;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setWhatsapp(null);

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
            neighborhood:
              deliveryMethod === "delivery" ? form.neighborhood : config?.zone_name ?? form.neighborhood,
            city: form.city,
            notes: form.notes,
            shipping_amount: shippingAmount,
          },
          payment_method: paymentMethod,
          channel: pagoOnline ? "mercado_pago" : "whatsapp",
        },
        token,
      );

      if (!pagoOnline) {
        clearCart();
        setSuccess(
          `Tu pedido quedó registrado con el número #${order.order_id} por ${formatCurrency(order.total)}. ` +
            "Andrea lo recibe por mail y te escribe para coordinar el pago y la entrega.",
        );
        setWhatsapp(
          linkWhatsApp(
            config?.whatsapp_phone,
            `¡Hola Andrea! Hice el pedido #${order.order_id} desde la web.`,
          ),
        );
        return;
      }

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

  if (!items.length && !success) {
    return (
      <EmptyState
        title="Tu checkout todavía no tiene productos"
        description="Agregá dulces desde la carta y después volvé para elegir envío o retiro y cerrar el pedido."
        action={<Link to="/tienda" className="btn-primary">Ir a la carta</Link>}
      />
    );
  }

  if (success) {
    return (
      <div className="pixel-panel mx-auto max-w-xl space-y-5 p-7 text-center">
        <h1 className="font-display text-3xl font-bold text-tinta">Pedido registrado</h1>
        <p className="text-sm leading-7 text-tinta-suave">{success}</p>
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center">
            <MessageCircle className="h-4 w-4" />
            Avisarle por WhatsApp
          </a>
        ) : null}
        <Link to="/pedidos" className="btn-secondary w-full justify-center">
          Ver mis pedidos
        </Link>
        <Link to="/tienda" className="btn-secondary w-full justify-center">
          Seguir mirando la carta
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="pixel-panel p-7">
        <SectionHeading
          eyebrow="Checkout"
          title="Un flujo claro y corto para no perder ventas"
          description="Datos del cliente, tipo de entrega y medio de pago en una sola pantalla, con el resumen siempre visible."
        />

        {!isLoggedIn ? (
          <div className="mt-6 border bg-alerta-suave p-5 text-sm text-tinta pixel-panel-plano">
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
            <ChoiceCard
              active={deliveryMethod === "delivery"}
              icon={<Truck className="h-5 w-5" />}
              title={config ? `Envío en ${config.zone_name}` : "Envío"}
              description={config ? `${formatCurrency(config.fee)} de envío dentro de la zona.` : "El costo lo confirma Andrea."}
              onClick={() => setDeliveryMethod("delivery")}
            />
            <ChoiceCard
              active={deliveryMethod === "pickup"}
              icon={<MapPin className="h-5 w-5" />}
              title="Retiro"
              description={config?.pickup_address ? `Sin costo, en ${config.pickup_address}.` : "Sin costo de envío."}
              onClick={() => setDeliveryMethod("pickup")}
            />
          </div>

          {deliveryMethod === "delivery" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Dirección">
                <input className="field" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Calle, número y piso" required />
              </Field>
              <Field label="Barrio">
                <input className="field" value={form.neighborhood} onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))} placeholder={config?.zone_name ?? "Barrio"} required />
              </Field>
            </div>
          ) : null}

          <Field label="Notas para el pedido">
            <textarea className="field min-h-28" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Aclaraciones, dedicatorias o coordinación de entrega" />
          </Field>

          {pagoOnline ? (
            <div>
              <p className="text-sm font-semibold text-tinta-suave">Cómo querés pagar</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {paymentOptions.map((option) => (
                  <ChoiceCard key={option.id} active={paymentMethod === option.id} icon={<CreditCard className="h-5 w-5" />} title={option.title} description={option.description} onClick={() => setPaymentMethod(option.id)} />
                ))}
              </div>
            </div>
          ) : (
            <p className="border-[3px] border-dashed border-borde bg-superficie-alt p-4 text-sm leading-6 text-tinta-suave">
              El pago online todavía no está habilitado. Dejás el pedido hecho y Andrea te escribe para
              coordinar el pago y la entrega.
            </p>
          )}

          {error ? <ErrorBanner message={error} /> : null}

          <button className="btn-primary w-full justify-center" type="submit" disabled={submitting || !isLoggedIn}>
            {submitting ? "Enviando el pedido..." : pagoOnline ? "Crear pedido y pagar" : "Hacer el pedido"}
          </button>
        </form>
      </div>

      <aside className="pixel-panel h-fit p-7">
        <p className="text-xs uppercase tracking-[0.3em] text-tinta-tenue">Resumen</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-tinta">Tu pedido</h2>
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 border-b border-borde pb-4">
              <div>
                <p className="font-semibold text-tinta">{item.name}</p>
                <p className="text-sm text-tinta-tenue">
                  {item.quantity} {item.unit_label}
                </p>
              </div>
              <p className="font-semibold text-tinta">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        <dl className="mt-6 space-y-3 text-sm text-tinta-suave">
          <div className="flex items-center justify-between"><dt>Subtotal</dt><dd className="font-semibold text-tinta">{formatCurrency(subtotal)}</dd></div>
          <div className="flex items-center justify-between">
            <dt>Envío</dt>
            <dd className="font-semibold text-tinta">
              {deliveryMethod === "pickup" ? formatCurrency(0) : config ? formatCurrency(config.fee) : "a confirmar"}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t-[3px] border-borde pt-3 text-base"><dt className="font-semibold text-tinta">Total</dt><dd className="font-semibold text-tinta">{formatCurrency(total)}</dd></div>
        </dl>
        <div className="mt-6 bg-tinta px-5 py-4 text-sm text-crema">
          {pagoOnline
            ? "Vas a ser redirigido a Mercado Pago para completar el pago con la opción que elijas."
            : "El total lo vuelve a calcular el servidor cuando confirmás: lo que ves acá es una cuenta, no el precio final."}
        </div>
      </aside>
    </div>
  );
}
