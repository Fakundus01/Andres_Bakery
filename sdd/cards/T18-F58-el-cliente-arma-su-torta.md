# T18-F58 · El cliente arma su torta

**Feature:** F58 · **Rama:** `dev` · **Tier (R12):** MEDIO · **ADR:** 031
**Depende de:** `T18-F57` **y de `T4-F19a`** · **Superficie (R27):** **N2** (dato que escribe un
anónimo y que se muestra en el panel y en el mensaje de WhatsApp). Lleva `security-reviewer` y
`pentester` después del reviewer funcional (R31).

## Por qué depende de F19a, y no es negociable

Con personalización, **dos tortas iguales con distinto relleno son dos renglones** del carrito. Hoy
`addItem`, `removeItem`, `subir` y `bajar` buscan por `item.id`. `T4-F19a` ya tiene que cambiar esa
identidad para las variantes de tamaño. Si F58 entra antes, se hace el mismo trabajo dos veces y la
segunda vez pisa a la primera.

La clave del renglón termina siendo `producto + variante + opciones elegidas + nota`. Dos tortas
con la misma configuración **sí** se agrupan; cambiar una coma en la nota hace un renglón nuevo, que
es lo correcto: son dos tortas distintas para quien las hace.

## El modelo

```
OrderItem ──1..n──▶ OrderItemOption   group_name · option_name   ← copiados (ADR-031)
OrderItem            note(≤300) · reference_image(URL propia, F59)
```

Sin FK a `Option`, por lo mismo que `variant_name`: un pedido es historia.

## Zona de archivos

```
backend/models.py · migrations/versions/000X_personalizacion_del_renglon.py
backend/services/order_service.py          (_agregar_renglon valida y copia)
backend/services/serializers.py            (el renglón las expone)
backend/services/mensaje_whatsapp.py       (el mensaje las nombra, con su tope)
backend/tests/test_order_service.py · test_pedido_hostil.py · test_mensaje_whatsapp.py
front/.../pages/ProductPage.tsx            (elegir + escribir, antes de "Agregar")
front/.../pages/producto/Personalizacion.tsx   (nuevo)
front/.../contexts/CartContext.tsx · lib/carrito.ts   (la clave del renglón, ya tocada por F19a)
front/.../components/CartDrawer.tsx · pages/CarritoPage.tsx
front/.../pages/checkout/pedidoDelFormulario.ts
front/.../pages/admin/OrdersTab.tsx        (Andrea ve qué le pidieron)
```

## El control que importa (R27)

```
Las opciones se validan EN EL SERVIDOR contra los grupos de ESE producto.
Un option_id que no pertenece a un grupo asignado al producto ⇒ 400.
```

Sin eso, el cliente manda el `option_id` de cualquier grupo y el pedido le llega a ella con un
relleno que esa torta no tiene. Es el mismo patrón que `_resolve_delivery_method` (lista blanca) y
que la verificación `variant.product_id == product.id` de ADR-029.

La **nota** entra por `saneado.texto` con tope 300 y **una sola línea**: si no, alguien escribe
`"Pagado: SI, transferencia hecha"` y en el panel parece un campo del sistema — el hallazgo real de
la review de T7.

## Criterios de aceptación

| # | Criterio | Lo demuestra |
|---|---|---|
| G1 | Pedido con opciones válidas ⇒ el renglón las guarda **por nombre** y el panel las muestra | `test_order_service.py` + navegador |
| G2 | `option_id` de un grupo que **no** es de ese producto ⇒ 400, sin crear el pedido | `test_pedido_hostil.py` |
| G3 | Falta un grupo `required` ⇒ 400 explicado en castellano | idem |
| G4 | `option_id` inexistente, negativo, `"3"`, `null`, `{}`, lista de 500 ⇒ 400 | idem |
| G5 | Nota de 10.000 caracteres ⇒ se acota; con saltos de línea ⇒ una sola línea | idem |
| G6 | Un producto **sin** grupos asignados se pide igual que hoy, sin regresión | la suite entera |
| G7 | El mensaje de WhatsApp nombra relleno, cobertura y nota, **y sigue entrando en 1500** con una nota larga y 10 productos | `test_mensaje_whatsapp.py` |
| G8 | Dos tortas con distinto relleno = **dos renglones**; con la misma configuración = uno con cantidad 2 | `carrito.test.ts` + navegador |
| G9 | Navegador sin sesión: elijo, escribo, pido, y le llega a Andrea completo | navegador |
| G10 | 375px y 390px sin desborde | navegador |

## Verificación (R30)

Las cuatro del proyecto, más la migración. **Reiniciar el back antes de probar en el navegador.**
Rojo medido (R29): G2 primero — tiene que fallar contra el código de hoy **aceptando la opción
ajena**, no con un error de import.
