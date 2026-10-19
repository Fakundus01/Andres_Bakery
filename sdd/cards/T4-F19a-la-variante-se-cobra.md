# T4-F19a · La variante elegida se cobra

**Feature:** F19 (la mitad que falta de verdad) · **Rama:** `dev` · **Tier (R12):** MEDIO
**Depende de:** nada · **Va ANTES que T4-F19b**, y el orden no es un detalle: si el panel sabe cargar
variantes antes de que el servidor sepa cobrarlas, hay una ventana en la que Andrea carga una torta
de $14.000 y la cobra $6.000.
**Superficie (R27):** **N3 — plata**. Un renglón de pedido cambia de precio según un id que manda el
cliente. Lleva `security-reviewer` y `pentester` después del reviewer funcional (R31).

## Por qué

El selector de tamaño de `ProductPage.tsx:161` es decorativo: cambia el número en pantalla
(línea 96) y `addItem(product, cantidad)` (línea 217) manda el producto pelado. `CartItem extends
Product` no tiene variante y `order_service.py:190` cobra `Decimal(str(product.price))`. El cliente
ve $14.000 y Andrea cobra el precio base. Es el DRIFT que se levantó antes de abrir esta tanda.

## Decisión de diseño: el pedido guarda el **nombre**, no el id

`OrderItem` **no** lleva FK a `product_variant`. Lleva `variant_name` (String(120), nullable), copiado
en el momento del pedido, igual que `unit_price`.

Dos razones, y la segunda es la que manda:

1. **Un pedido es historia.** Si Andrea renombra "Torta 8 porciones" a "Torta mediana" en marzo, el
   pedido de enero tiene que seguir diciendo lo que ella vendió en enero. Por eso `unit_price` ya se
   copia en vez de leerse del producto; esto es lo mismo.
2. **`Product.variants` tiene `cascade="all, delete-orphan"`.** Guardar el producto desde el panel
   reemplaza la lista entera y **borra las filas viejas**. Una FK desde `order_item` a algo que el
   panel borra de rutina es una violación de integridad esperando el día en que ella edite una torta
   que ya vendió. Sin FK, ese problema no existe.

**Lo que esto cuesta, dicho de frente:** no se podrá consultar "cuántas tortas de 8 porciones vendí"
con un `JOIN`; hay que agrupar por texto. Para el volumen de Andrea es irrelevante, y el día que
importe se resuelve con una tabla de reporte, no ensuciando el renglón del pedido.

## Zona de archivos

```
backend/models.py                                   (+ OrderItem.variant_name)
backend/migrations/versions/0006_variante_en_el_renglon.py   (nuevo)
    ^ era 0005; T6-F20b se quedo con ese numero al entrar primero
backend/services/order_service.py                   (_agregar_renglon resuelve la variante)
backend/services/serializers.py                     (el renglón expone variant_name)
backend/services/mensaje_whatsapp.py                (el renglón la nombra)
backend/tests/test_order_service.py                 (+ casos)
backend/tests/test_pedido_hostil.py                 (+ los ataques)
backend/tests/test_mensaje_whatsapp.py              (+ el renglón con variante)

front/Andres_Bakery/src/lib/types.ts                (el renglón del carrito)
front/Andres_Bakery/src/lib/carrito.ts              (nuevo, lógica pura: clave y precio del renglón)
front/Andres_Bakery/src/lib/carrito.test.ts         (nuevo)
front/Andres_Bakery/src/contexts/CartContext.tsx    (la clave del renglón deja de ser product.id)
front/Andres_Bakery/src/pages/ProductPage.tsx       (pasa la elegida)
front/Andres_Bakery/src/components/CartDrawer.tsx   (muestra el tamaño)
front/Andres_Bakery/src/pages/CarritoPage.tsx       (idem)
front/Andres_Bakery/src/pages/checkout/pedidoDelFormulario.ts  (manda variant_id)
front/Andres_Bakery/src/pages/checkout/pedidoDelFormulario.test.ts
front/Andres_Bakery/src/pages/admin/OrdersTab.tsx   (Andrea ve qué tamaño le pidieron)
```

## El control que importa (R27 · el test es parte del control)

```
El precio NUNCA llega del request. Llega variant_id; el servidor busca la fila y
VERIFICA que variant.product_id == product.id antes de usar su precio.
```

Sin esa verificación, mandar el `variant_id` de la variante barata de otro producto compra la torta
grande al precio del alfajor. Es el mismo agujero que `_resolve_shipping_amount` ya cerró para el
envío, en el mismo endpoint público.

## El carrito: la clave del renglón deja de ser `product.id`

Hoy `addItem`, `removeItem`, `subir` y `bajar` buscan por `item.id`. Con variantes, dos tamaños de la
misma torta son **dos renglones**, así que la clave pasa a ser `` `${product.id}:${variant?.id ?? 0}` ``,
calculada (no guardada). Un carrito viejo en `localStorage` no tiene variante, cae en `:0` y sigue
funcionando: **no hace falta subir `CART_STORAGE_KEY` a v3**, y conviene no hacerlo — vaciarle el
carrito a quien estaba comprando es peor que el problema que resolvería.

## Criterios de aceptación

| # | Criterio | Lo demuestra |
|---|---|---|
| B1 | Pedido con `variant_id` ⇒ `unit_price` es el precio de la variante y el total lo refleja | `test_order_service.py` |
| B2 | `variant_id` de **otro producto** ⇒ 400 y **no se crea el pedido** | `test_pedido_hostil.py` |
| B3 | `variant_id` inexistente, negativo, `"8"`, `null`, `{}` ⇒ 400 explicado en castellano | `test_pedido_hostil.py` |
| B4 | **Sin** `variant_id` ⇒ precio base, idéntico a hoy. Los 213 tests del back siguen verdes | la suite entera |
| B5 | El mensaje de WhatsApp nombra el tamaño: `- 1 x Torta de chocolate (8 porciones): $14.000` | `test_mensaje_whatsapp.py` |
| B6 | Migración `0006` probada **para arriba y para abajo sobre una copia de la base real**, y después sobre la real | salida pegada |
| B7 | Navegador sin sesión: elijo 8 porciones ⇒ el carrito dice $14.000 ⇒ el pedido le llega a Andrea en $14.000 con el tamaño | navegador |
| B8 | Dos tamaños de la misma torta = **dos renglones** en el carrito, cada uno con su precio | navegador + `carrito.test.ts` |
| B9 | Un renglón viejo en `localStorage` (sin variante) sigue andando y no vacía el carrito | `carrito.test.ts` |

## Verificación (R30)

```
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q   # base: 213 OK
npm --prefix front/Andres_Bakery run test     # base: 72 OK
npm --prefix front/Andres_Bakery run lint
npm --prefix front/Andres_Bakery run build
backend/.venv/Scripts/python.exe -m flask --app backend.app db upgrade
```

Rojo medido (R29): B2 primero. El test que manda el `variant_id` ajeno tiene que fallar contra el
código de hoy **cobrando de menos** (no con un error de import), y la salida se pega con el hash de
la base.
