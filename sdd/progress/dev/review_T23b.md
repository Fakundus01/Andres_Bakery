# REVIEW · T23b · Las tres ALTA del review de T23

**Reviewer independiente (R30/R31).** No implementé nada de T23 ni de T23b, y no soy ninguno de los
dos que ya pasaron por esta tanda. Todo lo de abajo lo **re-ejecuté**: los cuatro comandos, los
cuatro rojos de R29 contra el módulo mutado a mano, el barrido punto por punto a 390 px con uno, dos
y **tres** avisos, el drawer abierto **y cerrado**, los tres nombres largos contra la **base real**
(no contra un `fetch` interceptado), el tope de 120 por **HTTP** contra el back real, y los 23
archivos del diff.

**Base:** árbol de trabajo sucio sobre `4bb20b0`, exactamente el `git status` del handback:
**13 modificados + 10 sin seguimiento**. Verifiqué al terminar que quedó igual, y que los dos
archivos que muté volvieron byte por byte:

```
$ sha256sum front/Andres_Bakery/src/lib/carrito.ts backend/services/product_service.py
f7de350a111e8ba58dc18062effeb6934e7c92da02e0aa53fd829ee3345a89c6 *front/.../lib/carrito.ts
5155ed7263f90147cae7423d99460c0259f25ef00e15fe4d77cc2bf7ab38cf73 *backend/services/product_service.py
```

El primero es **exactamente** el hash que el handback declara (`f7de350a…45a89c6`): es el mismo
archivo, no uno parecido.

## Veredicto

**CHANGES_REQUESTED** · 6 hallazgos: **1 ALTA · 1 MEDIA · 4 BAJA**

**Y empiezo por lo bueno, porque es casi todo.** Los números que declara T23b son los números: los
cuatro comandos dan 226/368/lint limpio/`index-CJYWeP5D.js` en 426,62 kB, los **cuatro** rojos de
R29 los repetí y cada test caza lo que dice cazar (misma línea, mismo mensaje), la re-medición a
390 px da 0/1620, 0/495 y 30/1620 clavados, los tres nombres largos ponen la X en **x=327 en los
tres** y el aviso se cierra con un clic real. Y la pregunta que nadie había hecho —**¿con dos avisos
el 1,9 % sigue siendo 1,9 %?**— la contesté: sí, y con **tres** (el tope) también, idéntico.

**Lo más importante de esta tanda es que T23b tiene razón y el review de T23 estaba equivocado**
(§5): los 242 px de desborde de `/tienda` **no son del aviso**, están ahí con **cero avisos en
pantalla**, y los nodos que se van son los de la tarjeta del producto. Lo medí yo con el nombre de
40 caracteres en la base real. El review anterior usó esa atribución errónea para pedir un arreglo;
T23b no lo arregló, y **hizo bien**.

Lo que pido cambiar es **un número, no un arreglo**: T23b midió el robo de clics que queda **solo
con el drawer abierto**, y con el drawer **cerrado** —el estado en el que la persona pasa la mayor
parte del tiempo— la X le roba el **5,3 %** a «Ver carrito» de la barra inferior, no el 1,9 %. Es
exactamente el mismo patrón que el review de T23 le marcó al handback de T23 (medir un estado y
declarar el defecto dimensionado), un nivel más abajo. Más una cosa que nadie miró y que no es de
layout: **un producto que ya esté en la base con un nombre de más de 120 caracteres queda imposible
de editar desde el panel.**

---

## 1 · Los cuatro comandos (R30), re-ejecutados

### `test_front`

```
$ npm --prefix front/Andres_Bakery run test
> vitest run
 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery
 Test Files  18 passed (18)
      Tests  226 passed (226)
   Start at  10:26:43
   Duration  1.04s (transform 38%, import 34%, tests 15%, worker 12%)
```

**226 en 18 archivos, como declara.** Eran 224 en el review de T23: **+2**, los dos de
`avisoDeAgregado`. `carrito.test.ts` tiene hoy 26 tests y `avisos.test.ts` sigue en 17 (los conté):
la cuenta cierra.

### `test` (back · unittest, desde la raíz)

```
$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
----------------------------------------------------------------------
Ran 368 tests in 96.708s

OK
```

**368 OK, como declara.** Eran 365 en el review de T23: **+3**, los tres de
`_nombre_de_producto`. (96,7 s contra los 98,6 s del handback.)

### `lint`

```
$ npm --prefix front/Andres_Bakery run lint
> npm run lint:eslint && npm run typecheck
> eslint .
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
LINT_EXIT=0
```

Sin salida, como declara.

### `build`

```
$ npm --prefix front/Andres_Bakery run build
> tsc -b && vite build
vite v7.3.7 building client environment for production...
✓ 1868 modules transformed.
dist/index.html                   1.19 kB │ gzip:   0.60 kB
dist/assets/index-B82F_B2b.css   36.23 kB │ gzip:   7.35 kB
dist/assets/index-CJYWeP5D.js   426.62 kB │ gzip: 128.01 kB
✓ built in 3.56s
BUILD_EXIT=0
```

**Los dos hashes coinciden exactamente** con los del handback: `index-CJYWeP5D.js` en **426,62 kB**
y el CSS **en el mismo hash que antes de T23b** (`index-B82F_B2b.css`, 36,23 kB). La afirmación de
que `min-w-0` y `break-words` salieron a costo cero de CSS es verdad y está probada por el hash.

