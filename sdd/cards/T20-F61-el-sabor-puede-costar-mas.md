# T20-F61 · El sabor puede costar más

**Feature:** F61 (nueva) · **Rama:** `dev` · **Tier (R12):** ALTO (toca plata)
**Depende de:** `T18-F57` (los grupos y sus sabores) y `T4-F19a` (el tamaño elegido se cobra).
**Superficie (R27):** **reclasifica.** F57 era N1 (panel) + lectura pública; esto mete un **campo
nuevo que decide plata** en la ruta pública del pedido, así que vuelve a mirarse lo mismo que miró
`T4-F19a` para el tamaño: el precio sale de la base y nunca del request, y el recargo tiene que ser
de un sabor **de ese producto**.

## Por qué

Lo pidió el humano, textual: *"creo que eso le da un poco más de libertad al chef de decir, ah,
bueno, la de chocolate la vamos a hacer un poco más carita"*.

Hoy no se puede: `Option` es id + nombre + orden, y **ADR-031 lo dijo explícito** —"los sabores no
mueven el precio: sale del tamaño"—. Era verdad cuando los sabores eran dulce de leche o chocolate,
que cuestan lo mismo. Deja de serlo con un relleno que lleva más trabajo o un ingrediente caro.

Esto revierte esa parte de ADR-031, así que pide **ADR-036** y no un cambio en silencio (R25).

## Zona de archivos

```
backend/models/catalogo.py                          (Option.price_delta)
backend/migrations/versions/<rev>_recargo_del_sabor.py   (nueva, batch por SQLite)
backend/models/pedidos.py                           (OrderItemOption.price_delta)
backend/services/option_service.py                  (alta y edición del recargo)
backend/services/renglon_del_pedido.py              (el recargo se COBRA acá)
backend/services/sabores_del_renglon.py             (nuevo: salió de ahí por R05, con el testigo)
backend/tests/test_testigo_del_sabor.py             (nuevo: el testigo y los topes, por R05)
backend/services/serializers.py                     (lo expone en la opción y en el renglón)
backend/services/mensaje_whatsapp.py                (el mensaje lo dice)
backend/tests/test_recargo_del_sabor.py             (nuevo)
backend/tests/fabricas.py                           (la fábrica acepta sabores con recargo)
front/.../lib/types/catalogo.ts                     (price_delta en OptionChoice)
front/.../lib/carrito.ts                            (precioDelRenglon y precioDesde)
front/.../lib/recargos.ts + recargos.test.ts        (nuevo: todo lo del recargo, por R05)
front/.../lib/pedidos.ts                            (el pedido guardado dice el recargo)
front/.../pages/{admin/OrdersTab,OrdersPage}.tsx    (lo muestran)
front/.../pages/checkout/pedidoDelFormulario.ts     (manda el testigo del sabor)
front/.../lib/carrito.test.ts                       (el rojo del front)
front/.../lib/api/catalogo.ts                       (el panel manda el recargo)
front/.../pages/producto/Personalizacion.tsx        (el chip dice "+$500")
front/.../pages/admin/EditorDeGrupo.tsx             (el campo de recargo)
front/.../pages/admin/SaboresDelGrupo.tsx           (nuevo: la lista sale de ahí por R05)
front/.../pages/admin/TarjetaDeGrupo.tsx            (el chip de la tarjeta lo muestra)
front/.../pages/admin/{useOpcionesDelPanel,accionesDeOpciones}.ts
```

## Criterios

| # | Criterio | Cómo se verifica |
|---|---|---|
| C1 | Cada sabor tiene un **recargo** que carga ella; vacío = sin recargo, y los que ya existen arrancan en cero | navegador + `test_option_service` |
| C2 | El recargo es **≥ 0**: un descuento se rechaza con un mensaje en castellano | `test_recargo_del_sabor` |
| C3 | El pedido se cobra **precio del tamaño + los recargos de los sabores elegidos**, leídos de la base | `test_recargo_del_sabor` |
| C4 | El pedido **guarda el recargo que cobró** en cada sabor, como ya guarda el nombre | `test_recargo_del_sabor` |
| C5 | La ficha dice el recargo en el chip del sabor y el total ya lo trae; sin recargo **no** dice "+$0" | Vitest sobre `carrito.ts` + navegador |
| C6 | La tarjeta del grupo muestra cuáles sabores cuestan más, sin abrir el pop-up | navegador |
| C7 | Ningún archivo pasa las 300 líneas (R05) | `wc -l` |
| C8 | Mandar un `price_delta` en el pedido **no cambia lo que se cobra** (V4) | `test_recargo_del_sabor` |

## Lo que NO entra, dicho para no prometerlo

- **El recargo es un monto fijo, no un porcentaje.** "Chocolate +$500" es +$500 tanto en la de 8
  porciones como en la de 20. Un porcentaje escalaría con el tamaño; es otra tarjeta y se dijo antes
  de empezar.
- **El recargo es global, como el grupo** (ADR-031): si "Chocolate" está en "Bizcocho" y ese grupo
  está en tres tortas, el +$500 vale en las tres. Un recargo por torta pide que los grupos dejen de
  ser globales, que es justo el trabajo que el panel le ahorra.
- **La tarjeta de la carta sigue diciendo "desde"** el tamaño más barato, sin sumar recargos: con
  recargos no-negativos (C2) eso sigue siendo verdad, y `precioDesde` no se toca.
- **El carrito viejo no se vacía.** Un renglón guardado antes de esta feature tiene sabores sin
  `price_delta`: se lee como 0 y el back cobra lo que corresponda al confirmar.
