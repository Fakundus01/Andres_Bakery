export function SiteFooter() {
  return (
    <footer className="border-t-[3px] border-borde bg-superficie/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-tinta-tenue sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-xl font-semibold text-tinta">Andres Bakery</p>
          <p className="mt-1">Ecommerce de dulces artesanales con entrega local en Villa Maipú.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <span>Mercado Pago, Visa y Mastercard</span>
          <span>Pedidos con mail automático</span>
          <span>Dashboard admin</span>
        </div>
      </div>
    </footer>
  );
}
