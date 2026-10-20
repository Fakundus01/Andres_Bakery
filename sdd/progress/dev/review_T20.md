# REVIEW · T20-F61 · El sabor puede costar más

**Reviewer independiente (R30/R31).** No implementé nada de esta tanda. Todo lo de abajo lo
re-ejecuté yo: los cuatro comandos, el rojo contra la base, la migración en los dos sentidos sobre
copias, el endpoint público a mano y el navegador a 1920 px y 390 px.

**Hash contra el que corrí todo:** árbol de trabajo sucio sobre `4146ea3`
(T19-F60, 0.15.0), exactamente el `git status` que figura en `current.md` (27 modificados + 4 sin
seguimiento). Verifiqué al terminar que el árbol quedó igual que al empezar.

## Veredicto

**CHANGES_REQUESTED** · 10 hallazgos: **1 ALTA · 4 MEDIA · 5 BAJA**

La feature hace lo que dice en lo que más importa: **el precio sale de la base y no del request**
(C3 y C8 los probé con seis formas distintas de inyectar plata y ninguna entró), la migración es
reversible, y el bug que encontró el navegador en la ficha está realmente arreglado en las cuatro
pantallas que muestran plata. Lo que pido cambiar no es el cálculo: es que **el id del sabor decide
plata y nadie verifica que siga siendo el sabor que el cliente vio** —el mismo agujero que ADR-029
cerró para el tamaño con un testigo, reabierto por el costado del sabor—, más tres cosas de carga y
de texto que hacen que el panel confirme números que no guardó.

---

## 1 · Los cuatro comandos (R30), re-ejecutados

### `test` (back · unittest, desde la raíz)

```
$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
----------------------------------------------------------------------
Ran 356 tests in 103.439s

OK
```

### `test_front`

```
$ npm --prefix front/Andres_Bakery run test
 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery

 Test Files  16 passed (16)
      Tests  195 passed (195)
   Start at  20:49:19
   Duration  757ms (import 40%, transform 27%, tests 18%, worker 13%, environment 1%)
```

### `lint`

```
$ npm --prefix front/Andres_Bakery run lint
> npm run lint:eslint && npm run typecheck
> eslint .
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
(sin salida)
```

### `build`

```
$ npm --prefix front/Andres_Bakery run build
> tsc -b && vite build
vite v7.3.7 building client environment for production...
✓ 1864 modules transformed.
dist/index.html                   1.19 kB │ gzip:   0.61 kB
dist/assets/index-BGqUa8zx.css   36.15 kB │ gzip:   7.33 kB
dist/assets/index-DqZIiU_P.js   422.84 kB │ gzip: 126.85 kB
✓ built in 13.69s
```

Los cuatro coinciden con lo que declara `current.md`, número por número.

---

## 2 · El rojo, re-medido por mí (R29)

No me alcanzó con leerlo. Monté un **worktree en `4146ea3`** (sin tocar el árbol de trabajo) y corrí
ahí los tests nuevos contra el código viejo.

**Back**, con `fabricas.py` nueva y el modelo viejo, que es como lo midió el implementador:

```
$ cd <worktree @4146ea3>
$ backend/.venv/Scripts/python.exe -m unittest backend.tests.test_recargo_del_sabor
TypeError: 'price_delta' is an invalid keyword argument for Option
----------------------------------------------------------------------
Ran 13 tests in 5.446s

FAILED (errors=13)
```

Idéntico a lo declarado. Y con las fábricas **viejas** también son 13 errores, por otro camino
(`ValidationError: El campo «nombre» tiene que venir como texto`, porque la tupla `(nombre, recargo)`
entra como nombre). El rojo existe por los dos lados.

**Front**, con `carrito.test.ts` nuevo sobre `carrito.ts` y `format.ts` viejos:

```
$ npm run test -- src/lib/carrito.test.ts        # en el worktree @4146ea3
 FAIL  precioDelRenglon > el sabor con recargo lo suma al tamaño elegido (ADR-036)
AssertionError: expected 14000 to be 15200
 FAIL  precioDelRenglon > dos sabores con recargo suman los dos
AssertionError: expected 6000 to be 8000
 FAIL  recargoDeLasOpciones > sin sabores no hay recargo
TypeError: recargoDeLasOpciones is not a function
 FAIL  recargoDeLasOpciones > suma solo lo que tiene recargo
 FAIL  textoDelRecargo > un sabor sin recargo no dice «+$0» (C5)
 FAIL  textoDelRecargo > un sabor con recargo lo dice con el signo
 FAIL  textoDelRecargo > con centavos los dice, porque el back los cobra
 FAIL  textoDelRecargo > un recargo roto no escribe «+$NaN»
 FAIL  subtotalDelCarrito > el recargo del sabor entra en el subtotal, por cantidad
AssertionError: expected 28000 to be 30400
 FAIL  recargoTipeado > vacío es sin recargo, no un error
 FAIL  recargoTipeado > acepta la coma, que es como se escribe acá
 FAIL  recargoTipeado > recorta a dos decimales, que es lo que guarda la base
 FAIL  recargoTipeado > un descuento no pasa (ADR-036)
 FAIL  recargoTipeado > lo que no es un número no pasa
      Tests  14 failed | 15 passed (29)
```

**14 en rojo**, que son los 8 declarados más los 6 de los dos helpers que el implementador dice
haber medido rompiéndolos a mano. El rojo de esta tanda está medido de verdad; esta medición es más
fuerte que la declarada porque cubre los 14 contra la base y no 8 contra la base y 2 contra mutantes.

Con el código nuevo copiado al mismo worktree: `Tests 29 passed (29)`.

---

## 3 · La migración `0009`, probada por mí en los dos sentidos

Sobre **dos copias**, nunca sobre `instance/bakery.db`.

```
$ cp instance/bakery.db <scratch>/mig_t20.db ; export DATABASE_URL=sqlite:///<scratch>/mig_t20.db
$ flask --app backend.app db current                           →  0009 (head)
option cols: ['id','option_group_id','name','normalized_name','sort_order','price_delta']
oio cols:    ['id','order_item_id','group_name','option_name','price_delta']

$ flask --app backend.app db downgrade 0008
INFO  Running downgrade 0009 -> 0008
option cols: ['id','option_group_id','name','normalized_name','sort_order']
oio cols:    ['id','order_item_id','group_name','option_name']
opciones:    [(1,'Dulce de leche'),(2,'Chocolate'),(3,'Chocolate'),(4,'Vainilla'),(5,'Crema')]
indices:     sqlite_autoindex_option_1 · ix_option_option_group_id       (los dos sobrevivieron)

$ flask --app backend.app db upgrade
INFO  Running upgrade 0008 -> 0009
CREATE TABLE "option" (... sort_order INTEGER DEFAULT '0' NOT NULL,
  price_delta NUMERIC(10, 2) DEFAULT '0' NOT NULL, PRIMARY KEY (id),
  CONSTRAINT uq_option_grupo_normalizado UNIQUE (option_group_id, normalized_name),
  FOREIGN KEY(option_group_id) REFERENCES option_group (id))
```

Y sobre el respaldo `instance/bakery.db.respaldo-pre-0009` (está en `0008` con filas):
`upgrade 0008 -> 0009` entra, `price_delta is null → 0 filas`. El `batch_alter_table` rehace las dos
tablas sin perder filas, índices, `UNIQUE` ni FKs. **Nada de esto tocó la base de desarrollo.**

---

## 4 · Lo que probé a mano contra el endpoint público

El rate limit de la ruta pública me cortó a los 3 pedidos (`429`, bien), así que el resto lo corrí
**in-process con el test client sobre una copia de la base**, que es el mismo código de la ruta sin
el limitador. Los 3 pedidos que sí entraron en la base real los borré (ver §7).

### V4 · lo que mandé para que me cobren de menos, y no entró

Base: `Cheesecake` 8 porciones $14.200 + Relleno/Chocolate +$800 + Bizcocho/Chocolate +$1.500 =
**$16.500**.

| Lo que mandé en el renglón | Total cobrado |
|---|---|
| nada (control) | 16.500,00 |
| `price_delta: "-14000"` | **16.500,00** |
| `price_delta: -99999` | **16.500,00** |
| `unit_price: "1"` | **16.500,00** |
| `price: "1"` | **16.500,00** |
| `total: 1` | **16.500,00** |
| `options: [{group_name, option_name, price_delta: "-9000"}]` | **16.500,00** |

**C8 pasa.** El recargo sale de `Option.price_delta` leído de la base y nada del request lo mueve.

### Los ids del sabor

