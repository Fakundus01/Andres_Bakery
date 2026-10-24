# REVIEW · T23c · La ronda T23b, re-ejecutada después del commit

**Reviewer independiente (R30/R31), tercera vuelta.** No implementé nada de T23 ni de T23b, y no soy
ninguno de los dos reviewers anteriores. Mi única escritura es este archivo (R31). No commiteé nada,
no hice `git add`, no toqué código ni ningún otro MD.

**Por qué existe esta vuelta.** `handback_T23b.md` cerró las tres ALTA de `review_T23.md`, y
`review_T23b.md` las revisó **sobre el árbol sucio**, antes del OK y del commit. Después del review,
el handback **se editó** (318 → 322 líneas: la corrección del 5,3 %) y todo se commiteó junto como
`7271583`. O sea: **el árbol que hoy está en `dev` nadie lo re-ejecutó entero**. Eso es lo que hice.

**Base, con hash:**

```
$ git log --oneline -1
7271583 T23-F64: el sitio avisa qué entró al carrito, y el panel deja de pisar sus avisos (0.17.0)

$ git status --porcelain
(vacío)
```

---

## Veredicto

**CHANGES_REQUESTED** · 5 hallazgos: **1 ALTA · 2 MEDIA · 2 BAJA**

**Y arranco por lo que importa: el trabajo de T23b aguanta, y lo aguanta medido.** Los cuatro
comandos dan exactamente los números que declara (226 / 368 / lint 0 / `index-CJYWeP5D.js` 426,62 kB
y el CSS en el mismo hash), **los cuatro rojos de R29 los repetí uno por uno** con el módulo mutado a
mano y cada test cae con su línea y su mensaje, y el barrido punto por punto a 390 px reproduce
**0/1620, 30/1620 = 1,9 % y 0/495** al punto y la geometría al píxel. Los cuatro archivos que los dos
reviewers anteriores mutaron están en el commit con **el mismo hash** que `review_T23b.md` declara:
no es un árbol parecido, es el mismo. **Ningún hallazgo mío pide cambiar código de T23b.**

**El ALTA es un defecto que la ronda no podía ver porque nadie había mirado ese botón, y cambia el
sentido de lo único que quedaba abierto.** El punto abierto de la tarjeta —y el renglón 1 de la cola
en `status.md`— dice que la X del aviso le roba *hasta el 5,3 % de los toques de «Ver carrito»* con
el drawer cerrado. El 5,3 % es exacto, lo reproduje clavado (36/675). Lo que nadie midió es el otro
96,7 %: **a 390 px «Ver carrito» no recibe NI UNO de sus 675 puntos, ni con cero avisos en
pantalla.** Lo tapa entero el contenedor fijo del panel de Ayuda. Un clic de mouse real en el centro
del botón **no hace nada**. Así que el arreglo que la tarjeta tiene planteado —subir la región de
avisos arriba de la barra de botones— devolvería 36 puntos de un botón que igual está muerto, y
alguien podría medir «0 % robado» y declararlo cerrado con el botón sin funcionar.

Las dos MEDIA son frases de MD que la medición contradice: **el tope de 120 hace más de lo que el
handback declara** (también reescribe el nombre), y **D33 está escrita peor de lo que el defecto es**
(el panel sí puede arreglar un nombre largo: acortándolo).

---

## 1 · Los cuatro comandos de `harness.config.json`, re-ejecutados

### `test_front` · Vitest

```
$ npm --prefix front/Andres_Bakery run test
> vitest run
 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery

 Test Files  18 passed (18)
      Tests  226 passed (226)
   Start at  10:59:12
   Duration  1.73s (transform 62%, import 22%, worker 11%, tests 5%)
TEST_FRONT_EXIT=0
```

**226 en 18 archivos.** `sdd/testing.md` declara «Front: 226 tests de logica pura» (línea 15):
**coincide**.

### `test` · back, unittest desde la raíz

```
$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
----------------------------------------------------------------------
Ran 368 tests in 110.292s

OK
EXIT=0
```

**368 OK.** `sdd/testing.md` declara «Back: 368 tests» (línea 12) y la tabla de salud de `status.md`
dice **368 OK** y **226 OK** (líneas 13-14): **los tres números coinciden con lo medido**. La tabla
que `review_T23b.md` encontró vieja (365 / 207) **ya está corregida en el commit**: ese BAJA está
cerrado.

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
✓ built in 9.32s
BUILD_EXIT=0
```

**Los dos hashes del bundle son idénticos** a los que declaran el handback, `review_T23b.md` y la
tabla de salud de `status.md`: `index-CJYWeP5D.js` en 426,62 kB y `index-B82F_B2b.css` en 36,23 kB.
Que el CSS no cambiara de hash con `min-w-0` + `break-words` queda probado por tercera vez.

**Los cuatro comandos: verdes, y los números son los números.** 1868 módulos, los mismos.

### R05 · los archivos del diff, contados de nuevo

```
$ wc -l (los seis archivos de código que tocó T23b, más los dos declarados como riesgo)
  298 front/Andres_Bakery/src/lib/carrito.test.ts
  291 backend/services/product_service.py
  290 front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts
  270 backend/tests/test_product_service.py
  245 front/Andres_Bakery/src/lib/carrito.ts
  132 front/Andres_Bakery/src/lib/avisos.test.ts
   82 front/Andres_Bakery/src/components/RegionDeAvisos.tsx
