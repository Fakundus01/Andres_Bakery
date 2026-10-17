import { Link } from "react-router-dom";
import { CreditCard, MapPin, MessageCircle, Truck } from "lucide-react";

import { ChoiceCard, EmptyState, ErrorBanner, Field, SectionHeading } from "../components/ui";
import { paymentOptions } from "../lib/constants";
import { formatCurrency } from "../lib/format";
import { PedidoListo } from "./checkout/PedidoListo";
import { ResumenDelPedido } from "./checkout/ResumenDelPedido";
import { useCheckout } from "./checkout/useCheckout";

export function CheckoutPage() {
  const pedido = useCheckout();
  const {
    cambiar,
    config,
    deliveryMethod,
    enviar,
    error,
    form,
    hecho,
    isLoggedIn,
    items,
    pagoOnline,
    paymentMethod,
    setDeliveryMethod,
    setPaymentMethod,
    submitting,
  } = pedido;

  if (hecho) {
    return <PedidoListo pedido={hecho} />;
  }

  if (!items.length) {
    return (
      <EmptyState
        title="Tu checkout todavía no tiene productos"
        description="Agregá dulces desde la carta y después volvé para elegir envío o retiro y cerrar el pedido."
        action={<Link to="/tienda" className="btn-primary">Ir a la carta</Link>}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="pixel-panel p-7">
        <SectionHeading
          eyebrow="Checkout"
          title="Un flujo claro y corto para no perder ventas"
          description={
            pagoOnline
              ? "Datos del cliente, tipo de entrega y medio de pago en una sola pantalla, con el resumen siempre visible."
              : "No hace falta tener cuenta: dejás tus datos y el pedido sale por WhatsApp con el total ya calculado."
          }
        />

        {/* Sin pago online no hay pared de login: el invitado pide igual
            (F23, F31). La cuenta solo hace falta para pagar por la web. */}
        {pagoOnline && !isLoggedIn ? (
          <div className="mt-6 border bg-alerta-suave p-5 text-sm text-tinta pixel-panel-plano">
            Para pagar online necesitás una cuenta.{" "}
            <Link className="font-semibold underline" to="/ingresar">
              Ingresá acá
            </Link>{" "}
            o registrate antes de seguir.
          </div>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={enviar}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre">
              <input
                className="field"
                value={form.name}
                onChange={(evento) => cambiar("name", evento.target.value)}
                placeholder="Nombre y apellido"
                required
              />
            </Field>
            <Field label={pagoOnline ? "Email" : "WhatsApp"}>
              {pagoOnline ? (
                <input
                  className="field"
                  type="email"
                  value={form.email}
                  onChange={(evento) => cambiar("email", evento.target.value)}
                  placeholder="nombre@email.com"
                  required
                />
              ) : (
                <input
                  className="field"
                  type="tel"
                  value={form.phone}
                  onChange={(evento) => cambiar("phone", evento.target.value)}
                  placeholder="11 5555 5555"
                  required
                />
              )}
            </Field>
          </div>

          <Field label={pagoOnline ? "Teléfono" : "Email (opcional)"}>
            {pagoOnline ? (
              <input
                className="field"
                type="tel"
                value={form.phone}
                onChange={(evento) => cambiar("phone", evento.target.value)}
                placeholder="WhatsApp para coordinar el pedido"
              />
            ) : (
              <input
                className="field"
                type="email"
                value={form.email}
                onChange={(evento) => cambiar("email", evento.target.value)}
                placeholder="Si lo dejás, te llega la confirmación por mail"
              />
            )}
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <ChoiceCard
              active={deliveryMethod === "delivery"}
              icon={<Truck className="h-5 w-5" />}
              title={config ? `Envío en ${config.zone_name}` : "Envío"}
              description={
                config ? `${formatCurrency(config.fee)} de envío dentro de la zona.` : "El costo lo confirma Andrea."
              }
              onClick={() => setDeliveryMethod("delivery")}
            />
            <ChoiceCard
              active={deliveryMethod === "pickup"}
              icon={<MapPin className="h-5 w-5" />}
              title="Retiro"
              description={
                config?.pickup_address ? `Sin costo, en ${config.pickup_address}.` : "Sin costo de envío."
              }
              onClick={() => setDeliveryMethod("pickup")}
            />
          </div>

          {deliveryMethod === "delivery" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Dirección">
                <input
                  className="field"
                  value={form.address}
                  onChange={(evento) => cambiar("address", evento.target.value)}
                  placeholder="Calle, número y piso"
                  required
                />
              </Field>
              <Field label="Barrio">
                <input
                  className="field"
                  value={form.neighborhood}
                  onChange={(evento) => cambiar("neighborhood", evento.target.value)}
                  placeholder={config?.zone_name ?? "Barrio"}
                  required
                />
              </Field>
            </div>
          ) : null}

          <Field label="Notas para el pedido">
            <textarea
              className="field min-h-28"
              value={form.notes}
              onChange={(evento) => cambiar("notes", evento.target.value)}
              placeholder="Aclaraciones, dedicatorias o coordinación de entrega"
            />
          </Field>

          {pagoOnline ? (
            <div>
              <p className="text-sm font-semibold text-tinta-suave">Cómo querés pagar</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {paymentOptions.map((opcion) => (
                  <ChoiceCard
                    key={opcion.id}
                    active={paymentMethod === opcion.id}
                    icon={<CreditCard className="h-5 w-5" />}
                    title={opcion.title}
                    description={opcion.description}
                    onClick={() => setPaymentMethod(opcion.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="border-[3px] border-dashed border-borde bg-superficie-alt p-4 text-sm leading-6 text-tinta-suave">
              El pago online todavía no está habilitado. Al confirmar se arma el mensaje con tu
              pedido y el total, y lo cerrás con Andrea por WhatsApp.
            </p>
          )}

          {error ? <ErrorBanner message={error} /> : null}

          <button className="btn-primary w-full justify-center" type="submit" disabled={submitting}>
            {submitting ? (
              "Enviando el pedido..."
            ) : pagoOnline ? (
              "Crear pedido y pagar"
            ) : (
              <>
                <MessageCircle className="h-4 w-4" />
                Pedir por WhatsApp
              </>
            )}
          </button>
        </form>
      </div>

      <ResumenDelPedido
        items={items}
        subtotal={pedido.subtotal}
        envio={pedido.envio}
        total={pedido.total}
        deliveryMethod={deliveryMethod}
        config={config}
        pagoOnline={pagoOnline}
      />
    </div>
  );
}
