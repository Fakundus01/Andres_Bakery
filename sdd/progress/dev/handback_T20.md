# HANDBACK · T20-F61 · El sabor puede costar más

**Rama:** `dev` · **Versión:** 0.16.0 · **ADR:** 036 (nuevo, revisa en parte a ADR-031) ·
**Fecha:** 2026-10-19
**Estado:** implementado, **cuatro comandos en verde**, **medido en el navegador** a 1920px y 390px,
migración probada en los dos sentidos sobre una copia con datos, **revisado** por un reviewer
independiente que re-ejecutó (`CHANGES_REQUESTED`, 10 hallazgos) y **con los diez corregidos**.
**Sin commitear** (R01): falta el OK.

## Hecho

Lo que se pidió: *"eso le da un poco más de libertad al chef de decir, ah, bueno, la de chocolate la
vamos a hacer un poco más carita"*. Hasta hoy no se podía: `Option` era id + nombre + orden, y
**ADR-031 lo había contestado explícitamente** —"los sabores no mueven el precio"—. Esta tanda
revisa esa respuesta y **nada más que esa**.

| Dónde | Antes | Ahora |
|---|---|---|
| Panel · sabor | nombre y nada más | nombre **+ recargo**, los dos en el mismo renglón y un solo PUT |
| Panel · tarjeta del grupo | los chips decían el nombre | dicen `Chocolate +$ 800` sin abrir nada |
| Ficha · chip del sabor | el nombre | el nombre y el recargo, si tiene |
| Ficha · precio | el del tamaño | el del tamaño **más** los recargos elegidos |
| Pedido | `unit_price` = tamaño | `unit_price` = tamaño + recargos, calculado **en el back** |
| Pedido · sabor elegido | nombre del grupo y del sabor | **y el recargo que se cobró** |
| WhatsApp | `Relleno: Chocolate` | `Relleno: Chocolate (+$800)` |

**Archivos nuevos (3):** `backend/tests/test_recargo_del_sabor.py`,
`backend/migrations/versions/0009_recargo_del_sabor.py`,
`front/.../pages/admin/SaboresDelGrupo.tsx` (la lista de sabores salió de `EditorDeGrupo`, que con
un campo más por renglón se iba de las 300 líneas, R05).

## Tests · comando + salida literal

El rojo **se midió** contra `4146ea3`, las dos suites:

```
backend/.venv/Scripts/python.exe -m unittest backend.tests.test_recargo_del_sabor -v
TypeError: 'price_delta' is an invalid keyword argument for Option
Ran 13 tests in 2.977s
FAILED (errors=13)

npm --prefix front/Andres_Bakery run test
 FAIL  src/lib/carrito.test.ts > precioDelRenglon > el sabor con recargo lo suma al tamaño elegido (ADR-036)
AssertionError: expected 14000 to be 15200
 FAIL  src/lib/carrito.test.ts > precioDelRenglon > dos sabores con recargo suman los dos
AssertionError: expected 6000 to be 8000
 FAIL  src/lib/carrito.test.ts > recargoDeLasOpciones > sin sabores no hay recargo
TypeError: recargoDeLasOpciones is not a function
 FAIL  src/lib/carrito.test.ts > textoDelRecargo > un sabor sin recargo no dice «+$0» (C5)
TypeError: textoDelRecargo is not a function
 FAIL  src/lib/carrito.test.ts > subtotalDelCarrito > el recargo del sabor entra en el subtotal, por cantidad
AssertionError: expected 28000 to be 30400
 Tests  8 failed | 181 passed (189)
```

**Dos helpers se escribieron junto con sus tests**, así que ese rojo no estaba medido y se midió
rompiéndolos a propósito una vez cada uno (R29):

```
// recargoTipeado, sin el reemplazo de la coma
× acepta la coma, que es como se escribe acá
AssertionError: expected null to be 500.5

// textoDelRecargo, con los centavos apagados
× con centavos los dice, porque el back los cobra
AssertionError: expected '+$ 1.501' to contain '500,5'
```

En verde, los cuatro comandos de `harness.config.json`:

```
npm --prefix front/Andres_Bakery run test
 Test Files  17 passed (17)
      Tests  207 passed (207)

backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
Ran 365 tests in 94.250s
OK

npm --prefix front/Andres_Bakery run lint
> andres-bakery@0.0.0 lint
> npm run lint:eslint && npm run typecheck

> andres-bakery@0.0.0 lint:eslint
> eslint .

> andres-bakery@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json

npm --prefix front/Andres_Bakery run build
dist/assets/index-BGqUa8zx.css   36.15 kB │ gzip:   7.33 kB
dist/assets/index-GMOgpUKx.js   423.58 kB │ gzip: 127.12 kB
✓ built in 8.10s
```

**R05:** ningún archivo pasa las 300 líneas, y para eso hubo que partir tres (ver abajo). Los más
gordos de la tanda quedaron en `option_service.py` 289, `carrito.test.ts` 282,
`SaboresDelGrupo.tsx` 262 y `renglon_del_pedido.py` 226.