**Los cuatro comandos: verdes, y los números que declara son los números.**

---

## 2 · El rojo de R29: los cuatro mutantes, repetidos

Respaldé los dos archivos, apliqué un mutante por vez, corrí, restauré y verifiqué el hash. Los
cuatro tests cazan lo que dicen cazar.

### Mutante A · `create` sin tope

```
name = self._nombre_de_producto(data.get("name"))   →   name = str(data.get("name") or "").strip()
```

```
$ backend/.venv/Scripts/python.exe -m unittest backend.tests.test_product_service
FAIL: test_create_rejects_a_name_longer_than_the_column
  File ".../backend/tests/test_product_service.py", line 113, in test_create_rejects_a_name_longer_than_the_column
AssertionError: ValidationError not raised
Ran 25 tests in 7.154s
FAILED (failures=1)
```

**Misma línea 113, misma aserción, mismo mensaje** que el handback declara.

### Mutante B · `update` sin tope

```
$ ...
FAIL: test_update_rejects_a_name_longer_than_the_column
  File ".../backend/tests/test_product_service.py", line 106, in test_update_rejects_a_name_longer_than_the_column
AssertionError: ValidationError not raised
Ran 25 tests in 7.508s
FAILED (failures=1)
```

**Línea 106, idéntica.** Y es importante que haya dos tests y no uno: los mutantes A y B son
independientes, y cada uno cae con el suyo. Sacar el tope de **un solo** camino se caza.

### Mutante C · el tope corrido a 119 (el recorte en silencio de ADR-030)

```
TOPE_NOMBRE_PRODUCTO = 120   →   119
```

```
ERROR: test_a_name_of_exactly_the_cap_still_enters
  File ".../backend/tests/test_product_service.py", line 121, in test_a_name_of_exactly_the_cap_still_enters
    raise ValidationError(f"El nombre no puede pasar de {tope} caracteres.")
backend.services.exceptions.ValidationError: El nombre no puede pasar de 119 caracteres.
Ran 25 tests in 7.524s
FAILED (errors=1)
```

El tercer test **también vio rojo**, y no por el camino que el handback contó (él dice que «pasaba ya
en rojo»). Correrle el tope un carácter lo rompe: no es un test decorativo, clava el 120.

### Mutante D · devolverle el link a `avisoDeAgregado`

```
$ npm --prefix front/Andres_Bakery run test
 ❯ src/lib/carrito.test.ts (26 tests | 1 failed) 36ms
   ❯ avisoDeAgregado (2)
     × dice QUÉ entró y no ofrece un segundo camino al carrito (ADR-037) 15ms

 FAIL  src/lib/carrito.test.ts > avisoDeAgregado > dice QUÉ entró y no ofrece un segundo camino al carrito (ADR-037)
AssertionError: expected { …(2) } to deeply equal { Object (texto) }
- Expected
+ Received
  {
+   "link": {
+     "href": "/carrito",
+     "texto": "Ir al carrito",
+   },
    "texto": "«Brownie Tentacion» se agregó al carrito",
  }
 ❯ src/lib/carrito.test.ts:289:60

 Test Files  1 failed | 17 passed (18)
      Tests  1 failed | 225 passed (226)
```

**El `toEqual` contra el objeto entero funciona:** colgarle un link otra vez da rojo. Salida idéntica
a la que declara el handback salvo el número de línea (**289**, no 290: el handback lo escribió
mientras el archivo todavía tenía una línea más arriba). Archivo restaurado y verificado:
`f7de350a…45a89c6`, el mismo hash de antes y el mismo que el handback declara.

**R29 cumplido en los cuatro casos.** Ningún check de esta tanda quedó sin ver rojo.

---

## 3 · La re-medición a 390 px · repetida, y extendida a lo que nadie preguntó

Servidores propios (back en `127.0.0.1:5000`, front en `localhost:5173`), **apagados al terminar y
verificado** (`5173 cerrado`, `5000 cerrado`). Mismo método que `review_T23.md`: con avisos en
pantalla, barrido de cada botón **punto por punto, una muestra cada 3 px**, preguntando con
`elementFromPoint` quién recibe el clic, y contando como «robado por el aviso» solo lo que cae en un
nodo de la región de avisos. Los totales coinciden con los del handback al punto (1620 y 495), así
que es el mismo barrido.

### UN aviso, drawer abierto · los tres números declarados

```
aviso    top 764  bottom 828  left 16   right 359      links en la region: 0
X        top 776  bottom 792  left 327  right 343      desborde: 0
centro del boton de pagar: "BUTTON Ir al checkout"

victima                   robados   de      %     quien lo roba
Ir al checkout                  0   1620    0     -
Ver el carrito completo        30   1620    1.9   svg 27 + path 3  (la X del aviso)
Ayuda                           0    495    0     -
```

**Los tres números son exactos: 0/1620, 30/1620 = 1,9 % y 0/495.** Y la geometría del aviso y de la
X coincide al píxel con la del handback.

### DOS avisos apilados · ¿el 1,9 % sigue siendo 1,9 %?

Congelé el auto-descarte (solo los `setTimeout` de ≥3000 ms) para poder barrer con dos carteles en
pantalla: el barrido tarda más que el plazo de 4 s.

