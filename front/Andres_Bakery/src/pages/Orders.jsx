import { useState } from "react";

import { OrdersApi } from "../../api/ordersApi.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useCart } from "../components/CartContext.jsx";

export default function Orders() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { isLoggedIn, token } = useAuth();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    deliveryDate: "",
    notes: "",
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!isLoggedIn) {
      setMessage("Necesitás iniciar sesión para confirmar el pedido.");
      return;
    }
    if (items.length === 0) {
      setMessage("Sumá productos al carrito antes de continuar.");
      return;
    }

    setStatus("loading");
    try {
      const payload = {
        items: items.map((item) => ({
          product_id: item.product_id ?? item.id,
          quantity: item.quantity,
        })),
      };
      const response = await OrdersApi.create(payload, token);
      clearCart();
      setFormState({
        name: "",
        email: "",
        phone: "",
        address: "",
        deliveryDate: "",
        notes: "",
      });
      setStatus("success");
      setMessage(`Pedido confirmado (#${response.order_id}).`);
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  return (
    <section className="section order">
      <div className="section-header">
        <h2>Checkout</h2>
        <p>Confirmá tu pedido y coordinamos la entrega.</p>
      </div>
      <div className="order-layout">
        <form className="order-form" onSubmit={handleCheckout}>
          <label>
            Nombre
            <input
              type="text"
              name="name"
              value={formState.name}
              onChange={handleChange}
              placeholder="Tu nombre"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
              placeholder="tucorreo@email.com"
            />
          </label>
          <label>
            Teléfono
            <input
              type="tel"
              name="phone"
              value={formState.phone}
              onChange={handleChange}
              placeholder="+54 11 1234 5678"
            />
          </label>
          <label>
            Dirección de entrega
            <input
              type="text"
              name="address"
              value={formState.address}
              onChange={handleChange}
              placeholder="Calle y número"
            />
          </label>
          <label>
            Fecha deseada
            <input
              type="date"
              name="deliveryDate"
              value={formState.deliveryDate}
              onChange={handleChange}
            />
          </label>
          <label>
            Comentarios
            <textarea
              rows="4"
              name="notes"
              value={formState.notes}
              onChange={handleChange}
              placeholder="Detalles para tu pedido"
            ></textarea>
          </label>
          <button
            type="submit"
            className="primary"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Procesando..." : "Confirmar pedido"}
          </button>
          {message && <p className="order-message">{message}</p>}
        </form>
        <div className="order-cart">
          <h3>Resumen del carrito</h3>
          {items.length === 0 ? (
            <p>Agregá productos desde la sección Recetas.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.category}</span>
                  </div>
                  <div className="cart-actions">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="link"
                      onClick={() => removeItem(item.id)}
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <div className="order-summary">
              <strong>Total de items: {totalItems}</strong>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
