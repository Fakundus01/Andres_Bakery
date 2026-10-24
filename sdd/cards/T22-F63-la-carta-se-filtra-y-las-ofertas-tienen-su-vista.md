# T22-F63 · La carta se filtra, las ofertas tienen su vista, y la tarjeta deja de taparse

**Feature:** F63 (nueva) · **Rama:** `dev` · **Tier (R12):** MEDIO
**Depende de:** `T21-F62` (sin descuento no hay qué filtrar), ADR-022 (la tarjeta gira con un clic
en la foto), ADR-035 (el panel edita en pop-up).
**Superficie (R27):** N1 (panel admin) **y reclasifica**: hay **endpoint nuevo de escritura**
(etiquetar varios productos de una). La vista de ofertas y el filtro son **lectura pública** sobre
datos que ya son públicos.

> **Propuesta, sin implementar.** Falta el OK.

## Por qué

Tres cosas que pidió el humano, que son la misma: que las etiquetas se puedan usar para encontrar
cosas, no solo para decorar.

> *"Estaría bueno un filter del catálogo y una nueva view con los productos en oferta"*, más el tope
> de tres etiquetas visibles con la de oferta siempre visible y el resto al dar vuelta la tarjeta.

Y hay una razón de código que lo hace más urgente de lo que suena. Hoy `ProductCard.tsx:89-97`
dibuja **todas** las etiquetas sobre la foto, arriba a la izquierda, con `flex-wrap`: con cuatro
etiquetas le tapan la foto al producto, y en una repostería la foto *es* el producto (es el mismo
argumento de D19). El tope de tres no es estética: es lo que impide que cargar una etiqueta más
arruine la carta.

## Criterios

- **C1 · La tarjeta de la carta muestra tres etiquetas como máximo.** Las que tienen **descuento**
  van primero y **siempre entran**, aunque su `sort_order` las dejaría afuera. El resto sale por
  `sort_order` y después por nombre, para que el orden sea igual en cada carga y no el que devuelva
  la base.
- **C2 · La de personalización compite por las tres como cualquier otra** (lo pidió el humano:
  *"que compita"*). Se puede sin perder nada: el cartelito de "se arma a tu gusto" sale de
  `sePersonaliza(product, config.personalization_tag)` y **no** de que el badge esté visible, así que
  esconder el badge no esconde la función. Queda **verificado en el navegador**, no deducido.
- **C3 · Lo que no entra se ve al dar vuelta la tarjeta**, en el dorso, junto a "qué lleva". Si no
  sobró ninguna, el dorso **no** dibuja una lista vacía ni un título solo.
- **C4 · La ficha del producto muestra todas, sin tope.** Ahí hay lugar y es la pantalla donde se
  decide la compra.
- **C5 · El filtro del catálogo es por etiqueta**, visible en `/tienda`, y **se lee en la URL**
  (`/tienda?etiqueta=sin-tacc`) para que un filtro se pueda compartir por WhatsApp — que es como
  trabaja ella. Un slug que no existe **no** rompe la página: muestra la carta entera y lo dice.
- **C6 · `/ofertas` es una vista propia** que lista todo lo que tenga descuento, con su tachado. Si
  no hay nada en oferta, **dice que no hay** y ofrece ir a la carta; no es una página en blanco.
- **C7 · Etiquetar varios productos de una**, desde la pestaña Etiquetas: se abre una etiqueta, se
  ven los productos con un tilde cada uno y un buscador por nombre, y se guarda **en un solo
  request**. Medido en requests, no mirado: cuatro tildes tienen que ser **un POST**, no cuatro.
- **C8 · El endpoint nuevo es admin-only y se prueba como tal**: sin token, con token de cliente y
  con token de admin (401/403/200). Es escritura masiva, así que: un id repetido **no** duplica la
  fila de `product_tags`, un id que no existe **no** deja la operación a medio aplicar, y una lista
  de 10.000 ids **no** la acepta sin tope.
- **C9 · Las funciones puras, con tests** (ADR-023): `etiquetasVisibles(tags)` devuelve las tres y
  las que sobran, probada con cero, una, tres y cuatro etiquetas, con la de descuento en el último
  `sort_order`, y con dos etiquetas de igual `sort_order`.
- **C10 · R05.** `ProductCard.tsx` está en **239 líneas** y el dorso suma lista: la función pura se
  va a `lib/etiquetas.ts` y, si la cara de atrás no entra, sale a su propio componente antes de
  pasar las 300. `ListaDeEtiquetas.tsx` (73) tiene lugar para la puerta al pop-up nuevo.

## Lo que esta tarjeta NO hace

- **No reordena la carta para poner las ofertas primero.** El filtro y `/ofertas` dan la forma de
  encontrarlas sin mover lo que ve todo el mundo al entrar. Si lo querés, decilo y entra como
  criterio; prefiero preguntarlo a hacerlo de garrón.
- **No filtra por precio, por categoría ni por texto libre.** Solo por etiqueta, que es lo que se
  pidió. El buscador del catálogo, si se quiere, es otra tarjeta.
- **No pagina.** D5 sigue abierta y con la cantidad de productos de hoy no se nota.

## Zona de archivos

```
front/Andres_Bakery/src/lib/etiquetas.ts                      (nuevo, puro)
front/Andres_Bakery/src/lib/etiquetas.test.ts                 (nuevo)
front/Andres_Bakery/src/components/ProductCard.tsx            (239 -> tres adelante, el resto al dorso)
front/Andres_Bakery/src/components/FiltroDeEtiquetas.tsx      (nuevo)
front/Andres_Bakery/src/pages/StorePage.tsx                   (el filtro + la URL)
front/Andres_Bakery/src/pages/OfertasPage.tsx                 (nuevo)
front/Andres_Bakery/src/pages/ProductPage.tsx                 (274 -> todas, sin tope)
front/Andres_Bakery/src/pages/admin/ProductosDeLaEtiqueta.tsx (nuevo: el tildado masivo)
front/Andres_Bakery/src/pages/admin/ListaDeEtiquetas.tsx      (73 -> la puerta al pop-up)
front/Andres_Bakery/src/lib/api/catalogo.ts                   (el endpoint nuevo)
front/Andres_Bakery/src/App.tsx                               (la ruta /ofertas)
backend/services/tag_service.py                               (120 -> el etiquetado masivo)
backend/routes/...                                            (la ruta nueva, admin-only)
backend/tests/test_etiquetado_masivo.py                       (nuevo)
```

## Cómo se verifica (R30)

1. **El rojo medido** contra el commit base, con su hash.
2. Las dos suites en verde, lint y build.
3. **Navegador a 1920px y 390px**, con un producto cargado a propósito con **cinco** etiquetas, una
   con descuento y con el `sort_order` más alto. Se mide: adelante hay **tres**, la de descuento es
   una de ellas, las otras dos están en el dorso, la ficha muestra las cinco, el cartelito de "se
   arma a tu gusto" **sigue apareciendo** con su badge escondido (C2), y
   `scrollWidth - clientWidth = 0` en las dos medidas.
4. El filtro, medido: entrar por `/tienda?etiqueta=<slug>` muestra lo filtrado, un slug inventado
   muestra la carta entera, y `/ofertas` sin nada en oferta dice que no hay.
5. El etiquetado masivo, **contado en requests**: cuatro tildes, un solo POST.
6. Reviewer independiente que re-ejecuta, **y security-reviewer** porque C8 abre escritura nueva
   (R31: N1+ lo pide siempre).
