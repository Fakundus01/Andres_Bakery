# T4-F19b · Variantes desde el panel

**Feature:** F19 (cierra al 100%) · **Rama:** `dev` · **Tier (R12):** MEDIO
**Depende de:** `T4-F19a`. No empieza antes de que el servidor sepa cobrar la variante.
**Superficie (R27):** N1 (panel admin) + roza N3: lo que se carga acá define precios. El control de
plata ya está en F19a; acá se verifica que no se lo pueda esquivar desde el panel.


> **Implementada el 2026-10-19.** La corrección del back que esta tarjeta pedía (`_build_variants` conserva ids) había entrado antes, con las correcciones de la revisión de T18, que la encontró rota por su lado. C5 se implementó como pedía la tarjeta: un tamaño borrado tiene su propio mensaje, distinto del tamaño ajeno. Y mirando el navegador salieron dos cosas que no estaban en ningún criterio: el **resumen del checkout cobraba el precio base** y dos renglones del mismo producto **compartían la key de React**.

## Por qué

Es lo que `features.md` F19 pide desde T3: *"modelo, API y selector en la ficha listos; falta
cargarlas desde el panel"*. `product_service._build_variants` ya valida nombre y precio: falta la
pantalla, y una corrección en el back que se explica abajo.

## Zona de archivos

```
front/Andres_Bakery/src/pages/admin/VariantesDelProducto.tsx   (nuevo)
front/Andres_Bakery/src/pages/admin/ProductsTab.tsx            (lo monta + carga al editar)
front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts         (arma el payload)
front/Andres_Bakery/src/lib/ui-types.ts                        (+ ProductForm.variants)
backend/services/product_service.py                            (_build_variants conserva ids)
backend/tests/test_product_service.py                          (+ casos)
```

## La corrección en el back: los ids de las variantes dejan de cambiar

`_build_variants` arma `ProductVariant` nuevos **siempre**, y con `delete-orphan` eso borra los
viejos. Hoy no se nota porque nadie edita variantes. Con el panel, cada vez que Andrea toque un
producto, sus variantes cambian de id — y el carrito que alguien tenía abierto con `variant_id: 5`
manda un id que ya no existe y se come un 400 en el checkout, el peor lugar posible.

**Decisión:** `_build_variants` acepta un `id` opcional en cada variante. Si viene y es de ese
producto, actualiza la fila en vez de reemplazarla. Las que no vienen, se borran. Es el mismo
contrato que ya tiene (`"variants" in data` reemplaza la lista), pero sin churn de ids.

Y aun así, la variante puede desaparecer de verdad: **un `variant_id` que ya no existe tiene que dar
un 400 que se entienda** ("ese tamaño ya no está disponible, actualizá la página"), no el 400 genérico.

## Decisiones ya tomadas

- **El editor no se muestra si el producto no tiene variantes**, hasta apretar "agregar tamaño". El
  formulario ya es largo; no crece para los 20 productos que se venden por unidad a causa de los 2
  que se venden por tamaño.
- **Precio y nombre son obligatorios por variante** — ya lo valida el back; el front lo dice antes de
  mandar para que no sea un 400.

## Criterios de aceptación

| # | Criterio | Lo demuestra |
|---|---|---|
| C1 | Agregar, renombrar, cambiar precio, reordenar y borrar tamaños desde el panel, y que persista | navegador |
| C2 | Editar un producto **sin tocar** las variantes no las borra | `test_product_service.py` |
| C3 | Guardar un producto ya editado **conserva los ids** de las variantes que siguen | `test_product_service.py` |
| C4 | Variante sin nombre o sin precio ⇒ el panel lo dice antes de mandar; si igual llega, 400 | test + navegador |
| C5 | `variant_id` de una variante borrada ⇒ 400 **explicado**, no genérico | `test_pedido_hostil.py` |
| C6 | Un producto con 2 tamaños cargado desde el panel se compra al precio correcto, de punta a punta | navegador (cierra con B7 de F19a) |
| C7 | A 375px y 390px, sin scroll horizontal | navegador |

## Verificación (R30)

```
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
npm --prefix front/Andres_Bakery run test
npm --prefix front/Andres_Bakery run lint
npm --prefix front/Andres_Bakery run build
```

Rojo medido (R29): C3 contra la base de hoy tiene que fallar mostrando que los ids cambiaron.
