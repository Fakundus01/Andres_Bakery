# T21-F62 · El descuento vive en la etiqueta

**Feature:** F62 (nueva) · **Rama:** `dev` · **Tier (R12):** ALTO (toca el cobro)
**Depende de:** ADR-006 (las etiquetas las crea ella), ADR-029 y ADR-036 (el servidor cobra lo que
dice la base, no lo que manda el cliente).
**Superficie (R27):** **N2 · toca plata.** Reclasifica: campo nuevo que **baja** un precio, que es
la primera vez en el proyecto. Reviewer funcional **y** security-reviewer + pentester (R31).

> **Propuesta, sin implementar.** Falta el OK.

## Por qué

Lo pidió el humano: *"solo que este de ofertas tenga un plus de descuento"*. Hasta hoy una etiqueta
era nombre + color + orden: decía algo del producto pero no hacía nada.

**Esto revisa la decisión de hace un rato en esta misma sesión**, y queda escrito para que no
parezca un olvido: cuando se preguntó si la oferta movía el precio, la respuesta fue "solo
etiqueta". Al pedir el descuento, la respuesta cambió. Lo que vale es la segunda.

## La forma, decidida antes de escribir código

Tres preguntas, tres respuestas del humano:

1. **Porcentaje, no monto fijo.** Un número sirve para la torta de 8 y la de 20 porciones, y
   acotado 0–100 **no hay forma de armar un total negativo** — que es exactamente el agujero que la
   revisión de `T4-F19b` encontró una vez con los tamaños.
2. **Cualquier etiqueta puede tener descuento, y tener descuento es estar en oferta.** No hay
   etiqueta privilegiada ni constante en el código: "Oferta 20%" y "Liquidación 40%" conviven, y si
   ella la renombra no se rompe nada. Es lo que ADR-006 pide y lo que deja la pregunta del slug fijo
   sin tener que contestarse.
3. **Si un producto tiene dos etiquetas con descuento, paga el mayor, nunca la suma.** La suma puede
   llegar a 100% y regalar la torta por un descuido de etiquetado; el máximo nunca se pasa de lo que
   ella cargó en una etiqueta.

## Criterios

- **C1 · `Tag.discount_percent`**, `Numeric(5, 2)`, default 0. Vacío y 0 son lo mismo: sin
  descuento, que es el caso normal. **Se edita en el mismo renglón donde ella la renombra**, un solo
  PUT, igual que el recargo del sabor en T20.
- **C2 · El back valida el rango y lo dice en castellano:** negativo **no** (un descuento negativo es
  un recargo disfrazado), mayor a 100 **no**, texto que no es número **no**. Y acepta la coma, que es
  como se escribe acá — el helper `recargoTipeado` de T20 ya resuelve eso y se reusa.
- **C3 · Lo cobra el servidor.** En `renglon_del_pedido.py`:
  `unit_price = (precio_del_tamaño + recargos de los sabores) × (1 − descuento/100)`, redondeado a
  dos decimales. **El descuento aplica sobre el total de la unidad**, recargos incluidos: si el
  chocolate suma $800 y la etiqueta descuenta 20%, el 20% también le pega a los $800. Un `discount`
  que venga en el request **se ignora**, igual que el precio y el `price_delta` (V4). Es la cuarta
  vez que el proyecto escribe esta regla.
- **C4 · El pedido guarda lo que descontó** (`order_item.discount_percent`), al lado del
  `unit_price`, por la misma razón que T20 guardó el recargo: si en marzo la oferta pasa de 20% a
  30%, el pedido de enero tiene que seguir diciendo lo que se vendió en enero. Sin esto, el pedido
  viejo no se puede explicar.
- **C5 · El envío no se descuenta.** El descuento es del producto; `DELIVERY_FEE` no se toca. Dicho
  explícito porque es la clase de cosa que se asume distinto de los dos lados.
- **C6 · La carta y la ficha muestran el precio viejo tachado y el nuevo**, y el porcentaje. Un
  producto sin descuento **no** dice "−0%" en ninguna pantalla (es la regla que T20 ya fijó para el
  "+$0").
