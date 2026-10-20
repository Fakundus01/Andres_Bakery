# T20-F61 · El sabor puede costar más

**Rama:** `dev` · **Feature:** F61 (nueva) · **ADR:** 036 · **Versión:** 0.16.0
**Estado:** implementada, **verde en los cuatro comandos**, **medida en el navegador** (1920px y
390px, con un Chrome de verdad manejado por CDP), con la migración probada en los dos sentidos, y
**revisada** por un reviewer independiente que re-ejecutó: `CHANGES_REQUESTED`, 10 hallazgos,
**los diez corregidos**. Lo único que falta es el OK para commitear (R01).

> Si esta sesión se corta: el último commit es `4146ea3` (T19-F60, 0.15.0) y dejó el árbol limpio.
> Todo lo de esta tarjeta está **sin commitear**. La base de desarrollo **sí se tocó**: corrió la
> migración `0009` (hay respaldo en `instance/bakery.db.respaldo-pre-0009`) y quedaron cargados dos
> recargos de ejemplo —Relleno/Chocolate $800 y Bizcocho/Chocolate $1.500— que la chef va a
> reemplazar por los suyos. El admin temporal de la verificación y el pedido de prueba **se
> borraron**.

---

## Lo que pidió el humano

Textual, por voz: *"el precio por sabor… no es mala idea y listo. Creo que eso le da un poco más de
libertad al chef de decir, ah, bueno, la de chocolate la vamos a hacer un poco más carita"*.

Salió de la tanda anterior: al cargar los gustos quedó a la vista que un sabor era un nombre y nada
más. **ADR-031 había contestado que no** —el precio sale del tamaño—, así que esto no es una feature
nueva sobre un hueco, es una decisión vieja que se revisa, y por eso hay ADR-036 y no solo tarjeta.

## Lo que se decidió antes de escribir código (y el humano aprobó)

Los seis criterios de [`T20-F61`](../../cards/T20-F61-el-sabor-puede-costar-mas.md), más dos que
salieron al implementar (C7 de R05 y C8 de V4). Lo importante de lo que **no** hace, dicho antes:
el recargo es **un monto fijo** (no un porcentaje, así que no escala con el tamaño) y es **global
por sabor** (si el grupo está en tres tortas, el recargo vale en las tres).

## El rojo, medido contra `4146ea3`

Las dos suites, antes de que existiera la columna:

```
backend/.venv/Scripts/python.exe -m unittest backend.tests.test_recargo_del_sabor -v
TypeError: 'price_delta' is an invalid keyword argument for Option
Ran 13 tests in 2.977s
FAILED (errors=13)

npm --prefix front/Andres_Bakery run test
 FAIL  src/lib/carrito.test.ts > precioDelRenglon > el sabor con recargo lo suma al tamaño elegido (ADR-036)
AssertionError: expected 14000 to be 15200
 FAIL  src/lib/carrito.test.ts > recargoDeLasOpciones > sin sabores no hay recargo
TypeError: recargoDeLasOpciones is not a function
 FAIL  src/lib/carrito.test.ts > textoDelRecargo > un sabor sin recargo no dice «+$0» (C5)
TypeError: textoDelRecargo is not a function
 FAIL  src/lib/carrito.test.ts > subtotalDelCarrito > el recargo del sabor entra en el subtotal, por cantidad
AssertionError: expected 28000 to be 30400
 Tests  8 failed | 181 passed (189)
```

**Dos helpers se escribieron junto con sus tests** —`recargoTipeado` y los centavos del chip—, así
que ese rojo no estaba medido. Se rompieron a propósito una vez cada uno (R29):

```
// sin el reemplazo de la coma
× acepta la coma, que es como se escribe acá
AssertionError: expected null to be 500.5

// con los centavos apagados
× con centavos los dice, porque el back los cobra
AssertionError: expected '+$ 1.501' to contain '500,5'
```

## El verde