| Lo que mandé | Respuesta |
|---|---|
| `option_ids: [999]` (no existe) | 400 `Una de las opciones elegidas no es de «Cheesecake de Frutos Rojos».` |
| dos del mismo grupo | 400 `Elegí una sola opción de «Relleno».` |
| falta el obligatorio | 400 `Falta elegir: Bizcocho.` |
| `[]` | 400 `Falta elegir: Relleno, Bizcocho.` |
| `[0]`, `[-1]`, `[10**12]` | 400 `«option_id» tiene que estar entre 1 y 2147483647.` |
| `["2","4"]` | 201, 15.000 (string numérico se acepta, igual que el resto del proyecto) |
| `[2.0, 4.0]`, `[True, 4]`, `[[2], 4]`, `[None, 4]` | 400 `«option_id» tiene que ser un numero entero.` |
| `"24"` (no lista) | 400 `Las opciones elegidas tienen que venir como lista.` |
| 21 ids | 400 `Hay demasiadas opciones elegidas en un producto.` |
| `[2,4,2,4]` | 400 `Elegí una sola opción de «Relleno».` |
| sabores sobre Cookies (sin la etiqueta) | 400 `«Cookies New York» no se pide personalizado…` |
| `quantity` 0 y 1001 | 400 `«cantidad» tiene que estar entre 1 y 1000.` |
| sabor **borrado** entre elegirlo y pedirlo | 400 `Una de las opciones elegidas no es de «…».` |

Todo lo que esperaba, salvo el caso del hallazgo 1.

---

## 5 · Hallazgos

### 1 · ALTA · El recargo no tiene testigo: el id del sabor decide plata y nadie verifica que sea el que el cliente vio

**Dónde:** `backend/services/renglon_del_pedido.py:197-230` (`_opciones`), contra
`backend/services/renglon_del_pedido.py:178-192` (`_exigir_que_sea_el_que_vio`, el testigo que el
tamaño **sí** tiene) y `front/Andres_Bakery/src/pages/checkout/pedidoDelFormulario.ts:104-107`
(manda `variant_name` como testigo del tamaño y **solo `option_ids`** del sabor).

**Cómo lo reproduje** (medido, in-process, copia de la base):

```
opcion nueva id: 6  "Frutilla QA"  recargo 0.00
[con la nueva (6)]            201 total=14200.0      ← lo que el cliente ve y mete al carrito
(se borra la 6 y se crea "Oro comestible" +9000 → SQLite le da el MISMO rowid)
id de la nueva opcion carisima: 6 (antes era 6)
[id 6 reusado -> se cobra]    201 total=23200.0      ← lo que se cobra, sin un 400
```

El pedido queda con `Relleno: Oro comestible (+$9.000)` y $23.200 donde la pantalla decía $14.200.
Es **literalmente el hallazgo del pentester de T18** —"SQLite reusa los rowid cuando una fila se
borra"—, que está citado en el docstring de `_exigir_que_sea_el_que_vio` como la razón de existir
del testigo del tamaño. F61 agranda la superficie de "el id decide el precio" sin agrandar la
protección.

**La variante sin trucos, más probable todavía:** Andrea sube el chocolate de $800 a $1.500 mientras
alguien tiene la torta en el carrito. El carrito guarda el `OptionChoice` entero —con su
`price_delta`— en `localStorage` y **no lo refresca nunca**
(`front/Andres_Bakery/src/contexts/CartContext.tsx:23,73-99`), así que el carrito, el cajón y el
resumen del checkout siguen diciendo el número viejo y el servidor cobra el nuevo. Es la misma
sorpresa que el implementador arregló en la ficha en esta tanda ($14.200 vs $16.500), corrida un
paso más adelante.

**Por qué importa:** para el tamaño el proyecto ya decidió que esto no se tapa con un cartel: el
testigo devuelve 400 con *"Abrí el producto y elegilo de nuevo, así no te cobramos otra cosa"*. Acá
no hay 400 ni mensaje. Ni la tarjeta ni ADR-036 dicen una palabra del tema; la tarjeta solo menciona
el carrito pre-F61 ("se lee como 0 y el back cobra lo que corresponda"), que es el caso benigno de
este mismo agujero.

**Lo que lo atenúa, dicho para que lo puedan ponderar:** el checkout avisa *"El total lo vuelve a
calcular el servidor cuando confirmás"* y el mensaje de WhatsApp —que lo arma el servidor y lo manda
el cliente— dice el total real y nombra el sabor con su recargo, así que quien compra puede notarlo
en el último paso. No hay forma de cobrar **de menos**, y nunca se cobra nada que no esté en la base.
Aun así, el sabor cobrado puede no ser el elegido, y eso es un pedido que Andrea no puede cumplir.

