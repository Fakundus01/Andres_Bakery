import { useCart } from "./CartContext.jsx";

export default function CartSummary() {
  const { items, removeItem, updateQuantity } = useCart();

  return (
    <aside className="cart">
      <h3>Carrito</h3>
      {items.length === 0 ? (
        <p className="cart-empty">Todavía no agregaste recetas.</p>
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
    </aside>
  );
}