```

**Los tres apretados están clavados: 298, 291, 290. Ninguno pasa de 300 (R05).**

---

## 2 · El rojo MEDIDO de R29 · los cuatro mutantes, repetidos a mano

Respaldé los dos archivos en mi scratchpad, apliqué **un mutante por vez**, corrí, restauré y
verifiqué el hash. **Ninguno de los cuatro rojos es deducido: los vi.**

### Mutante A · `create` sin tope

```
name = self._nombre_de_producto(data.get("name"))   →   name = str(data.get("name") or "").strip()
```

```
$ backend/.venv/Scripts/python.exe -m unittest backend.tests.test_product_service
FAIL: test_create_rejects_a_name_longer_than_the_column (...ProductServiceTestCase...)
Traceback (most recent call last):
  File "C:\...\backend\tests\test_product_service.py", line 113, in test_create_rejects_a_name_longer_than_the_column
    with self.assertRaises(ValidationError):
AssertionError: ValidationError not raised
Ran 25 tests in 7.984s
FAILED (failures=1)
```

**Línea 113, misma aserción, mismo mensaje** que declaran el handback y `review_T23b.md`.

### Mutante B · `update` sin tope

```
$ backend/.venv/Scripts/python.exe -m unittest backend.tests.test_product_service
FAIL: test_update_rejects_a_name_longer_than_the_column (...)
  File "C:\...\backend\tests\test_product_service.py", line 106, in test_update_rejects_a_name_longer_than_the_column
AssertionError: ValidationError not raised
Ran 25 tests in 8.632s
FAILED (failures=1)
```

**Línea 106, idéntica.** Y los dos mutantes son independientes: sacar el tope de **un solo** camino
se caza igual.

### Mutante C · el tope corrido a 119 (el recorte en silencio que ADR-030 prohíbe)

```
TOPE_NOMBRE_PRODUCTO = 120   →   119
```

```
$ grep -n "^TOPE_NOMBRE_PRODUCTO" backend/services/product_service.py
23:TOPE_NOMBRE_PRODUCTO = 119

  File "C:\...\backend\services\product_service.py", line 222, in _nombre_de_producto
    return saneado.nombre_para_guardar(valor, "nombre", tope=TOPE_NOMBRE_PRODUCTO)
  File "C:\...\backend\services\saneado.py", line 167, in nombre_para_guardar
    raise ValidationError(f"El nombre no puede pasar de {tope} caracteres.")