```
npm --prefix front/Andres_Bakery run test     →  Test Files 17 passed · Tests 207 passed (207)
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
                                              →  Ran 365 tests in 94.250s · OK
npm --prefix front/Andres_Bakery run lint     →  sin salida (eslint + tsc)
npm --prefix front/Andres_Bakery run build    →  index-GMOgpUKx.js 423.58 kB · index-BGqUa8zx.css 36.15 kB
```

Los 207 del front y los 365 del back son **después** de la revisión: 12 tests más en el front y 9
en el back salieron de sus hallazgos. El detalle está en
[`review_T20.md`](review_T20.md) y la tabla de arreglos en [`handback_T20.md`](handback_T20.md).

## La migración `0009`, probada en los dos sentidos

Sobre una **copia** de la base de desarrollo con sus filas:

```
downgrade 0009 -> 0008   → option: [id, option_group_id, name, normalized_name, sort_order]
                           sabores intactos: Dulce de leche, Chocolate, Chocolate, Vainilla, Crema
upgrade   0008 -> 0009   → option: [..., price_delta]   recargos: todos en 0
```

Recién después se corrió sobre `instance/bakery.db`, con respaldo previo.

## El navegador, y lo que encontró

El MCP de Playwright **no conectó** en esta sesión. Los Chromium que dejó instalados están en disco,
así que se manejó uno de verdad hablando CDP por WebSocket crudo
(`scratchpad/cdp.py`, 160 líneas, sin instalar nada).

**Lo que encontró, con las dos suites en verde:** elegidos los dos sabores caros, la ficha mostraba
**$14.200** y el back iba a cobrar **$16.500**. `usePersonalizacion` calculaba el precio con
`precioDelRenglon({ ...product, variante })`: le pasaba el tamaño y **no los sabores**. La función
estaba bien y tenía seis tests; lo que estaba mal era lo que se le daba. Corregido pasando la
personalización entera, que es la forma de que no se pueda volver a olvidar un campo que mueve el
precio.

Medido después del arreglo, a **1920px**:

| Qué | Resultado |
|---|---|
| Chips de la ficha | `Chocolate +$ 800`, `Chocolate +$ 1.500`; Crema, Vainilla y Dulce de leche **sin nada** |
| 8 porciones + los dos caros | **$ 16.500** (14.200 + 800 + 1.500), arriba y en el pie |
| Cambiar a 12 porciones | **$ 22.100** (19.800 + 2.300) |
| Cambiar el relleno caro por Crema | **$ 21.300** |
| Panel · tarjeta del grupo | los chips dicen el recargo sin abrir nada (C6) |
| Panel · pop-up del grupo | campos "Recargo de …" por sabor y "+$" en el alta (C1) |
| Panel · guardar | aviso **«Dulce de leche» guardado con +$ 300**, y la tarjeta se actualiza |
| Desborde horizontal | **0** |

A **390px**: **ningún pop-up** (el editor se abre dentro de la tarjeta, ADR-034), los mismos campos,
los mismos totales (22.100 / 21.300) y desborde **0**.

Y por API, que es donde se decide la plata: dos de 12 porciones con los dos sabores caros se
cobraron **$44.201** —(19.800 + 800 + 1.500,50) × 2— con el recargo del bizcocho en 1.500,50 para
probar los centavos; el `price_delta: -19000` que mandé en el renglón **se ignoró**; un descuento
dio 400 en castellano; y el mensaje de WhatsApp dice `Relleno: Chocolate (+$800) · Bizcocho:
Chocolate (+$1.500,50)`.

## La revisión (R30), en una línea cada uno

`CHANGES_REQUESTED`, 10 hallazgos, los diez corregidos. El ALTA: **el sabor no tenía testigo**, y
borrando uno para que SQLite reusara su id, una torta de $14.200 se cobró **$23.200**. Los cuatro
MEDIA: el *"desde $X"* podía quedar por debajo del mínimo comprable **y el ADR afirmaba lo
contrario**; escribir «1.500» guardaba $1,50; agregar un sabor que ya existía descartaba el recargo
mientras avisaba que lo había guardado; y el recargo cobrado no se veía en ninguna pantalla que lea
un pedido guardado. Las cinco BAJA están en la tabla del handback.

## Lo que falta para el `done`

**El OK y el commit** (R01).