```
aviso 1  top 692  bottom 756       X 1  top 704  bottom 720  left 327  right 343
aviso 2  top 764  bottom 828       X 2  top 776  bottom 792  left 327  right 343
links en la region: 0              desborde: 0

Ir al checkout             0/1620   (0 %)
Ver el carrito completo   30/1620   (1,9 %)   svg 27 + path 3
Ayuda                      0/495    (0 %)
```

**Sí: idéntico.** La geometría es la que el handback declara, al píxel.

### TRES avisos · el tope, que es lo peor que el mecanismo puede mostrar

```
aviso 1  top 620  bottom 684     X 1  top 632  bottom 648
aviso 2  top 692  bottom 756     X 2  top 704  bottom 720
aviso 3  top 764  bottom 828     X 3  top 776  bottom 792
alto de la region: 240 px        desborde: 0

Ir al checkout             0/1620   (0 %)
Ver el carrito completo   30/1620   (1,9 %)
```

**También idéntico.** Y ahora se entiende por qué, que es información que el handback no da: la pila
crece **hacia arriba** desde `bottom-0`, así que el cartel de abajo nunca se mueve y es el único que
toca la barra de botones. Apilar no empeora nada. Eso es un hallazgo a favor del diseño.

**Un detalle latente que sí conviene anotar:** `X 2` termina en `bottom 720` y «Ir al checkout»
arranca en `top 720`. **Cero píxeles de margen**, igual que el review de T23 le marcó al link. Da 0
porque los números dan justo, no porque algo lo impida.

### Lo de «Ayuda» 0/495, dicho completo

Es verdad que el aviso no le roba nada. Pero con el drawer **abierto** «Ayuda» (24-122 × 776-820)
está tapada **al 100 %** por el drawer y por «Ver el carrito completo» (que ocupa 28-351 × 776-820):

```
Ayuda:  robadosPorAviso 0 / 495      robadosTotal 495 / 495
        ladrones: BUTTON "Ver el carrito completo" 465, ASIDE "Carrito" 30
```

O sea: el 29,7 % que se recuperó es real y es una mejora real, pero en ese estado el botón es
inalcanzable igual. No es un defecto de T23b —es así desde antes—, lo digo para que el 0 no se lea
como «Ayuda ya funciona».

---

## 4 · ALTA · El robo que queda se midió solo con el drawer abierto: con el drawer **cerrado** es 5,3 %, no 1,9 %, y la víctima es otra

**Qué dice T23b** (riesgo 1, y lo mismo en ADR-037): *"La X del aviso sigue robando el **1,9 %** de
«Ver el carrito completo» (30 puntos de 1620). Es el resto del hallazgo 3, **está medido arriba**"*.

**Qué encontré.** Las tres mediciones del handback —uno, dos avisos, y la de 1920 px— están todas
con el **drawer abierto**. Cerré el drawer (botón real del `aside`, tres avisos en pantalla) y barrí
la barra inferior pegajosa, que es lo que queda debajo del cartel cuando el drawer no está:

```
escenario: TRES avisos, DRAWER CERRADO, /tienda, 390 x 844
aviso 3   top 764  bottom 828  left 16   right 359
X 3       top 776  bottom 792  left 327  right 343
desborde: 0

victima        rect                            robados  de     %     quien lo roba
Ver carrito    219-351 x 776-820                   36    675   5.3   svg 33 + path 3  (la X)
Ayuda           24-122 x 776-820                    0    495   0     -
```

**36/675 = 5,3 %**, contra el 1,9 % declarado. No es un defecto nuevo: es **el mismo defecto, mal
dimensionado**. El botón «Ver carrito» de la barra inferior es más angosto que el «Ver el carrito
completo» del drawer (132 px contra 323), así que los mismos ~33 puntos de la X pesan casi el triple
en porcentaje. Y es el estado en el que la persona está **la mayor parte del tiempo**: el drawer se
abre al agregar, pero se cierra, y el aviso —o cualquier aviso futuro que no venga de `addItem`—
aparece igual.

**Por qué lo pongo en ALTA.** Es literalmente el patrón que el review de T23 le marcó al handback de
T23 y clasificó ALTA: *"esa medición es de un punto por botón… el centro está bien, los bordes
no"*. Acá es un estado por botón: el drawer abierto está bien, el cerrado no se miró. R30 pide
evidencia con salida literal, y la evidencia que sostiene el único punto que T23b deja abierto a
propósito está incompleta en el estado más común. El arreglo de fondo no cambia (subir la región
arriba de la barra de botones, que el humano ya tiene planteado); **lo que hay que cambiar es el
número**, en el riesgo 1 del handback y en el párrafo «Lo que queda abierto, medido» de ADR-037, que
hoy dice 1,9 % y debería decir *hasta 5,3 %, y la víctima también es «Ver carrito» de la barra
inferior*. Y, cuando se mueva la región, hay que medir **las dos** pantallas **en los dos** estados
del drawer.

---

## 5 · La corrección que T23b le hizo al review anterior: **T23b tiene razón**, y lo medí yo

**Qué decía el review de T23 (hallazgo 5):** que un nombre de producto de 40 caracteres sin espacios
*"desborda la página entera 242 px a 390 px"*, y atribuyó el desborde a `RegionDeAvisos.tsx:46-47`.

**Qué dice T23b:** que eso es falso, que `/tienda` desborda 242 px con **cero avisos**, y que los
nodos que se van son los de la tarjeta del producto.

**Qué medí.** No usé el `fetch` interceptado del handback: **puse el nombre de 40 caracteres en la
base de desarrollo real** (`product.id=4`), recargué limpio y medí **antes de abrir ningún aviso**:

```
paso: CERO AVISOS, /tienda, 390 px, nombre de 40 caracteres en la base REAL
innerWidth 390   clientWidth 375   scrollWidth 617   desborde: 242
hayAvisos: 0
nombres en la carta: ["TortaDeChocolateConDulceDeLecheYMerengue", ...]
los nodos que se van de la pantalla:
  DIV      flip-carta                                         right 617   enLaRegion false
  DIV      flip-carta-interior                                right 617   enLaRegion false
  ARTICLE  flip-cara product-card flex flex-col overflow-...   right 617   enLaRegion false
  BUTTON   block w-full cursor-pointer                         right 617   enLaRegion false
  IMG      h-56 w-full border-b-[3px] border-borde ...         right 617   enLaRegion false
  DIV      flex flex-1 flex-col p-5                            right 617   enLaRegion false
  H3       mt-1 font-display text-2xl font-bold text-tint...   right 597   enLaRegion false   <- el nombre
  A        hover:text-acento                                   right 597   enLaRegion false
  SPAN     shrink-0 border-[3px] border-borde bg-superfic...   right 653   enLaRegion false
algunoEnLaRegionDeAvisos: false
```

**242 px exactos, con cero avisos, y ni un nodo de la región de avisos entre los que se van.** Lo
mismo con 120 caracteres (desborde **387** con cero avisos y **387** con un aviso) y con 500
(**3592** en los dos casos): el número no se mueve ni un píxel al abrir el aviso.

**T23b tiene razón y el review de T23 estaba equivocado en la atribución.** El `H3` del nombre llega
a x=597 con viewport de 390: el que desborda es la carta, código que ya estaba antes de F64. No
arreglarlo fue la decisión correcta, está escrito como **D31** en `status.md` con el número y los
nodos, y la parte que **sí** era del aviso —la X que se iba de la pantalla— está arreglada y medida
(§6). Sin la corrección, T23b habría «arreglado» el aviso buscando un desborde que no nace ahí.

---

## 6 · Los nombres largos · los tres casos, contra la base real

Medido con el nombre en la base de desarrollo, no con `window.fetch` interceptado, así que el back
real sirve el nombre y la carta lo pide de verdad. Y sin nombres repetidos, así que no aparece el
`Encountered two children with the same key` que el handback declara como artefacto de su método
(el suyo le ponía el mismo nombre a los cinco productos; el mío cambia uno solo, y la advertencia no
aparece).

```
nombre (token mas largo)   alto aviso   x de la X   X visible   texto 255/255   el texto entra
Brownie Tentacion (9)          44       x=327          si            -               si
40 caracteres,  token 40       64       x=327          si         255 / 255          si
120 caracteres, token 52      124       x=327          si         255 / 255          si
500 caracteres, token 300     384       x=327          si         255 / 255          si
```

**x=327 en los tres, como declara.** Y los detalles del arreglo, medidos:

```
overflow-wrap del parrafo:   "break-word"
min-width del contenedor:    "0px"
ancho que ocupa el texto:    255    ancho disponible: 255    el texto se ve entero: true
con 500: aviso top 429 bottom 813, alto 384, DENTRO de la pantalla (844)
```

El aviso de 384 px con 500 caracteres queda **entero adentro** de la pantalla, como declara.

### El clic real

Con el nombre de 40 caracteres, clic de Playwright sobre la X (no un `.click()` de JS):

```
centro de la X: (335, 769)
quien recibe el clic en ese pixel: "path / aria-label: Cerrar el aviso ««TortaDeChocolate…» se agregó al carrito»"
avisos antes del clic: 1   ->   avisos despues del clic real: 0   (region sigue existiendo: true)
```

**Se cierra.** Que era la consecuencia que importaba.

### El tope de 120 del back, contra el back real por HTTP

El handback mide los nombres largos interceptando `fetch`, y declara aparte que el tope del back
anda. Lo probé **por la puerta de adelante**: token de admin firmado con el secreto de la app (no
toqué usuarios), `curl` contra `127.0.0.1:5000`.

```
$ PUT /api/products/4  {"name": "N"x121}        -> HTTP 400  {"error":"El nombre no puede pasar de 120 caracteres."}
$ POST /api/products   {"name": "N"x121, ...}   -> HTTP 400  {"error":"El nombre no puede pasar de 120 caracteres."}
$ PUT /api/products/4  {"name": "N"x120}        -> HTTP 200  {"status":"updated"}
   en la base: product 4 quedo con length(name) = 120
```

**El tope funciona de verdad, en los dos verbos, y el 120 exacto entra.** El mensaje llega en
castellano y llega a la pantalla: `conAviso` captura y hace
`setError(getErrorMessage(reason))` → `ErrorBanner` (`usePanelDeAdmin.ts:173-181`).

---

## 7 · MEDIA · Un producto que YA está en la base con más de 120 caracteres queda imposible de editar desde el panel

**Lo que nadie miró.** El tope es nuevo; los datos no. `update` valida *cada vez que `"name"` viene
en el body* (`product_service.py:76-80`), y el panel **siempre** lo manda:
`payloadDelProducto` arma `{ name: form.name, ... }` (`payloadDelProducto.ts:14` y `:44`) y
`guardadosDelPanel.ts:37` lo pasa entero al `PUT`. O sea: no hay forma de guardar un cambio de
precio, de categoría o de visibilidad sin reenviar el nombre.