backend.services.exceptions.ValidationError: El nombre no puede pasar de 119 caracteres.
Ran 25 tests in 8.016s
FAILED (errors=1)
```

El tercer test **ve rojo**, como encontró `review_T23b.md` (y contra lo que el handback contó, que
dice que «pasaba ya en rojo»): correr el tope un carácter lo rompe. **Clava el 120**, no el «>120».

### Mutante D · devolverle el link a `avisoDeAgregado`

```
$ npm --prefix front/Andres_Bakery run test
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
    287|     // `toEqual` contra el objeto entero a propósito: el día que algui…
    288|     // vuelva a colgar un link, este test se pone rojo (ADR-037).
    289|     expect(avisoDeAgregado({ name: "Brownie Tentacion" })).toEqual({

 Test Files  1 failed | 17 passed (18)
      Tests  1 failed | 225 passed (226)
```

**El `toEqual` contra el objeto entero funciona.** Línea **289**, la que corrigió `review_T23b.md`
(el handback escribió 290). El guard que la tarjeta puso para que «un link colgado se ponga rojo»
**vio rojo tres veces ya, y la tercera es esta**.

### Los hashes, antes y después de mutar

```
$ sha256sum (después de restaurar los cuatro)
f7de350a111e8ba58dc18062effeb6934e7c92da02e0aa53fd829ee3345a89c6 *front/Andres_Bakery/src/lib/carrito.ts
5155ed7263f90147cae7423d99460c0259f25ef00e15fe4d77cc2bf7ab38cf73 *backend/services/product_service.py
d0bc8d3d87e61f61edcf85ba1d43e646109579cfe45510b3340fb4765131dad7 *front/Andres_Bakery/src/lib/avisos.ts
cecd6a6d5072d5fca9d8a6e8d5154ecd9bddd327de578036b1160af098f7a589 *front/Andres_Bakery/src/components/RegionDeAvisos.tsx
```

**Los cuatro son exactamente los que declara `review_T23b.md`** (§15 de ese archivo). El commit
`7271583` guardó byte por byte lo que ese reviewer revisó.

### Y un quinto mutante, que es el que NO se caza (D32, confirmado)

```
const MS_PARA_IRSE_SOLO = 4000;   →   3000
$ npm --prefix front/Andres_Bakery run test
 Test Files  18 passed (18)
      Tests  226 passed (226)
```

**Verde con el plazo cambiado.** D32 dice exactamente eso y **tiene razón**: el 4 s no tiene red
automática. (Restaurado: `avisos.ts` volvió a `d0bc8d3d…`.)

---

## 3 · El tope de 120 · los bordes, medidos uno por uno

Probado **sobre SQLite temporal propia** (el arnés de `backend/tests/support.py`), así que la base de
desarrollo no se tocó para esto. Script: `scratchpad/bordes_del_tope.py`.

```
=== CREATE ===
120 'N' exactos
   code points=120  NFC=120  colapsado=120  bytes=120
   -> OK  id=5  len(guardado)=120
121 'N'
   code points=121  NFC=121  colapsado=121  bytes=121
   -> ValidationError: El nombre no puede pasar de 120 caracteres.
120 emojis
   code points=120  NFC=120  colapsado=120  bytes=480
   -> OK  id=6  len(guardado)=120
120 acentos NFC
   code points=120  NFC=120  colapsado=120  bytes=240
   -> OK  id=7  len(guardado)=120
120 acentos NFD (240 code points)
   code points=240  NFC=120  colapsado=240  bytes=360
   -> ValidationError: El nombre no puede pasar de 120 caracteres.
119 letras + 6 espacios interiores (125 cp, 120 al guardar)
   code points=125  NFC=125  colapsado=120  bytes=125
   -> ValidationError: El nombre no puede pasar de 120 caracteres.
1500 'N'
   code points=1500  -> ValidationError: El nombre no puede pasar de 120 caracteres.
```

- **120 entra entero** (`len(guardado)=120`): **no es un recorte en silencio**, que es lo que
  ADR-030 prohíbe y lo que el tercer test fija.
- **121 no entra**, con el mensaje en castellano.
- **120 emojis entran** (480 bytes en una columna `String(120)`) y **120 acentos en NFD no**: los dos
  casos que D34 declara, **medidos y confirmados**. D34 está bien escrita.
- **1500 caracteres también se rechazan**, y no entran recortados a 1000 por el `texto(tope=1000)`
  interno: el comentario de `nombre_para_guardar` explica justo eso y es cierto.
- **El sexto caso es nuevo y es mi hallazgo 4** (abajo).

---

## 4 · ALTA · «Ver carrito» de la barra inferior no recibe NI UN toque a 390 px, con aviso o sin aviso: lo tapa entero el panel de Ayuda

**Qué dice lo escrito.** `status.md` §5, renglón 1 de la cola: *"queda **abierto el robo de clics de
la X del aviso** —hasta el **5,3 %** de «Ver carrito» con el drawer cerrado, 36 puntos de 675—, que
se arregla subiendo la región arriba de la barra de botones"*. Lo mismo en ADR-037 (la tabla de los
dos estados) y en el riesgo 1 del handback.

**Qué medí.** Primero reproduje el 5,3 %, clavado. Servidores propios (back `127.0.0.1:5000`, front
`localhost:5173`), apagados al terminar. Método de las dos vueltas anteriores: un aviso en pantalla,
barrido de cada botón **punto por punto, una muestra cada 3 px incluyendo los dos bordes**,
preguntando con `elementFromPoint` quién recibe el clic en cada punto.

```
escenario: UN aviso, DRAWER ABIERTO, /tienda, 390 x 844
aviso  top 764  bottom 828  left 16   right 359     links en la region: 0
X      top 776  bottom 792  left 327  right 343     desborde: 0

victima                   robados  de     %    quien lo roba
Ir al checkout                 0   1620   0    -
Ver el carrito completo       30   1620   1.9  svg 27 + path 3  (la X del aviso)
Ayuda                          0    495   0    -   (pero 495/495 los roban el drawer y el botón de abajo)
```

```
escenario: UN aviso, DRAWER CERRADO, /tienda, 390 x 844
aviso  top 764  bottom 828  left 16   right 359     drawerPresente: false
X      top 776  bottom 792  left 327  right 343     desborde: 0

victima        rect                  robadosPorAviso  de    %     robadosTOTAL
Ver carrito    219-351 x 776-820          36          675   5.3       675
Ayuda           24-122 x 776-820           0          495   0           0
ladrones de «Ver carrito»:  DIV (panel de Ayuda) 639  +  svg 33 + path 3 (la X)
```

**Los números declarados son exactos: 0/1620, 30/1620 = 1,9 %, 0/495 y 36/675 = 5,3 %.** Y la
geometría coincide al píxel con las dos vueltas anteriores. Hasta acá, todo lo que T23b y el reviewer
de T23b dijeron es verdad.

**Lo que nadie miró es la columna `robadosTOTAL`: 675 de 675.** Barrí el mismo botón **con cero
avisos en pantalla**, después de cerrar el aviso con un clic real sobre la X:

```
escenario: CERO avisos, DRAWER CERRADO, /tienda, 390 x 844
avisos: 0
Ver carrito   rect 219-351 x 776-820   robadosPorAviso 0/675   robadosTOTAL 675/675
  ladrones: DIV fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]  675
Ayuda         rect  24-122 x 776-820   robadosPorAviso 0/495   robadosTOTAL   0/495
```

Y el clic de verdad, con el mouse de Playwright sobre el centro del botón:

```
centro de «Ver carrito»: (285, 798)
quien recibe el clic en ese pixel: DIV · fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]
esElBoton: false

$ page.mouse.click(285, 798)
drawer antes del clic: false   ->   despues del clic REAL: drawer false, hash de la URL sin cambios
```

**El botón está muerto.** El ladrón es el contenedor fijo del panel de Ayuda,
`front/Andres_Bakery/src/components/AyudaPanel.tsx:64`:

```tsx
<div className="fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]">
```

A 390 px ese `div` mide **24 → 364** y el botón «Ver carrito»
(`CartDrawer.tsx:33`, `btn-primary fixed bottom-6 right-6 z-40`) vive en **219 → 351**: queda
**adentro**. Los dos son `z-40`, así que gana el que pinta último, y pinta último el de Ayuda. El
`div` no tiene `pointer-events-none` y no tiene nada dibujado ahí —el panel está cerrado— pero
recibe el clic igual. **Es el mismo defecto que ADR-037 y los `pointer-events` del aviso vinieron a
arreglar, en un componente que ya estaba.**

**Hasta qué ancho pasa.** Barrí nueve anchos:

```
viewport  clientWidth  rect de «Ver carrito»  el centro llega al boton   puntos robados
   320        305          149-281                    NO                   675/675
   360        345          189-321                    NO                   675/675
   390        375          219-351                    NO                   675/675
   430        415          259-391                    NO                   570/675
   480        465          309-441                    si                   330/675
   520        505          349-481                    si                   120/675
   560        545          389-521                    si                    45/675
   640        625          469-601                    si                    45/675
   768        753          597-729                    si                    15/675
