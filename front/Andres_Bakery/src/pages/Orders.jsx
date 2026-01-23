export default function Orders() {
  return (
    <section className="section order">
      <div className="section-header">
        <h2>Hacé tu pedido</h2>
        <p>Elegí tu receta favorita y coordinamos la entrega.</p>
      </div>
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
    </section>
  );
}