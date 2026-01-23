import { useCart } from "../components/CartContext.jsx";

export default function Orders() {
  const { items, updateQuantity, removeItem } = useCart();

  return (
    <section className="section order">
      <div className="section-header">
        <h2>Hacé tu pedido</h2>
        <p>Elegí tu receta favorita y coordinamos la entrega.</p>
      </div>
      <div className="order-layout">
        <form className="order-form">
          <label>
            Nombre
            <input type="text" placeholder="Tu nombre" />
          </label>
          <label>
            Receta o producto
            <input type="text" placeholder="¿Qué te gustaría probar?" />
          </label>
          <label>
            Cantidad
            <input type="number" min="1" defaultValue="1" />
          </label>
          <label>
            Fecha deseada
            <input type="date" />
          </label>
          <label>
            Comentarios
            <textarea rows="4" placeholder="Detalles para tu pedido"></textarea>
          </label>
          <button type="submit" className="primary">
            Enviar pedido
          </button>
        </form>
        <div className="order-cart">
          <h3>Resumen del carrito</h3>
          {items.length === 0 ? (
            <p>Agregá recetas desde la sección Recetas.</p>
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
        </div>
      </div>
    </section>
  );
}