```

**En los tres anchos de celular que el proyecto declara mirar (320 / 360 / 390) el botón recibe
cero.** A 430 —un iPhone 15 Pro Max— tampoco se puede tocar el centro. Recién a 480 empieza a
funcionar, y a 1920 está perfecto (§5).

**Por qué lo pongo en ALTA, aunque no sea código de T23.**

1. **Es el camino principal al carrito en celular, que es donde se compra.** El carrito sigue
   alcanzable desde el header (`Ver el carrito, N productos`), así que no es una venta perdida
   garantizada; es el botón grande y flotante que existe para eso y que no responde.
2. **Invalida la forma del punto abierto.** La frase que quedó en la cola y en ADR-037 dice que la X
   le roba *hasta el 5,3 %* a «Ver carrito». Con el otro 94,7 % robado por Ayuda, mover la región de
   avisos a `bottom-28` devolvería 36 puntos de 675 **y el botón seguiría sin andar**. Peor: la
   medición post-arreglo daría «0 % robado por el aviso» y se leería como cerrado.
3. **Es exactamente el patrón que las dos vueltas anteriores clasificaron ALTA**, un nivel más abajo
   otra vez: T23 midió *un punto por botón*, T23b midió *un estado del drawer*, y las tres
   mediciones contaron *solo al aviso como ladrón*. La columna «quién más lo roba» estuvo siempre en
   la salida y nadie la leyó.

**Qué pido.** Que se escriba como deuda nueva con su número y su medición (no como parte del punto
abierto del aviso, porque no es del aviso), y que la frase de la cola y de ADR-037 diga que el botón
víctima **hoy no recibe ningún toque a 390 px por otra causa**. El arreglo probable es una línea
—`pointer-events-none` en el contenedor de `AyudaPanel.tsx:64`, con `pointer-events-auto` en lo que
sí se toca, que es el patrón que `RegionDeAvisos.tsx` ya usa— pero **es código que esta tarjeta no
toca y yo no escribo código**. Y cuando se arregle, se mide **los dos estados del drawer en las dos
pantallas**, como ADR-037 ya se obliga.

---

## 5 · A 1920 × 1080 · los dos estados del drawer, que nadie había medido cerrado

```
escenario: UN aviso, DRAWER ABIERTO, /tienda, 1920 x 1080
aviso  top 1020  bottom 1064  left 729  right 1177    links en la region: 0
X      top 1032  bottom 1048  left 1145 right 1161    desborde: 0

victima                   robadosPorAviso  de     robadosTOTAL  quien
Ir al checkout                  0          1995         15      ASIDE (el borde del drawer)
Ver el carrito completo         0          1995         15      ASIDE (el borde del drawer)
Ayuda                           0           495        495      DIV fixed inset-0 z-50 bg-tinta/30 (el velo del drawer)
```

```
escenario: UN aviso, DRAWER CERRADO, /tienda, 1920 x 1080
aviso  top 1020  bottom 1064  left 729  right 1177    drawerPresente: false   desborde: 0

victima        rect                    robadosPorAviso  de    robadosTOTAL
Ver carrito    1749-1881 x 1012-1056         0          675        15
Ayuda            24-122  x 1012-1056         0          495         0

centro de «Ver carrito» (1815, 1034): "BUTTON btn-primary fixed bottom-6 right-6 z-40"  esElBoton: true
```

**El aviso no le roba nada a nadie a 1920, en ninguno de los dos estados**, y la geometría del cartel
(`top 1020 bottom 1064 left 729 right 1177`) es **exactamente** la que declara el handback. Los 15
puntos sueltos son el borde del layout, no el aviso. **Y a 1920 «Ver carrito» sí recibe su centro**:
el hallazgo 4 es sólo de pantalla angosta.

**Desborde horizontal: 0** en las dos pantallas, con aviso y sin aviso.

---

## 6 · D33 · el defecto es real, pero la deuda está escrita peor de lo que es · MEDIA

**Qué dice D33** (`status.md:126`): *"Un producto que ya tenga más de 120 caracteres en el nombre
queda **imposible de editar desde el panel**… y el `GET` público sigue sirviendo el nombre largo, o
sea que el desborde de D31 **no se puede arreglar desde la interfaz**"*.

**La primera mitad es verdad y la reproduje.** Sembré 200 caracteres en una fila y pedí el `update`
con el payload que arma el panel (`payloadDelProducto.ts:14` manda `name` **siempre**, y
`guardadosDelPanel.ts:35-40` lo pasa entero al `PUT`):

```
sembrado: length(name) = 200
update del panel (solo cambia el precio, reenviando el name largo):
   ValidationError: El nombre no puede pasar de 120 caracteres.