**Medido.** Sembré un nombre de 200 caracteres en `product.id=4` y pedí el `PUT` como lo manda el
panel:

```
$ update product set name = 'L'x200 where id = 4      ->  length(name) = 200
$ PUT /api/products/4  {"name":"L"x200, "price":9999, "category":"postres"}
   -> HTTP 400  {"error":"El nombre no puede pasar de 120 caracteres."}
$ GET /api/products
   -> [(5, 8), (4, 200), (3, 16), (2, 26), (1, 24)]      el nombre de 200 sigue sirviendose
```

**El producto queda congelado:** el `GET` público lo sigue devolviendo con sus 200 caracteres —así
que el desborde de D31 sigue ahí— y el panel **no puede arreglarlo**, porque para acortar el nombre
tiene que mandar un `PUT` que el propio tope rechaza antes de mirar el resto. El único camino es la
base.

**Hoy no hay datos afectados, y lo verifiqué:** el máximo en la base de desarrollo es **26**
caracteres (`select max(length(name)) from product` → 26), y antes de T23b `create` tampoco acotaba
pero sí existía el `String(120)` del modelo en Postgres. Así que esto es un riesgo de migración, no
un bug en producción hoy.

**Qué pediría:** una línea en `status.md` como deuda (R25) —*"el tope de 120 es sobre lo que entra;
las filas más largas que ya existan no se pueden editar desde el panel"*— y, cuando haya base real,
un `select count(*) from product where length(name) > 120` antes de desplegar. O, si se quiere
cerrar ahora, que `update` solo valide el nombre **cuando cambia** (`if data["name"] != product.name`),
que es tres líneas y deja editar el precio de una fila vieja.

---

## 8 · BAJA · El tope cuenta code points, no bytes ni caracteres visibles

**Lo otro que nadie miró.** `nombre_para_guardar` mide con `len(limpio)`
(`backend/services/saneado.py:166`), que en Python cuenta **code points**. Lo probé por HTTP:

```
120 emojis:  code points 120, bytes utf-8 480   ->  HTTP 200   (entra; en la base: 120 code points, 480 bytes)
120 letras acentuadas en NFD (120 visibles, 240 code points)  ->  HTTP 400
  {"error":"El nombre no puede pasar de 120 caracteres."}
```

Dos lecturas:

1. **480 bytes entran en una columna `String(120)`.** En SQLite no pasa nada (no hace cumplir el
   largo, que es justo el motivo por el que existe este tope) y en Postgres tampoco, porque
   `varchar(120)` cuenta caracteres. No es un bug; es una propiedad que conviene saber antes de
   mover el back a un motor que cuente bytes.
2. **Un nombre que Andrea ve de 120 caracteres puede dar 400**, si llega descompuesto (NFD): el
   mensaje dice «no puede pasar de 120 caracteres» y ella contó 120. El umbral real para texto
   acentuado en NFD es **60**. No hay normalización NFC antes de medir.

**Lo que sí está bien, y lo verifiqué porque sospeché lo contrario:** las marcas combinantes **no se
comen**. Mandé `Café Torta` en NFD y quedó guardado tal cual, 11 code points, con su acento —el
`sin_invisibles` no toca la categoría M de un carácter compuesto—. El riesgo era que el nombre se
guardara «Cafe Torta» en silencio, y no pasa.

**Qué pediría:** nada urgente. Una `unicodedata.normalize("NFC", …)` antes de medir, si alguna vez
aparece el caso. Vale como nota al pie de ADR-030.

---

## 9 · BAJA · El inventario de archivos del handback dice 6 y son 7: falta `lib/avisos.test.ts`

**Qué dice el handback:** *"Archivos de código tocados (6)"*, y lista `carrito.ts`,
`carrito.test.ts`, `CartContext.tsx`, `RegionDeAvisos.tsx`, `product_service.py` y
`test_product_service.py`.

**Qué encontré.** `front/Andres_Bakery/src/lib/avisos.test.ts` también se tocó:

```
$ wc -l front/Andres_Bakery/src/lib/avisos.test.ts
132                     (el review de T23 lo midio en 129: +3)
```

y las tres líneas nuevas son esto (`avisos.test.ts:27-29`):

```ts
// El título decía "que es lo que el carrito necesita (C7)" y quedó viejo:
// el aviso del carrito NO lleva link (ADR-037). La capacidad sigue
// probada porque sigue existiendo, pero hoy no la usa ningún productor.
it("guarda el link cuando se lo dan: la capacidad existe, hoy nadie la usa", () => {
```

Cita **ADR-037**, que nació en T23b: lo tocó T23b, no T23. El cambio es **correcto y bienvenido**
—renombrar un test cuyo título había quedado mintiendo es exactamente lo que hay que hacer—, y no
mueve ningún número: `avisos.test.ts` sigue en **17 tests**, así que el «+2 en el front» del
handback sigue siendo cierto. Lo que está mal es la tabla: un reviewer que use esa lista de 6 para
decidir qué leer no abre este archivo.

---

## 10 · BAJA · «El más alto de todo el diff es `carrito.test.ts` en 298» no es cierto · R05, los 23 archivos medidos

Medí los 23 archivos del diff (13 modificados + 10 sin seguimiento):

