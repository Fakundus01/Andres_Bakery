import { useEffect, useMemo, useState } from "react";

import {
  esPersonalizable,
  opcionesElegidas,
  precioDelRenglon,
  queFaltaElegir,
  type Personalizacion,
} from "../../lib/carrito";
import { useSiteConfig } from "../../contexts/SiteConfigContext";
import type { Product } from "../../lib/types";

/** Lo que el cliente va eligiendo en la ficha, antes de agregar al carrito.
 *
 *  Vive afuera de `ProductPage` porque esa pantalla ya estaba en 253 líneas
 *  (R05) y porque son una unidad: el tamaño, los sabores, la nota y la foto
 *  se eligen juntos y se resetean juntos.
 */
export function usePersonalizacion(product: Product | null) {
  /** Cuál es la etiqueta que habilita: lo dice el back (D27). Mientras la
   *  config no cargó, vale el default de `esPersonalizable`, que es el mismo
   *  valor; si algún día cambia, cambia en un solo lado. */
  const { config } = useSiteConfig();
  const [variante, setVariante] = useState<number | null>(null);
  const [elegidas, setElegidas] = useState<Record<number, number | undefined>>({});
  const [nota, setNota] = useState("");
  const [foto, setFoto] = useState("");

  /** Al cambiar de producto se arranca de cero, y el primer tamaño queda
   *  preelegido: la ficha nunca muestra un precio sin tamaño cuando el
   *  producto tiene tamaños. */
  useEffect(() => {
    setVariante(product?.variants?.length ? product.variants[0].id : null);
    setElegidas({});
    setNota("");
    setFoto("");
  }, [product?.id, product?.variants]);

  /** La personalización vive detrás de la etiqueta: sin ella la ficha no
   *  ofrece sabores, ni nota, ni foto, aunque el producto tenga grupos
   *  asignados por error. El back decide lo mismo. */
  const personalizable = product
    ? esPersonalizable(product, config?.personalization_tag)
    : false;

  /** En el orden que les puso ella, que es el que tiene sentido para armar
   *  la torta (bizcocho antes que cobertura, si así lo cargó). */
  const grupos = useMemo(
    () =>
      personalizable
        ? [...(product?.option_groups ?? [])].sort((uno, otro) => uno.sort_order - otro.sort_order)
        : [],
    [personalizable, product?.option_groups],
  );

  const varianteElegida = product?.variants?.find((item) => item.id === variante) ?? null;

  /** Sin la etiqueta solo viaja el tamaño: ni nota ni foto, aunque hayan
   *  quedado escritas antes de que el producto cambiara. El back rechaza esos
   *  campos para un producto que no se personaliza, así que mandarlos sería
   *  un 400 que la persona no entiende. */
  const personalizacion: Personalizacion = personalizable
    ? {
        variante: varianteElegida,
        opciones: opcionesElegidas(grupos, elegidas),
        nota: nota.trim(),
        fotoDeReferencia: foto,
      }
    : { variante: varianteElegida };

  return {
    personalizable,
    grupos,
    variante,
    setVariante,
    varianteElegida,
    elegidas,
    /** Un solo sabor por grupo: volver a tocar el elegido lo deselecciona,
     *  que es lo único razonable cuando el grupo es opcional. */
    elegir: (grupoId: number, opcionId: number) =>
      setElegidas((actuales) => ({
        ...actuales,
        [grupoId]: actuales[grupoId] === opcionId ? undefined : opcionId,
      })),
    nota,
    setNota,
    foto,
    setFoto,
    /** Lo que falta para poder agregar, o "". Espeja al back, que es quien
     *  decide de verdad. */
    falta: queFaltaElegir(grupos, elegidas),
    /** El precio de una unidad con lo elegido puesto: el tamaño **y** los
     *  recargos de los sabores (F61). Va `...personalizacion` entero y no
     *  `variante` sola para que no se pueda volver a olvidar un campo que
     *  mueve el precio: cuando la ficha mostraba el tamaño sin los recargos,
     *  decía $14.200 y el back cobraba $16.500. */
    precio: product ? precioDelRenglon({ ...product, ...personalizacion }) : 0,
    personalizacion,
  };
}