la fila sigue con length(name) = 200   price = 1000.00   (el precio NO se guardó)
```

**La segunda mitad es falsa, y la probé.** El formulario del panel **se prellena con el nombre de la
fila** (`valoresIniciales.ts:60`, `name: product.name`) y **no tiene `maxLength`** (lo confirmé:
`grep -rn "maxLength" front/Andres_Bakery/src/pages/admin/` no devuelve nada, que es el BAJA 11 de
`review_T23b.md`). Así que Andrea puede borrar caracteres en el campo y guardar:

```
update con el nombre ACORTADO en el mismo PUT:
   OK: name='Torta corta'  price=9999.00   <- el camino de salida existe
```

O sea: **lo que no se puede es cambiar el precio, la categoría o la visibilidad dejando el nombre
largo. Acortar el nombre —que es justo el arreglo de D31— sí se puede desde el panel.** La deuda,
como está escrita, dice que D31 está encerrada y no lo está, y eso cambia la decisión: la salida
*"validar `name` sólo cuando cambia"* que D33 propone sigue siendo razonable, pero deja de ser la
única puerta.

**Por qué MEDIA y no BAJA:** es una frase de `status.md` que describe un defecto **peor de lo que
es**, en el documento que se usa para decidir qué se toca. Es el mismo tipo de hallazgo que el ALTA
de `review_T19.md` (un MD que manda a hacer trabajo que no hace falta), con el signo invertido.

---

## 7 · El tope de 120 hace más que topar: también reescribe el nombre, y eso no está declarado · MEDIA

**Qué declara el handback** (riesgo 4): *"El tope del back es un cambio de comportamiento de la API
que la tarjeta no pedía. Un `POST` o `PUT` de producto con nombre de 121 caracteres ahora es **400 en
castellano**… si no lo querés en esta tanda, se saca solo (tres líneas y sus tres tests)"*. El
changelog y ADR-030 tampoco dicen más que el tope.

**Qué cambió de verdad.** El diff no agrega un `if len(...)`: cambia el nombre de producto de
`(data.get("name") or "").strip()` a `nombre_para_guardar(...)`, que es el saneador compartido de la
casa. Medí los dos comportamientos lado a lado:

```
caso                         ANTES (strip solo)                 HOY (_nombre_de_producto)
espacios interiores          'Torta   de     chocolate'         'Torta de chocolate'
salto de linea               'Torta\nde chocolate'              'Torta de chocolate'
zero-width space             'Torta\u200bde\u200bchocolate'     'Tortadechocolate'
solo puntuacion              '***'                              '***'
solo guiones                 '---'                              '---'
numero en vez de texto       AttributeError (500)               '12345'
tabs y espacios al borde     'Torta'                            'Torta'
```

Tres cosas, ninguna en el handback:

1. **El nombre se reescribe.** Los espacios interiores y los saltos de línea se colapsan: lo que
   Andrea tipeó no es necesariamente lo que queda guardado. Es **deliberado** y está explicado en el
   comentario de `nombre_para_guardar` (es lo que ya les pasa a ingredientes, tamaños y etiquetas), y
   el front colapsa el espacio en blanco al dibujar, así que casi no se ve. Pero es una modificación
   en silencio de un campo que sale por el `GET` público, y la doctrina de ADR-030 es justamente «no
   recortes en silencio».
2. **Los caracteres invisibles se sacan** (el zero-width se come, pegando las palabras).
3. **Y una mejora que tampoco está escrita:** un `name` numérico antes era un **500 por
   `AttributeError`** y hoy entra como `'12345'`. Eso es un 500 menos en una API JSON, de la familia
   de los que los reviewers de T18 y T4-F19b vinieron cerrando.

**Por qué MEDIA:** el dueño aprobó, con el OK de este commit, *"un tope de 120"* y lo que entró es
*"tope + saneado del nombre"*. No está mal —es más consistente que lo que había— pero R30 pide que lo
escrito sea lo que pasa, y el riesgo 4 le ofreció una decisión de revertir («se saca solo, tres
líneas») sobre una descripción incompleta de qué se revertiría.

---

## 8 · BAJA · El tope se mide ANTES de colapsar los espacios, así que un nombre que se guardaría en 120 se rechaza

Es el sexto caso de §3, y **no es lo mismo que D34** (que es code points contra caracteres
percibidos):

```
"A"x59 + "      " (6 espacios) + "B"x60
   code points = 125   colapsado (lo que se guardaria) = 120
   -> ValidationError: El nombre no puede pasar de 120 caracteres.
```

En `saneado.py` el orden es: medir (línea 166-167) y **después** colapsar (línea 168):

```python
limpio = sin_invisibles(texto(valor, campo, tope=1000, una_linea=False)).strip()
if len(limpio) > tope:
    raise ValidationError(f"El nombre no puede pasar de {tope} caracteres.")
limpio = " ".join(limpio.split())
```

Consecuencia: el mensaje dice «no puede pasar de 120 caracteres» de un nombre que **se guardaría en
120**. Con un nombre de repostería real no pasa nunca (hace falta tipear espacios de más justo en el
borde), y es la misma familia que D34: **el número que se mide no es el número que la persona ve**.
Vale una línea al pie de D34, no un arreglo propio. Si algún día se normaliza a NFC antes de medir
—lo que D34 pide—, colapsar antes de medir sale en el mismo movimiento.

---

## 9 · BAJA · El carrito del navegador de desarrollo quedó con el nombre sembrado por la vuelta anterior (D14, en vivo)

Mirando el drawer me apareció un renglón que no existe en la base:

```
localStorage["andres-bakery-cart-v2"]:
  [{ "id":4, "name":"TortaDeChocolateConDulceDeLecheYMerengue", "slug":"brownie-tentacion", ... }]