**Qué pediría:** el mismo testigo que el tamaño. El carrito ya tiene el nombre del sabor; mandar
`option_names` (o `(id, name)`) y comparar como `_exigir_que_sea_el_que_vio` cierra el caso del rowid
reusado. Para el recargo cambiado, comparar también el `price_delta` visto y devolver el 400 que
pide volver a elegir.

---

### 2 · MEDIA · El "desde $X" de la carta queda por debajo del mínimo comprable, y los MDs afirman lo contrario

**Dónde:** `front/Andres_Bakery/src/lib/carrito.ts:176-182` (`precioDesde` mira solo las variantes),
contra `sdd/decisions.md` ADR-036 parte 2 y `sdd/changelog.md` [0.16.0], que dicen: *"con recargos
no-negativos (C2) eso sigue siendo verdad"* y *"el más barato posible sigue siendo el tamaño más
barato sin sabores caros"*.

**Por qué no es verdad:** la afirmación vale solo si **cada grupo obligatorio tiene al menos un
sabor con recargo 0**. Nada lo garantiza: el grupo es obligatorio (`_exigir_los_obligatorios`,
`renglon_del_pedido.py:233-244`) y el recargo es libre por sabor. Hoy mismo «Bizcocho» es
obligatorio con dos sabores; si ella le pone recargo a los dos —Chocolate +$1.500 y Vainilla
+$300—, el mínimo comprable pasa a $14.500 y la tarjeta sigue diciendo **"desde $14.200"**. Un
grupo obligatorio de un solo sabor con recargo tiene el mismo efecto.

**Cómo reproducirlo:** panel → Gustos → Bizcocho → ponerle recargo a Vainilla; mirar la tarjeta de
«Cheesecake» en la carta (dice "desde $14.200") y abrir la ficha (el mínimo es $14.200 + el recargo
más barato de cada grupo obligatorio).

**Por qué importa:** es el problema que el review de T18 ya había hecho corregir ("el precio base
puede no ser comprable, y entrar a la ficha para ver otro número es una sorpresa fea", comentario de
`precioDesde`), reabierto por el costado del recargo. Y está afirmado como verdadero en un ADR, que
es peor que no estar: el próximo que lea ADR-036 no va a revisarlo.

**Qué pediría:** o sumarle a `precioDesde` el mínimo recargo de cada grupo obligatorio, o —si se
elige no tocarlo— corregir la frase del ADR y del changelog, porque hoy documenta una garantía que
el código no da.

---

### 3 · MEDIA · Escribir el recargo como se escriben los precios acá ("1.500") lo guarda como $1,50

**Dónde:** `front/Andres_Bakery/src/lib/carrito.ts:139-150` (`recargoTipeado` reemplaza la coma pero
**no saca el punto de los miles**) y `front/Andres_Bakery/src/pages/admin/SaboresDelGrupo.tsx:116-123`
y `205-213` (el campo es un `input` de texto con `inputMode="decimal"`, sin `type="number"`, sin
`min`, y sin eco de lo que se va a cobrar).

**Medido:**

```
"1.500"     -> 1.5         "15.000" -> 15        "  1.200  " -> 1.2
"1500"      -> 1500        "500,50" -> 500.5     "1.500,50"  -> null (rechazado, bien)
aviso que lee Andrea para 1.5:  "$ 2"       chip del sabor para 1.5:  "+$ 1,50"
```

Escribe `1.500` pensando mil quinientos, el back guarda `1.50`, el aviso le confirma **"+$ 2"** y la
tarjeta le muestra **"+$ 1,50"**: tres números distintos para un solo dato, y el que se cobra es
mil veces menor que el que quiso poner.

**Cómo reproducirlo:** panel → Gustos → Relleno → Editar en un sabor → escribir `1.500` en el campo
"+$" → Guardar. Aviso: *«X» guardado con +$ 2*. Chip: `+$ 1,50`. Base: `1.50`.

**Por qué importa:** es el único campo de plata del panel que no tiene la protección que sí tiene el
precio del tamaño: `front/.../admin/VariantesDelProducto.tsx:91-99` usa `type="number" min="0"
step="0.01"` **y** muestra *"Se va a cobrar $X"* debajo mientras tipea (línea 133-137). Acá el único
eco llega después de guardar y encima redondeado. Es plata que se cobra de menos sin que nadie se
entere hasta que alguien suma el pedido a mano.