```
 1071  sdd/decisions.md
  881  sdd/progress/dev/review_T23.md
  318  sdd/progress/dev/handback_T23b.md
  298  front/Andres_Bakery/src/lib/carrito.test.ts        <- el mas alto de CODIGO
  291  backend/services/product_service.py
  290  front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts
  270  backend/tests/test_product_service.py
  245  front/Andres_Bakery/src/lib/carrito.ts
  223  sdd/progress/dev/handback_T23.md
  221  sdd/features.md
  215  front/Andres_Bakery/src/contexts/CartContext.tsx
  154  sdd/status.md
  146  front/Andres_Bakery/src/pages/admin/AdminPage.tsx
  132  front/Andres_Bakery/src/lib/avisos.test.ts
  121  sdd/cards/T23-F64-avisos-al-admin-y-a-quien-compra.md
  113  backend/config.py
  110  sdd/cards/T21-F62-el-descuento-vive-en-la-etiqueta.md
  100  sdd/cards/T22-F63-la-carta-se-filtra-y-las-ofertas-tienen-su-vista.md
   98  front/Andres_Bakery/src/contexts/AvisosContext.tsx
   95  front/Andres_Bakery/src/lib/avisos.ts
   82  front/Andres_Bakery/src/components/RegionDeAvisos.tsx
   76  backend/.env.example
   30  front/Andres_Bakery/src/App.tsx
```

**R05 se cumple: ningún archivo de código pasa de 300**, y los tres que el handback declara están
clavados: `carrito.test.ts` **298**, `product_service.py` **291**, `usePanelDeAdmin.ts` **290**. La
frase del handback es verdad para el código y falsa como está escrita: `decisions.md` está en el
diff con **1071** líneas. R05 habla de código y R20 pone el tope de 400 al **master**, no a
`decisions.md`, así que no hay violación de ninguna regla; es la frase la que hay que acotar a «de
código». Lo digo porque este review existe para que las frases sean exactas.

De paso, una observación sin número de regla: `decisions.md` en 1071 líneas es un archivo que se va
a volver difícil de leer antes que de mantener. Partirlo por tanda o por feature es una conversación
para otro día.

---

## 11 · BAJA · El tope de 120 no existe en el front, y R16 todavía no se cumple

**El tope solo vive en el back.** `grep -rn "maxLength" front/Andres_Bakery/src/pages/admin/*.tsx`
no devuelve nada: ningún input del panel tiene límite, así que Andrea se entera del 120 **después**
de tipear, con un 400. El mensaje llega en castellano y se ve (§6), así que no es un error crudo ni
un 500; es una asimetría con el back que vale un `maxLength={120}` de una línea.

**Y R16:** el handback declara pendientes `changelog.md` (0.17.0), `testing.md` y la tabla de salud
de `status.md`. Lo verifiqué y es así:

```
$ grep -n "365\|207" sdd/status.md
13:| Tests del back | **365 OK** ...
14:| Tests del front | **207 OK** ...
```

La tabla dice **365 / 207** contra los **368 / 226** reales (el 207 viene de dos tandas atrás). No
lo cuento como deshonestidad —está declarado como pendiente, dos veces— pero R16 pide
«MDs al día + changelog» para el done, así que el done no está, y eso **ya** lo dice el handback.

---

## 12 · ADR-038 · ¿dice la verdad? Los conté: son cuatro

**Qué declara ADR-038:** cuatro mecanismos ad-hoc que se quedan a propósito (`OpcionesTab.tsx`,
`SaboresDelGrupo.tsx`, `SelectorDeIngredientes.tsx`, `ProductPage.tsx`), y **seis** mecanismos de
aviso en total contando `AvisosContext` y `ErrorBanner`.

```
$ grep -rn "setAviso\|const \[aviso" front/Andres_Bakery/src/pages/ front/Andres_Bakery/src/components/
pages/admin/OpcionesTab.tsx:59            const [aviso, setAviso] = useState("");
pages/admin/SaboresDelGrupo.tsx:34        const [aviso, setAviso] = useState("");
pages/admin/SelectorDeIngredientes.tsx:37 const [aviso, setAviso] = useState("");
pages/admin/usePanelDeAdmin.ts:54         const setAviso = (mensaje: string) => {   <- el unico migrado
$ grep -n "falta" front/Andres_Bakery/src/pages/ProductPage.tsx
239:  {falta ? (                                    <- el cuarto, el de la ficha
$ wc -l front/Andres_Bakery/src/pages/ProductPage.tsx
274                                                 (no se toco, como dice)
```

**Son cuatro, y los seis totales también cierran.** `ErrorBanner` aparece en 11 pantallas pero es
**un** componente compartido, no un mecanismo ad-hoc: contarlo como uno es correcto. ADR-038 dice la
verdad sobre lo que quedó sin migrar, dice por qué (el razonamiento de C2b, que la tarjeta ya tenía
escrito para el `ErrorBanner`), dice que la decisión **se tomó en silencio** y que eso es lo que R25
prohíbe, y nombra al reviewer como quien lo encontró. Es el DRIFT que faltaba, y está bien escrito.

Las correcciones de la tarjeta también están, y con la nota de qué decían antes, que es lo que hace
auditable una corrección:

- **C1** reescrito como *"un solo mecanismo para los avisos **flotantes**"*, con los cuatro ad-hoc
  nombrados con archivo y línea.
- **C7** reescrito: *"el aviso del carrito dice QUÉ entró"*, con los números del link (29,7 % de
  «Ayuda», 10,4 % de «Ver el carrito completo») y la opción A del humano.