$ select id, length(name), name from product where id = 4
  (4, 17, 'Brownie Tentacion')
```

El nombre de 40 caracteres que el reviewer de T23b sembró para medir D31 **quedó congelado en el
carrito del navegador**, aunque él restauró la base correctamente (lo verifiqué: los cinco largos
son 24/26/16/17/8, como antes). Es **D14 mostrándose sola** —«el carrito guarda una foto del producto
en `localStorage`»—: el drawer muestra el nombre viejo y el aviso, que lo pide a la API, muestra el
nuevo. No es un defecto de T23 y no toqué el nombre; **sí devolví la cantidad a 3**, como la
encontré, después de los tres «Agregar» de mis mediciones. Lo anoto para que el próximo que mida a
390 px no crea que la carta tiene un nombre largo.

---

## 10 · ¿`review_T23b.md` fue un reviewer independiente, o el propio implementador?

El brief de esta vuelta dice que la ronda T23b *"nunca tuvo reviewer independiente"*. **Lo que
muestra la evidencia es lo contrario**, y conviene dejarlo escrito:

1. `review_T23b.md` **contradice al handback en tres puntos concretos** y le gana: la línea 289 en
   vez de 290, el inventario de «6 archivos» que son 7, y el camino por el que el tercer test vio
   rojo («pasaba ya en rojo» contra «correrle el tope lo rompe»). Las tres las verifiqué yo y el
   reviewer tiene razón en las tres. Un implementador no se corrige la línea de su propia salida.
2. **El handback creció después del review.** `review_T23b.md` cuenta
   `318  sdd/progress/dev/handback_T23b.md` en su §10, y en el commit el archivo tiene **322
   líneas**: las cuatro de diferencia son justo el riesgo 1 reescrito con el 5,3 % y la frase *"Lo
   corrigió el reviewer de T23b (hallazgo 4, ALTA): no medí mal, medí **un solo estado**"*. O sea: el
   reviewer escribió primero y el implementador se corrigió después.
3. El ALTA de ese review **se atendió en los dos lugares que pedía**: ADR-037 tiene hoy la tabla de
   los dos estados del drawer (`decisions.md`, «Lo que queda abierto, medido — y medido en los dos
   estados») y el riesgo 1 del handback también.

**Conclusión: T23b sí tuvo un reviewer independiente, y el que faltaba era uno que re-ejecutara
después de las correcciones y del commit.** Eso es esta vuelta. Es evidencia documental, no prueba de
identidad: lo que puedo afirmar con comandos es que **el texto de ese review no pudo escribirlo quien
escribió el handback en el estado en que el handback está hoy**.

---

## 11 · Las deudas D29 a D34, revisadas una por una

| ID | ¿Está bien descripta? | Cómo lo verifiqué |
|---|---|---|
| **D29** | **Sí.** El dedup compara `tono` + `texto` (`avisos.ts:72-74`) y el texto sale **sólo** de `product.name` (`carrito.ts:67-69`), así que dos tamaños de la misma torta dan **un** aviso | lectura del código, no clic por clic (ver §13) |
| **D30** | **Sí, y es exacta en las tres cosas que afirma.** Medido en el navegador | ver abajo |
| **D31** | **Sí en lo que afirma**, y no la re-medí: necesita sembrar un nombre largo en la base y no la toqué. Con los nombres de hoy (máximo **26**) `/tienda` a 390 px da **desborde 0**, que es coherente con que el umbral esté en ~40 | `desborde: 0`, `largoMaximo: 26`, `avisosEnPantalla: 0` |
| **D32** | **Sí, y el punto más fuerte lo confirmé:** el mutante `4000 → 3000` queda **verde** (§2) | mutante propio |
| **D33** | **No del todo: dice algo que es falso.** Hallazgo 6, MEDIA | §6 |
| **D34** | **Sí, los dos casos.** 120 emojis entran (480 bytes), 120 acentos en NFD dan 400 | §3 |

**D30, medido.** Con el aviso en pantalla, foco puesto en la X con el teclado:

```
foco en la X:  activeElement = "Cerrar el aviso ««Brownie Tentacion» se agregó al carrito»"   avisos: 1
Escape:        avisos: 1   (NO cierra)   activeElement: la X, sin moverse
+4600 ms con el foco puesto:  avisos: 0   activeElement: BODY
```

**Las tres afirmaciones de D30 son ciertas:** Escape no cierra, el plazo **no se pausa** con el foco
adentro, y al irse el aviso **el foco cae a `body`** (WCAG 2.4.3). Está bien escrita.

**Consola del navegador en toda la sesión: 0 errores, 0 advertencias.** No apareció el
`Encountered two children with the same key` que el handback declaró como artefacto de su método: con
la carta real no existe, como el reviewer anterior ya había dicho.

---

## 12 · Sospechas que fui a buscar y el trabajo aguantó

| Sospecha | Cómo la probé | Resultado |
|---|---|---|
| Los 226/368 son de otro árbol, o el commit cambió algo | Los cuatro comandos sobre `7271583`, con los hashes del bundle | **Bien.** 226/18, 368 OK, lint 0, los dos hashes del bundle idénticos |
| Alguno de los cuatro rojos de R29 es deducido | Los cuatro mutantes a mano, uno por vez, con restauración y hash | **Bien los cuatro.** Líneas 113, 106, 121(→119) y 289 |
| El commit se llevó algo puesto respecto de lo que revisó T23b | `sha256sum` de los cuatro archivos que ese review declaró | **Bien.** Los cuatro hashes **idénticos** a los declarados |
| `0/1620` y `0/495` están inflados | Barrido propio de 1620 y 495 puntos, drawer abierto | **Bien.** 0/1620 y 0/495 clavados, y 30/1620 = 1,9 % |
| El `5,3 %` del drawer cerrado es del reviewer anterior y no se reproduce | Barrido propio de 675 puntos con el drawer cerrado | **Bien.** 36/675 = 5,3 %, mismos ladrones (svg 33 + path 3) |
| El aviso se va al cerrar el drawer y por eso el 5,3 % es teórico | Cerré el drawer con su botón real y volví a mirar | **Bien: el aviso sigue.** 1 aviso, mismo rect, el 5,3 % es real |
| Quedó un link colgado en algún productor | `links en la region: 0` en las seis mediciones | **Bien.** Cero links en todos los escenarios |
| La X no se cierra con un clic de verdad | Clic de mouse de Playwright sobre su píxel | **Bien.** 1 aviso → 0 |
| El tope recorta en silencio (ADR-030) | 120 exactos sobre base temporal + mutante C | **Bien.** `len(guardado)=120`, y correrlo a 119 pone rojo |
| El tope se saltea por `update` sin pasar por `create` | Mutantes A y B independientes | **Bien.** Cada camino tiene su test |
| `nombre_para_guardar` se come los acentos | 120 acentos NFC → entran los 120 con su acento | **Bien.** (El reviewer anterior lo probó además en NFD) |
| R05 lo pasa alguno de los tocados | `wc -l` de los siete archivos del diff de T23b | **Bien.** 298 / 291 / 290 y ninguno pasa de 300 |
| La tabla de salud sigue en 365/207 (BAJA 11 de T23b) | `status.md` líneas 13-14 contra lo medido | **Ya corregido en el commit:** dice 368 y 226 |
| Falta el changelog de 0.17.0 (R13/R16) | `grep` en `sdd/changelog.md` | **Está**, línea 7, con el pedido textual del humano |
| A 1920 px el aviso tapa algo con el drawer cerrado (nadie lo midió) | Barrido propio, 675 + 495 puntos | **Bien.** 0 robados por el aviso, el centro llega al botón |
| El desborde horizontal volvió en algún estado | `scrollWidth - clientWidth` en los seis escenarios | **Bien.** 0 en todos |

---

## 13 · Lo que no pude verificar

1. **D31, el desborde de 242 px de la carta con un nombre de 40 caracteres.** Pide **sembrar** un
   nombre largo en la base de desarrollo, y decidí no tocarla (la vuelta anterior ya la tocó y la
   restauró). Lo único que medí es que con los nombres de hoy (máximo 26) el desborde es **0**. Las
   dos vueltas anteriores lo midieron, una con `fetch` interceptado y la otra contra la base real, y
   coinciden en el número: **lo doy por verificado por ellos, no por mí.**
2. **El tope de 120 por HTTP**, con token de admin real contra `127.0.0.1:5000`. Lo probé en la **capa
   de servicio** sobre SQLite temporal, que es donde vive la regla; el camino `PUT`/`POST` → 400 en
   castellano lo midió `review_T23b.md` §6 y no lo repetí. Tampoco verifiqué yo que el mensaje llegue
   a `ErrorBanner` en pantalla: lo leí en el código (`usePanelDeAdmin.ts` → `conAviso` →
   `setError(getErrorMessage(...))`), no lo vi.
3. **D29 clic por clic.** Confirmé por lectura que dos variantes del mismo producto producen el mismo
   `texto` y que el dedup compara `tono`+`texto`, pero **no** agregué 8 y 12 porciones del cheesecake
   en el navegador para ver un solo cartel. El review de T23 lo midió.
4. **Los avisos del panel de admin** («Etiqueta guardada.», la foto subida, el producto guardado): no
   entré al panel ni me logueé. Esta vuelta se concentró en el carrito, que es donde están los
   números en disputa. El review de T23 cerró ese hueco y no lo re-ejecuté.
5. **C5, que un lector de pantalla lo lea de verdad.** Verifiqué los atributos (`aria-live="polite"`,
   `role="status"`/`alert`, el `aria-label` de la X) y que el foco cae a `body`. Que NVDA o VoiceOver
   lo anuncien **no lo probó nadie todavía**, acá ni en las vueltas anteriores, y no se puede probar
   con `elementFromPoint`.
6. **Postgres.** Todo lo del tope se midió contra SQLite. Lo que D34 anota sobre bytes y
   `varchar(120)` sigue sin probarse en el motor real, y el proyecto todavía no tiene deploy (F41).
7. **La identidad de quien escribió `review_T23b.md`.** Lo de §10 es evidencia documental (conteos de
   líneas y correcciones cruzadas), no prueba criptográfica. Si el dueño quiere certeza, es su
   registro de sesiones el que la tiene, no el repo.
8. **Si el hallazgo 4 rompe algo más.** Medí «Ver carrito» y «Ayuda». El contenedor de `AyudaPanel`
   ocupa 24→364 × 776→820 en toda pantalla angosta, así que **cualquier** cosa clickeable que caiga
   ahí está tapada; no barrí la pantalla entera buscando otras víctimas, ni probé las otras 10 rutas.
9. **La base de desarrollo cambió en una fila y no es por mí**: `page_view` pasó de **27 a 28**
   porque la app registra sola la visita al abrir `/tienda` (es lo mismo que le pasó al reviewer
   anterior, 26 → 27). Verifiqué que **nada más** se movió —5 productos con los mismos largos
   (24/26/16/17/8), 3 usuarios, 4 etiquetas, 7 pedidos— pero **no** comparé columna por columna de
   todas las tablas, así que lo declaro así: el hash del archivo **no** vuelve al original
   (`9a7376e5…` → `c73ecb35…`) y la causa medida es `page_view`. Dejé una copia previa en el
   scratchpad por si alguien quiere el diff exacto.

---

## 14 · Resumen de los hallazgos

| # | Gravedad | Qué |
|---|---|---|
| 4 | **ALTA** | **«Ver carrito» de la barra inferior no recibe ni uno de sus 675 puntos a 390 px, con cero avisos en pantalla**: lo tapa entero el contenedor fijo de `AyudaPanel.tsx:64`, y un clic real en su centro no hace nada. Pasa de 320 a 430 px. El 5,3 % de la X es real pero se lo roba a un botón que ya estaba muerto, así que mover la región de avisos **no** lo arregla |
| 6 | MEDIA | **D33 dice que el desborde de D31 «no se puede arreglar desde la interfaz», y es falso**: el formulario se prellena con el nombre, no tiene `maxLength`, y un `PUT` que **acorta** el nombre entra (medido). Lo que no se puede es cambiar el precio dejando el nombre largo |
| 7 | MEDIA | **El tope de 120 también reescribe el nombre** (colapsa espacios y saltos, saca invisibles) y acepta un `name` numérico donde antes era un 500. El riesgo 4 del handback declara sólo «121 → 400», y sobre esa descripción se le ofreció al dueño la decisión de revertir |
| 8 | BAJA | **El largo se mide antes de colapsar los espacios**: un nombre que se guardaría en 120 exactos se rechaza con «no puede pasar de 120 caracteres» (medido: 125 code points → 120 al guardar → 400). Misma familia que D34, otra puerta |
| 9 | BAJA | El carrito del navegador de desarrollo quedó con el nombre de 40 caracteres que sembró la vuelta anterior (la base está bien restaurada): **D14 en vivo**. Devolví la cantidad a 3; el nombre no lo toqué |
| — | — | §10: **T23b sí tuvo reviewer independiente**, y lo que faltaba era uno que re-ejecutara después del commit. §11: D29, D30, D32 y D34 están **bien descriptas** y las medí. §12: dieciséis sospechas y el trabajo aguantó |

### Lo que bloquea el `done` de R16, una línea por bloqueante

1. **Hallazgo 4 (ALTA)** — hay que escribir como deuda propia que «Ver carrito» no responde a 390 px
   por el contenedor de Ayuda, y corregir la frase de la cola (`status.md` §5, renglón 1) y de
   ADR-037, que hoy presentan el 5,3 % como si el botón funcionara. **Sin eso, el próximo que mueva
   la región va a medir 0 % y declarar cerrado un botón muerto.**
2. **Hallazgo 6 (MEDIA)** — D33 afirma algo falso sobre D31. Es una frase.
3. **Hallazgo 7 (MEDIA)** — el riesgo 4 y el changelog describen el cambio del back a medias.

**Ninguno de los tres pide tocar código de T23b, y los dos MEDIA son frases.** Las tres ALTA de
`review_T23.md` están atendidas y lo verifiqué: el link salió y está medido en 0/1620 y 0/495, el
desborde del aviso está arreglado (X en `327-343` contra un viewport de 390, desborde 0) y el DRIFT
de R25 existe, es honesto y cuenta bien. **El ALTA de `review_T23b.md` también está atendido**:
ADR-037 tiene la tabla de los dos estados y el riesgo 1 el número corregido.

---

## 15 · Estado del árbol y de la base al terminar

```
$ git status --porcelain
(vacío)