**Qué pediría:** el mismo input que el precio del tamaño (`type="number"`) o sacar los puntos en
`recargoTipeado`, y el mismo eco "se va a cobrar" al lado del campo.

---

### 4 · MEDIA · Agregar un sabor que ya existe ignora el recargo, y el panel igual avisa que lo guardó

**Dónde:** `backend/services/option_service.py:122-124` (si el sabor ya está devuelve **ese**, antes
de mirar `price_delta`) y `front/Andres_Bakery/src/pages/admin/accionesDeOpciones.ts:32-34,77-81`
(el aviso se arma con lo que ella tipeó, no con lo que contestó el back).

**Medido en el navegador** (panel, 1920 px, grupo «Relleno» que ya tiene Chocolate +$800):

```
15. aviso que leyó Andrea:  «Chocolate» agregado con +$ 7.777.
16. lo que quedó en la lista: ['Dulce de leche', 'Chocolate+$ 800', 'Crema', ...]
```

Y por servicio:

```
option_service.create_option(1, {"name":"Crema","price_delta":"9999"})
  creado: False   payload: {... 'price_delta': 750.0}     ← el 9999 se descartó
```

**Cómo reproducirlo:** panel → Gustos → Relleno → en el alta escribir un sabor que ya existe y un
recargo → Agregar. El aviso confirma el recargo; la base no cambió.

**Por qué importa:** la idempotencia del alta es una decisión buena y vieja ("pedir uno que ya está
es la misma intención que usarlo"), pero antes el aviso solo afirmaba algo inocuo. Ahora **afirma un
precio que no se guardó**, en la única pantalla donde ella controla plata. Si el recargo que quería
poner era el de verdad, lo da por hecho y la torta se vende más barata.

**Qué pediría:** una de dos. O el alta aplica el `price_delta` cuando el sabor ya existía (es la
intención evidente, y es un `update` encubierto), o el aviso se arma con la respuesta del back y dice
*"«Chocolate» ya estaba en Relleno, con +$800"*.

---

### 5 · MEDIA · El recargo que el pedido guarda (C4) no se ve en ninguna pantalla que lea un pedido guardado

**Dónde:** `backend/services/serializers.py:156-166` lo expone;
`front/Andres_Bakery/src/lib/types/pedidos.ts:11-15` **no lo declara** en `OrderItemOption`;
`front/Andres_Bakery/src/pages/admin/OrdersTab.tsx:51-57` y
`front/Andres_Bakery/src/pages/OrdersPage.tsx:80-84` arman `"grupo: sabor"` y lo ignoran.

**Cómo verlo:** panel → Pedidos, en un pedido con un sabor con recargo: dice *"1 x Cheesecake
(8 porciones) · Relleno: Chocolate · $16.500"*, sin decir de dónde salieron los $2.300 de
diferencia con el tamaño. El mensaje de WhatsApp sí lo dice —lo verifiqué: `Relleno: Chocolate
(+$800) · Bizcocho: Chocolate (+$1.500,50)`— pero ese mensaje **no se guarda en ninguna parte**.

**Por qué importa:** la razón escrita de la columna, en ADR-036 parte 4, es *"si ella pasa el
chocolate de $500 a $800 en marzo, el pedido de enero tiene que seguir diciendo lo que cobró en
enero"*. La columna guarda bien el dato (lo verifiqué: cambié el recargo después del pedido y el
renglón siguió en 500,00), pero **no hay pantalla donde el pedido de enero lo diga**: el único lugar
que lo cuenta es un mensaje efímero. El criterio C4 se cumple en la base y no en el producto.

**Qué pediría:** un campo en el tipo del front y el recargo al lado del sabor en `OrdersTab` (y en
`OrdersPage`, que es el pedido de quien compró). Es la misma línea de código que ya existe en
`DetalleDelRenglon`.

---

### 6 · BAJA · Un recargo que redondea a cero entra en silencio, al revés que el precio del tamaño