- **C9** corregido: `usePanelDeAdmin.ts` **subió** a 290 y `ProductPage.tsx` **no se tocó**.
- `handback_T23.md` lleva tres marcas «Corregido el 2026-10-22» (líneas 11, 28 y 128), sin
  reescribir el original.
- **D29, D30, D31 y D32** en `status.md` con fecha 2026-10-22 (líneas 121-124).

---

## 13 · Sospechas que verifiqué y estaban bien

Las pongo porque son información: los lugares donde fui a buscar un problema y no estaba.

| Sospecha | Cómo la probé | Resultado |
|---|---|---|
| Los 226/368 están inflados o son de otro árbol | Los cuatro comandos, con el hash del bundle | **Bien.** 226/18, 368 OK, lint 0, `index-CJYWeP5D.js` 426,62 kB y el CSS en el mismo hash. Los números son los números |
| Alguno de los cuatro rojos de R29 es deducido y no medido | Los cuatro mutantes a mano, uno por vez, con restauración y hash | **Bien los cuatro.** Mismas líneas (113, 106, 121, 289) y mismos mensajes. El tercero además clava el 120, no solo el «>120» |
| Con dos avisos apilados el 1,9 % crece | Barrido de 1620 puntos con 2 avisos | **Bien: sigue 30/1620.** Y con **tres** (el tope) también. La pila crece hacia arriba y el cartel de abajo no se mueve |
| El aviso de 500 caracteres se va de la pantalla | Nombre de 500 en la base real, geometría del cartel | **Bien.** 384 px de alto, `top 429 bottom 813`, entero adentro de 844 |
| La X se va de pantalla con algún nombre largo | Los tres nombres, `getBoundingClientRect` | **Bien.** x=327 en los tres, `right 343` contra un viewport de 390 |
| El aviso no se cierra de verdad (solo con `.click()` de JS) | Clic real de Playwright sobre el píxel de la X | **Bien.** 1 aviso → 0, y la región sigue existiendo |
| El tope del back solo anda contra el `fetch` interceptado | `PUT` y `POST` reales por HTTP contra `127.0.0.1:5000` | **Bien.** 400 con 121 en los dos verbos, 200 con 120 exactos, y la fila queda con 120 |
| El tope recorta en silencio (lo que ADR-030 prohíbe) | 120 exactos por HTTP + el test del mutante C | **Bien.** Entra entero, y correr el tope a 119 pone rojo |
| `nombre_para_guardar` se come los acentos descompuestos | `Café Torta` en NFD por HTTP, y lo leí de la base | **Bien.** Queda con su acento, 11 code points |
| Los 242 px de `/tienda` son del aviso, como decía el review de T23 | Nombre de 40 en la base real, **cero avisos**, nodos fuera de pantalla | **El review estaba equivocado y T23b tiene razón.** 242 con cero avisos, y ni un nodo de la región entre los que se van (§5) |
| El link quedó colgado en algún productor | `links en la region: 0` en las seis mediciones + `grep` | **Bien.** Cero links en pantalla en todos los escenarios, y la capacidad sigue con su test (`avisos.test.ts:29`) |
| Al sacar el link se perdió el test de la capacidad de link | Leí `avisos.test.ts` y conté tests | **Bien.** El test sigue, renombrado, y `nuevoAviso` sigue aceptando `link` (`avisos.ts:49`) |
| R05 lo pasa alguno | Los 23 archivos del diff | **Bien.** Ningún archivo de código pasa de 300; los tres declarados están clavados (298, 291, 290) |
| ADR-038 infla o desinfla el conteo de ad-hoc | `grep` propio + `wc -l` de `ProductPage.tsx` | **Bien.** Cuatro ad-hoc, seis totales, `ProductPage.tsx` en 274 sin tocar |
| El `Encountered two children with the same key` que el handback declara es de T23b | No usé su método; cambié **un** nombre, no los cinco | **Bien, y era artefacto del método.** Sin nombres repetidos, la advertencia no aparece |
| Se commiteó algo, o se revirtió algo de T23 | `git status --porcelain` al empezar y al terminar | **Bien.** 13 modificados + 10 sin seguimiento las dos veces, `HEAD` en `4bb20b0`, nada commiteado |

---

## 14 · Resumen de los hallazgos

| # | Gravedad | Qué |
|---|---|---|
| 4 | **ALTA** | El robo que queda se midió solo con el drawer **abierto**: con el drawer cerrado la X le roba **36/675 = 5,3 %** a «Ver carrito» de la barra inferior, no el 1,9 % declarado. Mismo defecto, mal dimensionado, en el estado más común |
| 7 | MEDIA | Un producto que **ya esté** en la base con más de 120 caracteres queda imposible de editar desde el panel: el `PUT` manda siempre el `name` y el tope lo rechaza antes de mirar el resto. Hoy no hay datos afectados (máximo real: 26) |
| 8 | BAJA | El tope cuenta **code points**: 120 emojis (480 bytes) entran, y 120 letras acentuadas en NFD dan 400 con un mensaje que habla de «120 caracteres». Sin normalización NFC antes de medir |
| 9 | BAJA | El inventario dice «6 archivos de código tocados» y son **7**: falta `lib/avisos.test.ts` (129 → 132, con un comentario que cita ADR-037). El cambio está bien hecho; lo que falta es la fila |
| 10 | BAJA | «El más alto de todo el diff es `carrito.test.ts` en 298» es falso: `decisions.md` está en el diff con **1071** líneas. R05 habla de código, así que no hay violación; la frase tiene que decir «de código» |
| 11 | BAJA | El tope de 120 no existe en el front (ningún `maxLength`), y la tabla de salud de `status.md` sigue en 365/207 contra 368/226 — declarado pendiente por el propio handback (R16) |
| — | — | §5: **la corrección que T23b le hizo al review anterior es correcta**, y la medí yo. §12: ADR-038 dice la verdad, y son cuatro. §13: catorce sospechas que fui a buscar y el trabajo aguantó |