- **C7 · El "desde $X" dice el precio con descuento**, y sigue siendo comprable. La revisión de T20
  encontró que el "desde" podía quedar por debajo del mínimo que alguien puede comprar; el descuento
  mueve justo ese número, así que **se prueba el caso**: producto con tamaños y una etiqueta con
  descuento, y el "desde" tiene que ser igual al más barato de los tamaños ya descontado.
- **C8 · Las funciones puras, con tests** (ADR-023): `descuentoDeLasEtiquetas(tags)` devuelve el
  mayor, y `precioConDescuento(precio, descuento)`. Se prueban con cero etiquetas, una sin
  descuento, dos con descuento (gana el mayor), 100% (da 0, no negativo) y con decimales.
- **C9 · Migración `0010`**, probada **en los dos sentidos** sobre una copia de la base de
  desarrollo con datos antes de tocar la real, como las nueve anteriores.
- **C10 · R05.** `renglon_del_pedido.py` está en **226 líneas** y es el archivo que decide plata: si
  el descuento lo pasa de 300, sale a `descuento_de_la_etiqueta.py`, como los sabores salieron a
  `sabores_del_renglon.py`. `carrito.ts` (227) manda su parte a `lib/descuentos.ts`.

## Lo que esta tarjeta NO hace

- **No filtra ni ordena la carta**, ni crea la vista de ofertas: eso es `T22-F63`.
- **No etiqueta varios productos de una**: también `T22-F63`.
- **No toca los avisos** de pantalla: `T23-F64`.
- **No hace ofertas con fecha de vencimiento.** Una oferta se prende y se apaga a mano, poniéndole o
  quitándole la etiqueta. Si alguna vez se quiere "del 1 al 15 de marzo", es otra tarjeta y necesita
  decidir qué pasa con un pedido hecho un minuto antes de que venza.

## Zona de archivos

```
backend/models/catalogo.py                            (Tag.discount_percent)
backend/models/pedidos.py                             (OrderItem.discount_percent)
backend/migrations/versions/0010_descuento_de_la_etiqueta.py  (nuevo)
backend/services/tag_service.py                        (120 -> valida el rango)
backend/services/renglon_del_pedido.py                 (226 -> el cobro)
backend/services/descuento_de_la_etiqueta.py           (nuevo, si C10 lo pide)
backend/services/serializers.py                        (el porcentaje sale en la API)
backend/services/mensaje_whatsapp.py                   (el descuento en el mensaje)
backend/tests/test_descuento_de_la_etiqueta.py         (nuevo)
front/Andres_Bakery/src/lib/descuentos.ts              (nuevo, puro)
front/Andres_Bakery/src/lib/descuentos.test.ts         (nuevo)
front/Andres_Bakery/src/lib/carrito.ts                 (227 -> precioDesde con descuento)
front/Andres_Bakery/src/pages/admin/FormularioDeEtiqueta.tsx  (el campo nuevo)
front/Andres_Bakery/src/components/ProductCard.tsx     (el tachado)
front/Andres_Bakery/src/pages/ProductPage.tsx          (274 -> el tachado)
```

## Cómo se verifica (R30)

1. **El rojo medido** contra el commit base, con su hash, antes de escribir el código.
2. Las dos suites en verde, lint y build.
3. **Migración `0010` en los dos sentidos** sobre una copia con datos.
4. **Navegador a 1920px y 390px**: un producto con tamaños y una etiqueta de 20%, el tachado en la
   carta y en la ficha, y el total del pedido medido **por API** — que es donde se decide la plata.
5. **Los intentos de pagar de menos, medidos** (es lo que V4 existe para frenar): `discount_percent`
   en el renglón del pedido, 101%, −10%, `"20"` como string, dos etiquetas con descuento, y 100% con
   un recargo de sabor arriba. Ninguno puede mover el total ni dejarlo bajo cero.
6. Reviewer funcional **y** security-reviewer + pentester, los dos re-ejecutando (R31, porque N2).