## La migración

`0009`, con `batch_alter_table` porque SQLite recrea la tabla. Probada **para abajo y para arriba
sobre una copia** de la base de desarrollo con sus filas:

```
downgrade 0009 -> 0008   → option: [id, option_group_id, name, normalized_name, sort_order]
                           sabores intactos: Dulce de leche, Chocolate, Chocolate, Vainilla, Crema
upgrade   0008 -> 0009   → option: [..., price_delta]   recargos: todos en 0
```

Recién después se corrió sobre `instance/bakery.db`, con respaldo previo en
`instance/bakery.db.respaldo-pre-0009`.

## El navegador, y lo que encontró

El MCP de Playwright **no conectó** en esta sesión (tampoco `github` ni `codegraph`). Los Chromium
que ese MCP dejó instalados están en disco, así que se manejó un Chrome de verdad **hablando CDP por
WebSocket crudo** (`scratchpad/cdp.py`, sin instalar nada): navegar, clickear, leer la pantalla,
medir el desborde y sacar la foto.

**Y encontró el defecto más importante de la tanda, con las dos suites en verde:** elegidos los dos
sabores con recargo, la ficha mostraba **$14.200** donde el back iba a cobrar **$16.500**.
`usePersonalizacion` calculaba el precio con `precioDelRenglon({ ...product, variante })`: le pasaba
el tamaño y **no los sabores**. La función estaba bien y tenía seis tests propios; lo que estaba mal
era lo que se le daba. Se corrigió pasando `{ ...product, ...personalizacion }`, que es la forma de
que no se pueda volver a olvidar un campo que mueve el precio.

Medido **después** del arreglo:

| Qué | 1920px | 390px |
|---|---|---|
| Chips con recargo | `Chocolate +$ 800`, `Chocolate +$ 1.500` | igual |
| Sabores sin recargo | no dicen nada | igual |
| 8 porciones + los dos caros | **$ 16.500** | — |
| 12 porciones + los dos caros | **$ 22.100** | **$ 22.100** |
| Cambiar el relleno caro por Crema | **$ 21.300** | **$ 21.300** |
| Pop-up del grupo | sí, con "Recargo de …" por sabor | **no hay pop-up** (editor en la tarjeta) |
| Guardar un recargo | aviso «Dulce de leche» guardado con +$ 300 | igual |
| Desborde horizontal | **0** | **0** |

Y por API, que es donde se decide la plata: dos de 12 porciones con los dos sabores caros se
cobraron **$44.201** —(19.800 + 800 + 1.500,50) × 2—; el `price_delta: -19000` mandado en el renglón
**se ignoró**; un descuento dio 400 en castellano; el mensaje de WhatsApp explica el total.

## MDs

`cards/T20-F61-el-sabor-puede-costar-mas.md` (nueva), `decisions.md` (ADR-036 + la fila de ADR-031
anotada), `changelog.md` (0.16.0), `status.md` (0.16.0, tres filas nuevas), `features.md` (B5 + F61,
y **la fila de F60 corregida**: decía "falta el reviewer" y el reviewer ya había corrido),
`testing.md` (la lección de que una función correcta no garantiza quién la llama), `current.md`.

## Git

**Sin commitear** (R01). El commit base es `4146ea3`.

## Lo que quedó en la base de desarrollo

Corrió la migración `0009` (con respaldo). Quedaron **dos recargos de ejemplo** —Relleno/Chocolate
$800 y Bizcocho/Chocolate $1.500— para que se vea funcionando; los reales los pone la chef. El admin
temporal de la verificación y el pedido de prueba **se borraron**, y se verificó que no quedaran
renglones ni sabores huérfanos.

## Lo que corrigió la revisión (R30)

El reviewer re-ejecutó los cuatro comandos, **re-midió el rojo en un worktree sobre `4146ea3`** —y
encontró 14 fallas donde este handback declaraba 8, porque contó también los dos helpers medidos con
mutantes— y probó la migración en los dos sentidos sobre dos copias. Veredicto
`CHANGES_REQUESTED`: **1 ALTA, 4 MEDIA, 5 BAJA**, y están **las diez corregidas**.