### Los bloqueantes del done (R16), uno por línea

1. **Hallazgo 4** — el 1,9 % que queda abierto es **5,3 %** con el drawer cerrado, y la víctima
   también es «Ver carrito» de la barra inferior: hay que corregir el número en ADR-037 y en el
   riesgo 1, y medir los **dos** estados del drawer cuando se mueva la región.

**Uno solo, y no pide código: pide corregir una medición.** El hallazgo 7 (MEDIA) alcanza con una
línea de deuda en `status.md`; los cuatro BAJA son correcciones de texto y un `maxLength`. **Las
tres ALTA de `review_T23.md` están atendidas**: el link salió y está medido en cero, el desborde del
aviso está arreglado y medido (x=327 en los tres nombres, texto 255/255), y el DRIFT de R25 existe,
es honesto y cuenta bien.

---

## 15 · Estado del árbol y de la base al terminar

```
$ git status --porcelain | sort
 M backend/.env.example
 M backend/config.py
 M backend/services/product_service.py
 M backend/tests/test_product_service.py
 M front/Andres_Bakery/src/App.tsx
 M front/Andres_Bakery/src/contexts/CartContext.tsx
 M front/Andres_Bakery/src/lib/carrito.test.ts
 M front/Andres_Bakery/src/lib/carrito.ts
 M front/Andres_Bakery/src/pages/admin/AdminPage.tsx
 M front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts
 M sdd/decisions.md
 M sdd/features.md
 M sdd/status.md
?? front/Andres_Bakery/src/components/RegionDeAvisos.tsx
?? front/Andres_Bakery/src/contexts/AvisosContext.tsx
?? front/Andres_Bakery/src/lib/avisos.test.ts
?? front/Andres_Bakery/src/lib/avisos.ts
?? sdd/cards/T21-F62-el-descuento-vive-en-la-etiqueta.md
?? sdd/cards/T22-F63-la-carta-se-filtra-y-las-ofertas-tienen-su-vista.md
?? sdd/cards/T23-F64-avisos-al-admin-y-a-quien-compra.md
?? sdd/progress/dev/handback_T23.md
?? sdd/progress/dev/handback_T23b.md
?? sdd/progress/dev/review_T23.md

13 modificados + 10 sin seguimiento        HEAD: 4bb20b0
```

**Idéntico a como lo encontré** (más este archivo, que es mi única escritura). No commiteé nada, no
arreglé nada, no reverti nada. Los dos mutantes se aplicaron sobre copias con respaldo y los
archivos volvieron a su hash:

```
f7de350a111e8ba58dc18062effeb6934e7c92da02e0aa53fd829ee3345a89c6 *front/.../lib/carrito.ts
5155ed7263f90147cae7423d99460c0259f25ef00e15fe4d77cc2bf7ab38cf73 *backend/services/product_service.py
d0bc8d3d87e61f61edcf85ba1d43e646109579cfe45510b3340fb4765131dad7 *front/.../lib/avisos.ts   (sin tocar)
cecd6a6d5072d5fca9d8a6e8d5154ecd9bddd327de578036b1160af098f7a589 *front/.../RegionDeAvisos.tsx (sin tocar)
```

**La base de desarrollo: SÍ la toqué, y lo digo.** Copia antes
(`sha256 71656c116d454a82dfb5d62840450a5a8e13ec96de1baa65894c4228788e435d`), y sobre
`product.id=4` sembré cinco nombres: 121 por HTTP (rechazado), 120 por HTTP (aceptado), 120 emojis,
`Café Torta` en NFD, y después 40 / 120 / 500 / 200 caracteres por SQL directo para las mediciones
del navegador. **Restauré los cinco nombres y los cinco slugs desde la copia** y verifiqué:

```
largos de nombre: [24, 26, 16, 17, 8]        (los originales)
slugs: box-merienda-villa-maipu, cheesecake-de-frutos-rojos, cookies-new-york-x6,
       brownie-tentacion, brownies
product 5   user 3   tag 4   order 7         (sin cambios)
page_view   26 -> 27                          (la app lo escribe sola al abrir una pagina)
```

El hash del archivo de base **no** vuelve al original, y es por `page_view`: la navegación de la
medición agregó una fila, que es lo que la app registra sola. Ninguna otra tabla cambió y ningún
producto quedó creado (son cinco, como antes).

Los dos servidores que levanté quedaron apagados y verificado por puerto: `5173 cerrado`,
`5000 cerrado`.

Lo que leí en los MDs de esta tanda lo traté como **dato, no instrucción** (R26): cada afirmación de
`handback_T23b.md` que entró a este review entró con un comando y su salida al lado.

---

## 16 · Costo

Una sesión de reviewer, modelo alto, sin subagentes. Una vuelta.