**Dónde:** `backend/services/option_service.py:235-251` (`_recargo` solo rechaza `< 0`), contra
`backend/services/product_service.py:217-228` (`_precio_de_variante` rechaza lo que
`quantize(0.01) <= 0` **justamente por esto**: *"`0.004` pasaba el filtro del front —que muestra
'$ 0'— y se guardaba en 0.00"*, hallazgo del review de T4-F19b).

**Medido:** `price_delta: "0.001"` → `200 OK`, en la base `Decimal('0.00')`, en el JSON `0.0`, y el
panel después no muestra ningún recargo. Ella puso un número positivo y el sistema guardó cero sin
decir nada. (`"0.555"` sí se guarda bien, como `0.56`, y la ficha lo muestra `+$ 0,56`: la
precisión está bien, es el caso que colapsa a cero el que no avisa.)

**Por qué importa poco y aun así importa:** cero es un estado válido para un recargo, así que no se
cobra nada mal. Pero es el mismo patrón que el proyecto ya decidió rechazar en el campo de al lado,
y la asimetría es la clase de cosa que el próximo review vuelve a encontrar.

---

### 7 · BAJA · El guard de `Number.isFinite` del recargo no está cubierto por ningún test (mutante verde)

**Dónde:** `front/Andres_Bakery/src/lib/carrito.ts:152-155`.

**Medido** (worktree, código nuevo, mutante aplicado a mano):

```
return Number.isFinite(recargo) && recargo > 0 ? recargo : 0;   →   return recargo > 0 ? recargo : 0;
$ npm run test -- src/lib/carrito.test.ts        →     Tests  29 passed (29)
```

Los dos tests que dicen cubrirlo usan `NaN`, y `NaN > 0` ya es `false`: el `isFinite` no cambia nada
ahí. El único caso donde sirve es `Infinity`, que **es alcanzable**: un carrito de `localStorage`
tocado a mano o escrito por otra versión da `JSON.parse('{"price_delta":1e400}') → Infinity`, y sin
el guard el carrito mostraría `$ ∞`. Ese caso no tiene test.

**Por qué importa:** R29 dice que un check que nunca vio rojo no prueba nada. Este guard está bien
puesto; lo que falta es el test que lo sostenga el día que alguien lo "simplifique".

---

### 8 · BAJA · Mensajes en inglés y un tope mal escrito, alcanzables desde el campo nuevo

**Dónde:** `backend/services/base.py:33-55` (`parse_decimal`), llamado desde
`option_service.py:246`.

**Medido** por la API de admin:

```
'NaN'        -> 400 recargo must be a valid number
'Infinity'   -> 400 recargo must be a valid number
'1e20'       -> 400 recargo no puede pasar de 100.000.000
'100000000'  -> 400 recargo no puede pasar de 100.000.000     (el tope real es 99.999.999,99)
'700,50'     -> 400 recargo must be a valid number            (el front manda el punto, así que no pasa por acá)
'-0.001'     -> 400 El sabor puede tener un recargo, no un descuento: poné 0 o más.   ← este está bien (C2)
```

El mensaje de C2 está en castellano y es el que Andrea ve normalmente, porque `recargoTipeado` filtra
lo que no es número antes de salir. Pero el del tope **sí le llega** (escribe `1000000000`, lo que es
un error de tipeo plausible) y es mitad castellano mitad inglés, con un número que no es el tope.
Viene de antes de esta tanda; lo anoto porque F61 agrega un campo nuevo que lo expone y porque el
"recargo" en castellano pegado a un verbo en inglés queda raro en una API cuyos mensajes son todos
en castellano.

---

### 9 · BAJA · El `downgrade` de `0009` pone todos los recargos en cero y nada avisa que eso hace cobrar de menos

**Dónde:** `backend/migrations/versions/0009_recargo_del_sabor.py:48-53`.

**Medido:** `downgrade 0009 → 0008` y `upgrade 0008 → 0009` sobre una copia con los dos recargos
cargados → *"recargos: todos en 0"*, los sabores intactos. Es lo correcto para un `drop_column`, y
el implementador lo documentó en `current.md`. Lo anoto igual porque la consecuencia no está dicha en
ninguna parte: **volver atrás por cualquier otra razón hace que la web empiece a cobrar de menos
sin un solo error en los logs**, y recuperarlos es volver a cargarlos a mano. Una línea en el
docstring del `downgrade` ("si volvés acá, los recargos se pierden: anotalos antes") alcanza.

---

### 10 · BAJA · El `unit_price` del renglón puede pasarse de `Numeric(10,2)` sumando recargos

**Dónde:** `backend/services/renglon_del_pedido.py:98-100` (la suma no se compara contra
`MAX_IMPORTE`), con `backend/models/pedidos.py` (`unit_price` es `Numeric(10,2)`).

**Medido:** con dos recargos en el tope permitido (99.999.999,99 cada uno) y `quantity: 1000`:

```
[dos recargos al tope x1000] 201 total=200014199980.0
  unit_price guardado: Decimal('200014199.98')     ← 9 dígitos enteros en una columna de 8
  total guardado:      Decimal('200014199980.00')
```

Hace falta que un admin cargue dos recargos absurdos, y en SQLite no explota nada; en Postgres sería
un error al grabar en la ruta pública del pedido. Antes de F61 el `unit_price` no podía pasarse del
rango de la columna porque era un solo precio ya topeado. Un `parse_decimal`/tope sobre la suma lo
cierra.

---

## 6 · Lo que verifiqué y **estaba bien**

Esto es la mitad del trabajo y le da peso al resto.

1. **C3 · el recargo se cobra, leído de la base.** 8 porciones $14.200 + $800 + $1.500 = **$16.500**
   por API y en la ficha; 12 porciones = $22.100; cambiando el relleno caro por Crema = $21.300.
   Con `quantity: 7`, $115.500 = 16.500 × 7: el recargo entra en el precio de **una** unidad, como
   el precio de siempre.
2. **C8 · V4 · siete formas de inyectar plata en el request, todas ignoradas** (tabla de §4).
3. **C2 · el descuento se rechaza en castellano**, por API y en el panel: *"El recargo tiene que ser
   0 o más, sin signos ni letras"* para `-500` y para `mil quinientos`, el renglón **queda en
   edición** (no se pierde lo tipeado) y el valor viejo sigue en la base.
4. **C4 · el pedido guarda el recargo que cobró, y no cambia después.** Cambié el recargo del
   chocolate a 900 después del pedido: el renglón sigue en `price_delta=500.00` y
   `unit_price=14500.00`.
5. **C1 · el alta y la edición.** El recargo del alta funciona con la lista de strings (`"Merengue"`
   → 0.0) y con objetos (`{"name":"Ganache","price_delta":"700.50"}` → 700.5) en la misma llamada;
   el duplicado por normalizado se descarta; un sabor nuevo arranca en 0; un PUT que no trae
   `price_delta` **no borra** el recargo; `""` y `"   "` lo ponen en 0, que es como se saca.
   Un negativo en el alta del grupo también se rechaza.
6. **C5 · nadie dice "+$0".** Medido con una regex sobre `document.body.innerText` en la ficha, el
   carrito, el checkout y el panel a 1920 px y 390 px: `false` en todos. Los sabores sin recargo
   (Crema, Vainilla, Dulce de leche) muestran solo el nombre.
7. **El front muestra lo que el back cobra, en las cuatro pantallas.** Esto es lo que más me
   importaba después del bug de la ficha, y lo medí una por una con el carrito cargado con los dos
   sabores caros: **ficha $16.500 · cajón del carrito $16.500 · `/carrito` $16.500 · resumen del
   checkout $16.500** (+ envío $2.500 = $19.000). Las cuatro pasan por `precioDelRenglon` /
   `subtotalDelCarrito`, así que no quedó ningún lugar con el bug viejo. El panel de pedidos y el
   historial del cliente muestran `unit_price`, que ya trae el recargo (lo que les falta es el
   desglose, hallazgo 5).
8. **El pago con Mercado Pago también cobra el recargo:** `payment_service.py:29` arma el ítem con
   `item.unit_price`, no con el precio del producto.
9. **El mensaje de WhatsApp.** `- 2 x Cheesecake de Frutos Rojos (8 porciones): $33.000` /
   `Relleno: Chocolate (+$800) · Bizcocho: Chocolate (+$1.500)`. Con centavos lo dice bien
   (`+$1.500,50`) y un sabor sin recargo **no** lleva paréntesis.
10. **C6 · la tarjeta del grupo** dice los recargos sin abrir nada:
    `['Dulce de leche', 'Chocolate+$ 800', 'Crema', 'Chocolate+$ 1.500', 'Vainilla']`.
11. **C7 · R05 · ningún archivo pasa las 300 líneas.** El más largo del repo es
    `carrito.test.ts` (296); de los tocados: `option_service.py` 280, `renglon_del_pedido.py` 279,
    `usePanelDeAdmin.ts` 279, `carrito.ts` 263, `SaboresDelGrupo.tsx` 232, `EditorDeGrupo.tsx` 110.
12. **390 px:** el editor se abre dentro de la tarjeta (ningún `dialog[open]`, como manda ADR-034),
    los dos campos del sabor están, y el **desborde horizontal es 0** en el panel y en el checkout.
13. **Lo que el refactor pudo llevarse.** Comparé `git show 4146ea3:EditorDeGrupo.tsx` contra
    `EditorDeGrupo.tsx` + `SaboresDelGrupo.tsx` literal por literal: **no se perdió ningún texto ni
    ningún handler**. Sobreviven el cartel del grupo vacío, el placeholder "Agregar a X: dulce de
    leche, frutilla…", el `aria-label` de borrar, el comentario de por qué el sabor se borra sin
    preguntar, el `disabled` del botón, el `Escape` con `stopPropagation` (el arreglo del review de
    T19) y la X de cancelar. El único texto que cambió es **"Renombrar" → "Editar"**, que es correcto
    porque ahora edita dos campos; los `aria-label` nuevos (`Guardar X`, `Dejar X como estaba`) son
    de más, no de menos. La cadena `renombrarOpcion → editarOpcion` quedó completa en los cinco
    archivos (api, hook, panel, acciones, pestaña) y `tsc` no tiene nada que decir.
14. **El rate limit de la ruta pública sigue vivo:** me cortó al cuarto pedido con
    `429 "Estas mandando muchos pedidos seguidos."`.
15. **Un sabor borrado entre que se elige y se pide** devuelve 400 explicado (el caso honesto; el
    caso del id reusado es el hallazgo 1).
16. **Los MDs coinciden con lo medido** en los cuatro comandos, los números del navegador, la
    migración y los conteos de tests. La única afirmación que encontré falsa es la del "desde"
    (hallazgo 2).

## 7 · Lo que dejé como estaba

- **Base de desarrollo:** borré los 3 pedidos de prueba que entraron por la ruta pública antes del
  rate limit (ids 8, 9 y 10), con sus renglones, sus sabores y su entrega.
  Estado final verificado: `pedidos: [1..7]`, `renglones sueltos: 0`, `sabores sueltos: 0`,
  `OrderItemOption total: 0`, y los recargos **exactamente como estaban**
  (`Chocolate 800.00`, `Chocolate 1500.00`, el resto en `0.00`).
- **Admin temporal:** `qa-recargo@local.test` creado y **borrado** (`--borrar` → `borrado`);
  usuarios finales: solo `admin@local.test` y los dos de Facundo.
- Todo lo demás corrió sobre **copias** (`rev_t20.db`, `rev_t20b.db`, `mig_t20.db`, `mig_pre.db`) y
  en un **worktree** que ya saqué (`git worktree list` vuelve a tener una sola línea). El árbol de
  trabajo quedó idéntico al de la salida de `git status` de `current.md`, y `node_modules` intacto.
- Los dos servidores siguen levantados.

## 8 · Lo que no pude verificar, y por qué

1. **El endpoint público con el rate limit puesto, para todos los casos.** Entraron 3 pedidos y el
   resto fue `429`. Los 30 casos restantes los corrí **in-process con el test client sobre una copia
   de la base**: mismo `order_service`, mismas rutas, sin el limitador. Lo que no probé por HTTP de
   verdad es la capa de parseo de Werkzeug (body no-JSON, `Content-Type` raro), que no es de esta
   tarjeta.
2. **El `0009` sobre Postgres.** Solo SQLite, que es lo que hay. El `batch_alter_table` es
   específicamente lo que SQLite necesita; en Postgres el mismo `add_column` con `server_default` es
   trivial, pero no lo corrí.
3. **El hallazgo 1 por el camino del navegador.** Lo medí por API (que es donde se decide la plata);
   armar el mismo caso con un Chrome y un `localStorage` pisado me quedó a mitad de camino porque
   cambiar el hash no recarga la app y el estado de React ya estaba montado. El camino de código está
   leído entero y el resultado del servidor está medido.
4. **Concurrencia.** No probé dos pedidos simultáneos del mismo sabor mientras se le cambia el
   recargo. No vi razón para sospechar (la lectura y el cobro pasan en la misma transacción), pero no
   está medido.
5. **El 390 px real en un teléfono.** Es un Chrome headless con `--window-size` y
   `Emulation.setDeviceMetricsOverride`, no un dispositivo.
