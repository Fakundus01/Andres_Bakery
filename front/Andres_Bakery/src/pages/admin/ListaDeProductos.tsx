import { TagBadge } from "../../components/TagBadge";
import { textoRegla } from "../../lib/cantidades";
import { heroFallback } from "../../lib/constants";
import { formatCurrency } from "../../lib/format";
import { urlDeImagen } from "../../lib/imagenes";
import type { Product } from "../../lib/types";
import type { ProductForm } from "../../lib/ui-types";
import { formularioDesdeProducto } from "./valoresIniciales";

/** La carta como la ve Andrea, con el botón que la carga en el formulario.
 *
 *  Salió de `ProductsTab`, que pasó las 300 líneas al entrar el editor de
 *  tamaños (R05). El corte es natural: a la izquierda se carga, a la derecha
 *  se mira lo cargado.
 */
export function ListaDeProductos({
  products,
  onEditar,
  onPedirBorrado,
}: {
  products: Product[];
  onEditar: (form: ProductForm, productId: number) => void;
  onPedirBorrado: (product: Product) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {products.map((product) => (
        <article key={product.id} className="pixel-panel overflow-hidden p-0">
          <img
            src={urlDeImagen(product.image_url) || heroFallback[0].image}
            alt={product.name}
            className="h-44 w-full object-cover"
          />
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-tinta-tenue">
                  {product.category}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-tinta">
                  {product.name}
                </h3>
              </div>
              <span className="bg-tinta px-3 py-1 text-xs font-semibold text-crema">
                {product.available ? "Activo" : "Oculto"}
              </span>
            </div>

            {product.tags && product.tags.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <li key={tag.id}>
                    <TagBadge tag={tag} torcido={false} />
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="mt-3 text-sm leading-6 text-tinta-suave">{product.description}</p>

            <p className="mt-3 text-xs font-bold text-tinta-tenue">
              {/* Con tamaños, el precio de arriba no es lo que se cobra: la
                  lista muestra los tamaños para que se vea de un vistazo. */}
              {product.variants?.length
                ? product.variants
                    .map((tamano) => `${tamano.name}: ${formatCurrency(tamano.price)}`)
                    .join(" · ")
                : `${formatCurrency(product.price)} por ${product.unit_label}`}
              {textoRegla(product) ? ` · ${textoRegla(product)}` : ""}
              {product.steps ? " · con receta" : ""}
              {product.option_groups?.length
                ? ` · ${product.option_groups.map((grupo) => grupo.name).join(", ")}`
                : ""}
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => onEditar(formularioDesdeProducto(product), product.id)}
              >
                Editar
              </button>
              <button className="btn-secondary" type="button" onClick={() => onPedirBorrado(product)}>
                Eliminar
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