| # | Hallazgo | Arreglo |
|---|---|---|
| 1 ALTA | **El sabor no tenía testigo**: borró un sabor, SQLite le dio el id a otro de +$9.000, y la torta de $14.200 se cobró **$23.200 sin un 400**. Es el agujero que ADR-029 ya había cerrado para el tamaño | el carrito manda `options_seen` (nombre y recargo como los mostró) y el servidor corta con *"abrí el producto y elegilo de nuevo"*. El precio **sigue saliendo de la base**: el testigo se compara, no se cobra |
| 2 MEDIA | El *"desde $X"* de la carta queda **por debajo del mínimo comprable** si un grupo obligatorio no tiene ningún sabor sin recargo — **y ADR-036 afirmaba lo contrario** | `precioDesde` suma el recargo más barato de cada grupo obligatorio, y el ADR quedó corregido en vez de tapado |
| 3 MEDIA | Escribir **«1.500»** —como se escriben los miles acá— guardaba **$1,50**, y el aviso decía "+$ 2" | se interpreta el punto de miles, y el campo **avisa lo que se va a cobrar mientras tipea**, como el precio del tamaño |
| 4 MEDIA | Agregar un sabor **que ya existe** descartaba el recargo, y el panel igual avisaba *"agregado con +$7.777"* | el alta se lo aplica: afirmar un precio que no se guardó es lo peor que puede hacer esa pantalla |
| 5 MEDIA | El recargo que el pedido guarda (C4) **no se veía en ninguna pantalla**: solo en el WhatsApp, que no se guarda | el renglón lo dice en el panel de pedidos y en el pedido del cliente, con un solo helper (`textoDeLaElegida`) |
| 6 BAJA | Un recargo de `0.001` entraba y se guardaba **cero**, en silencio | se rechaza, igual que ya hacía el precio del tamaño con `0.004` |
| 7 BAJA | El guard de `Number.isFinite` **no tenía test**: el reviewer lo mató con un mutante y la suite quedó verde | test con `Infinity`, medido contra el mismo mutante |
| 8 BAJA | El mensaje del tope decía **"100.000.000"**, que no es el tope (es 99.999.999,99) | se escribe el tope real, con los miles en punto y los decimales en coma |
| 9 BAJA | El `downgrade` de `0009` **borra los recargos** y nada lo advertía | lo dice su docstring, con la consulta para anotarlos antes |
| 10 BAJA | Dos recargos en el tope daban un `unit_price` de **nueve dígitos en una columna de ocho** | el renglón se compara contra `MAX_IMPORTE` y corta con un mensaje en castellano |

**Y lo que verificó y estaba bien**, que es lo que le da peso al resto: siete inyecciones distintas
para cobrar de menos (`price_delta`, `unit_price`, `price`, `total`, `options` armadas a mano) y el
total no se movió; doce formas raras de mandar ids, todas con 400 explicado en castellano; las
cuatro pantallas de plata diciendo lo mismo que el back; nadie dice "+$0"; desborde 0 a 1920 y 390;
y el refactor de `EditorDeGrupo` → `SaboresDelGrupo` **no se llevó ningún texto ni handler** (lo
comparó literal contra `4146ea3`).

**R05, otra vez:** los arreglos empujaron tres archivos arriba de 300 líneas y hubo que partirlos.
`renglon_del_pedido.py` (350) dejó los sabores en **`sabores_del_renglon.py`**; `carrito.ts` dejó
todo lo del recargo en **`lib/recargos.ts`** con su propio test; y `test_recargo_del_sabor.py` (322)
dejó el testigo y los topes en **`test_testigo_del_sabor.py`**, los dos sobre una base común para no
re-correr los mismos tests dos veces.

## Riesgos y lo que no se hizo

1. **El recargo es un monto fijo y global**, dicho antes de empezar y escrito en la tarjeta y en el
   ADR: "Chocolate +$500" es +$500 en la de 8 y en la de 20 porciones, y vale en todas las tortas
   que lleven ese grupo. Si la chef necesita que escale con el tamaño, es otra tarjeta.
2. **Un recargo que no es número da un error en inglés** ("recargo must be a valid number"), porque
   sale de `parse_decimal`, que es el mismo que ya responde así para el precio de una variante. El
   panel casi nunca lo deja llegar —valida local y avisa en castellano—, pero si llega, llega en
   inglés. Es una inconsistencia vieja del proyecto, no nueva de esta tanda; lo que sí se arregló
   acá es el mensaje del tope, que decía un número que no era el tope.
3. **Borrar un pedido no está soportado por el modelo**: `Order.items` no tiene cascade, así que
   borrar un pedido deja renglones huérfanos y SQLite lo frena. Apareció limpiando el pedido de
   prueba. Hoy no molesta porque el panel no ofrece borrar pedidos.
4. **No hay test de componente** (ADR-023, deuda D7), así que el defecto que encontró el navegador
   **no tiene test de regresión**: lo que lo protege es que ahora se pasa la personalización entera
   en vez de campo por campo.

## Próximo paso propuesto

1. **El OK y el commit** (R01). Lo demás que pedía R30 está hecho: navegador, reviewer independiente
   que re-ejecutó y re-midió el rojo, y sus diez hallazgos corregidos con sus tests.
3. Después, lo que el humano ya pidió para la tanda siguiente: **ofertas** (una etiqueta "oferta",
   poder etiquetar varios productos de una, tope de **tres etiquetas visibles** por producto y la
   de oferta siempre visible, con la idea de dar vuelta la tarjeta para ver el resto).