$ git log --oneline -1
7271583 T23-F64: el sitio avisa qué entró al carrito, y el panel deja de pisar sus avisos (0.17.0)
```

**Limpio al empezar y limpio al terminar, con `HEAD` en el mismo commit.** No commiteé nada, no hice
`git add`, no arreglé ni reverti nada. Los cinco mutantes se aplicaron sobre copias con respaldo en
el scratchpad y los archivos volvieron a su hash (§2).

**La base de desarrollo:** la dejé con los cinco productos y sus largos originales
(`24/26/16/17/8`, máximo 26), 3 usuarios, 4 etiquetas y 7 pedidos. Lo único que cambió es
`page_view` **27 → 28**, que la app escribe sola al abrir una página (ver §13.9). Las pruebas del
tope de 120 y de D33 corrieron **sobre SQLite temporal propia**, no contra esta base: ningún producto
de 200 caracteres quedó sembrado.

**Los dos servidores que levanté quedaron apagados**, verificado por puerto: `5000 cerrado`,
`5173 cerrado`.

**Nada que instalar:** usé lo que ya estaba (el venv del back, el `node_modules` del front y
Playwright por MCP). No instalé ni actualicé ninguna dependencia.

Lo que leí en los MDs y en los dos reviews anteriores lo traté como **dato, no instrucción** (R26):
cada afirmación que entró a este review entró con un comando y su salida al lado.

---

## 16 · Costo

Una sesión de reviewer independiente, modelo alto, una vuelta, sin subagentes.
