import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useSiteConfig } from "../../contexts/SiteConfigContext";
import { ordersApi, paymentsApi } from "../../lib/api";
import { DEFAULT_CITY } from "../../lib/constants";
import { linkWhatsApp } from "../../lib/contacto";
import { getErrorMessage } from "../../lib/format";
import type { DeliveryMethod, OrderCreationPayload, PaymentMethod } from "../../lib/types";

export interface PedidoHecho {
  numero: number;
  total: number;
  /** `null` cuando el back no tiene `WHATSAPP_PHONE` cargado. */
  whatsapp: string | null;
  conCuenta: boolean;
}

/** Cuántos dígitos tiene que tener un teléfono para que valga la pena mandarlo.
 *  Es el mismo mínimo que valida el back; acá es solo para avisar antes. */
const MINIMO_DIGITOS = 8;

export function useCheckout() {
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
  const [hecho, setHecho] = useState<PedidoHecho | null>(null);

  useEffect(() => {
    setForm((actual) => ({
      ...actual,
      name: user?.name ?? actual.name,
      email: user?.email ?? actual.email,
    }));
  }, [user?.email, user?.name]);

  // La zona la dice el back: es la misma que valida el pedido del otro lado.
  useEffect(() => {
    if (config?.zone_name) {
      setForm((actual) => ({ ...actual, neighborhood: actual.neighborhood || config.zone_name }));
    }
  }, [config?.zone_name]);

  // Mercado Pago está apagado hasta tener credenciales (ADR-002). Mientras
  // tanto el pedido se cierra por WhatsApp, y eso NO pide cuenta (ADR-025).
  const pagoOnline = config?.payments_enabled === true;
  const envio = deliveryMethod === "delivery" ? config?.fee ?? 0 : 0;
  const total = subtotal + envio;

  const cambiar = (campo: keyof typeof form, valor: string) =>
    setForm((actual) => ({ ...actual, [campo]: valor }));

  const armarPayload = (): OrderCreationPayload => ({
    items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
    customer: {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim(),
    },
    delivery: {
      method: deliveryMethod,
      address: deliveryMethod === "delivery" ? form.address : undefined,
      neighborhood:
        deliveryMethod === "delivery" ? form.neighborhood : config?.zone_name ?? form.neighborhood,
      city: form.city,
      notes: form.notes,
    },
    payment_method: paymentMethod,
  });

  const queFalta = (): string => {
    if (!items.length) return "Tu carrito está vacío.";
    if (!form.name.trim()) return "Necesitamos tu nombre para el pedido.";
    if (!pagoOnline && form.phone.replace(/\D/g, "").length < MINIMO_DIGITOS) {
      return "Necesitamos un teléfono de contacto: el pedido se cierra por WhatsApp.";
    }
    if (pagoOnline && !isLoggedIn) {
      return "Para pagar online necesitás una cuenta.";
    }
    return "";
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError("");

    const falta = queFalta();
    if (falta) {
      setError(falta);
      return;
    }

    setSubmitting(true);
    try {
      if (!pagoOnline) {
        const pedido = await ordersApi.crearPorWhatsApp(armarPayload(), token);
        clearCart();
        setHecho({
          numero: pedido.order_id,
          total: pedido.total,
          // El texto lo escribió el servidor con los precios de la base: acá
          // solo se arma el link.
          whatsapp: linkWhatsApp(pedido.phone, pedido.message),
          conCuenta: isLoggedIn,
        });
        return;
      }

      const pedido = await ordersApi.create(
        { ...armarPayload(), channel: "mercado_pago" },
        token as string,
      );
      const checkout = await paymentsApi.checkout(pedido.order_id, paymentMethod, token as string);
      clearCart();

      if (checkout.checkout_url) {
        window.location.href = checkout.checkout_url;
        return;
      }
      setError(
        "El pedido quedó creado, pero Mercado Pago no devolvió una URL de pago. Escribinos por WhatsApp y lo cerramos ahí.",
      );
    } catch (motivo: unknown) {
      setError(getErrorMessage(motivo));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    config,
    cambiar,
    deliveryMethod,
    enviar,
    envio,
    error,
    form,
    hecho,
    isLoggedIn,
    items,
    pagoOnline,
    paymentMethod,
    setDeliveryMethod,
    setPaymentMethod,
    subtotal,
    submitting,
    total,
  };
}
