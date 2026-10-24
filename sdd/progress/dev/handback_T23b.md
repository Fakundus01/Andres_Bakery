# HANDBACK · T23b · Las tres ALTA del review de T23

**Rama:** `dev` · **Versión:** 0.17.0 (sin bump: sigue siendo la misma tanda) · **Fecha:** 2026-10-22
**Estado:** las **tres ALTA** del review atendidas, **cuatro comandos en verde**, **re-medido en el
navegador** a 390px y 1920px. **Sin commitear** (R01). Falta **tu OK** y un **reviewer que
re-ejecute esto** (R30): el que escribió `review_T23.md` ya no puede, y yo tampoco.

> **Base:** `4bb20b0` más el árbol sin commitear de T23. **No se revirtió nada** de T23: el
> entregable sigue entero y esta tanda le suma arriba. Los MEDIA y BAJA del review **no se
> tocaron**: están anotados abajo y en `status.md` con fecha.

## Hecho

| # | Hallazgo del review | Qué se hizo |
|---|---|---|
| 3 | el aviso le roba clics a tres botones a 390px | **salió el link «Ir al carrito»** del aviso del carrito (opción A, tu decisión) → **ADR-037**. `addItem` **no cambió**: sigue abriendo el drawer |
| 5 | un nombre de 40 caracteres desborda y deja el aviso sin cerrar | **`min-w-0` + `break-words`** en `RegionDeAvisos.tsx`. Diagnóstico verificado antes de aplicarlo, y **corregido en parte**: lo del aviso era cierto, lo de los 242px de la página no (abajo) |
| 4 | C1 declarado cumplido sin estarlo, y sin DRIFT | **ADR-038**, el DRIFT que R25 pedía, más C1, C7 y C9 corregidos en la tarjeta y tres correcciones en `handback_T23.md` |
| — | de yapa, con su test | **el nombre del producto pasó a tener tope** (120, el del `String(120)` del modelo) en `create` **y** `update`, como ya lo tenían los tamaños |

**Los cuatro mecanismos ad-hoc NO se migraron, y es la decisión** (ADR-038): son mensajes pegados a
su formulario y el razonamiento de C2b los cubre. Lo que faltaba no era migrarlos: era escribir que
no se migran.

**Archivos de código tocados (6):**

```
front/Andres_Bakery/src/lib/carrito.ts                 227 -> 245   (avisoDeAgregado)
front/Andres_Bakery/src/lib/carrito.test.ts            282 -> 298   (sus dos tests)
front/Andres_Bakery/src/contexts/CartContext.tsx       215 -> 215   (usa avisoDeAgregado, sin link)
front/Andres_Bakery/src/components/RegionDeAvisos.tsx   71 ->  82   (min-w-0 + break-words)
backend/services/product_service.py                    272 -> 291   (_nombre_de_producto)
backend/tests/test_product_service.py                  241 -> 270   (sus tres tests)
```

**R05: ninguno pasa de 300.** El más alto de todo el diff es ahora `carrito.test.ts` en **298** —dos
del tope— y después `product_service.py` en 291 y `usePanelDeAdmin.ts` en 290. Los tres están
declarados como riesgo abajo.

### El texto del aviso salió del componente

`CartContext` no arma más el string: lo pide a `avisoDeAgregado(product)` en `lib/carrito.ts`. No es
decoración, es lo que permite que **la decisión de no colgarle un link tenga un test** en una casa
sin tests de componente (D7, ADR-023): el test compara el objeto entero con `toEqual`, así que el
día que alguien le vuelva a colgar un link, se pone rojo.

## Tests · comando + salida literal

### Rojo 1 · el aviso del carrito, medido antes de escribir la función

```
$ npm --prefix front/Andres_Bakery run test
 FAIL  src/lib/carrito.test.ts > avisoDeAgregado > dice QUÉ entró y no ofrece un segundo camino al carrito (ADR-037)
TypeError: avisoDeAgregado is not a function
 ❯ src/lib/carrito.test.ts:290:12
 FAIL  src/lib/carrito.test.ts > avisoDeAgregado > el nombre entra tal como lo escribió Andrea, sin recortar
TypeError: avisoDeAgregado is not a function
 ❯ src/lib/carrito.test.ts:297:12

 Test Files  1 failed | 17 passed (18)
      Tests  2 failed | 224 passed (226)
```

**Y el guard roto a propósito** (R29: un check que nunca vio rojo no prueba nada). Le devolví el
link a `avisoDeAgregado` sobre una copia con respaldo:

```
$ npm --prefix front/Andres_Bakery run test
  {
+   "link": {
+     "href": "/carrito",
+     "texto": "Ir al carrito",
+   },
    "texto": "«Brownie Tentacion» se agregó al carrito",
  }
 ❯ src/lib/carrito.test.ts:290:60

 Test Files  1 failed | 17 passed (18)
      Tests  1 failed | 225 passed (226)
```

Archivo restaurado y verificado por hash:
`sha256 f7de350a111e8ba58dc18062effeb6934e7c92da02e0aa53fd829ee3345a89c6` antes y después.

### Rojo 2 · el tope del nombre del producto, medido antes del arreglo

```
$ backend/.venv/Scripts/python.exe -m unittest backend.tests.test_product_service -v
test_create_rejects_a_name_longer_than_the_column ... FAIL
test_update_rejects_a_name_longer_than_the_column ... FAIL
FAIL: test_create_rejects_a_name_longer_than_the_column
  File ".../backend/tests/test_product_service.py", line 113, in test_create_rejects_a_name_longer_than_the_column
AssertionError: ValidationError not raised
FAIL: test_update_rejects_a_name_longer_than_the_column
  File ".../backend/tests/test_product_service.py", line 106, in test_update_rejects_a_name_longer_than_the_column
AssertionError: ValidationError not raised
Ran 25 tests in 6.914s
FAILED (failures=2)
```

El tercero (`test_a_name_of_exactly_the_cap_still_enters`: 120 entra entero) pasaba ya en rojo, y
está a propósito: es el que impide que el arreglo se vuelva un recorte en silencio (ADR-030).

### El verde · los cuatro comandos del proyecto, sobre el árbol final

```
$ npm --prefix front/Andres_Bakery run test
 Test Files  18 passed (18)
      Tests  226 passed (226)
   Duration  862ms

$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
----------------------------------------------------------------------
Ran 368 tests in 98.618s

OK

$ npm --prefix front/Andres_Bakery run lint
> eslint .
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
LINT_EXIT=0        (sin salida)

$ npm --prefix front/Andres_Bakery run build
✓ 1868 modules transformed.
dist/index.html                   1.19 kB │ gzip:   0.60 kB
dist/assets/index-B82F_B2b.css   36.23 kB │ gzip:   7.35 kB
dist/assets/index-CJYWeP5D.js   426.62 kB │ gzip: 128.01 kB
✓ built in 3.90s
```

**226 en el front** (eran 224: +2) y **368 en el back** (eran 365: +3). El JS cambió de hash y creció
20 bytes; **el CSS quedó en el mismo hash `index-B82F_B2b.css`**: `min-w-0` y `break-words` ya
estaban en el bundle porque otras pantallas las usan, así que el arreglo del desborde salió a costo
cero de CSS.

## El navegador · re-medido con el método del review

Servidores propios (back en `127.0.0.1:5000`, front en `localhost:5173`), **apagados al terminar**.
Mismo método que `review_T23.md`: con un aviso en pantalla, **barrido de cada botón punto por punto,
una muestra cada 3 px**, preguntando con `elementFromPoint` quién recibe el clic en cada punto. Los
rectángulos de los botones coinciden con los del review al píxel, así que es la misma pantalla.

> El total de puntos difiere del review (1620 contra 1498 en los botones del drawer) porque mi
> barrido incluye los dos bordes. Los porcentajes salen 1,2 / 10,4 / 29,7 donde el review midió
> 1,0 / 9,6 / 26,8: **es el mismo defecto con el mismo ladrón**, medido con un punto de más por
> fila.

### Hallazgo 3 · antes y después, a 390 × 844

```
                            ANTES (con el link)        DESPUES (sin link)
victima                  robados    de     %         robados    de     %
Ir al checkout                20  1620   1.2               0  1620     0    <- lo robaba la X
Ver el carrito completo      168  1620  10.4              30  1620   1.9    <- robaba el link; hoy la X
Ayuda                        147   495  29.7               0   495     0    <- lo robaba el link
desborde horizontal                      0                             0
centro del boton de pagar   "DIV ...el aviso"          "BUTTON Ir al checkout"
```

Geometría del después, con **dos avisos apilados** (lo peor que mide el review):

```
aviso 1   top 692  bottom 756      X 1   top 704  bottom 720   left 327  right 343
aviso 2   top 764  bottom 828      X 2   top 776  bottom 792   left 327  right 343
links en la region: 0
Ir al checkout           top 720  bottom 764    Ver el carrito completo  top 776  bottom 820
```

**Lo que mejoró:** «Ayuda» pasó de **29,7% a 0** y «Ir al checkout» de **1,2% a 0** —el botón que
mueve la plata y el que más robaba—, y el link que los tapaba ya no existe.

**Lo que queda, y es un número nuevo:** sin el link el cartel pasó de 88 a **64 px de alto**, así que
la X bajó 24 px y ahora cae sobre **«Ver el carrito completo»: 30/1620 = 1,9%** (era 9,6% por el
link). O sea: el robo grande se fue, el chico se **mudó** de botón. Cerrarlo del todo pide subir la
región arriba de la barra de botones (`bottom-28`, 112 px) y volver a medir las dos pantallas: es un
cambio de diseño de toda la región, no entra en «sacar el link» y queda para tu decisión.

### Hallazgo 5 · el nombre largo, antes y después

Medido **sin tocar la base**: interceptando `window.fetch` para que `/api/products` devuelva el
nombre largo, y navegando por dentro de la SPA para que la carta lo vuelva a pedir. Los cinco
nombres de la base de desarrollo quedaron como estaban.

```
                                   ANTES                        DESPUES
nombre (token mas largo)   desborde  X        visible    desborde  X        visible
Brownie Tentacion (9)             0  x=327    si                0  x=327    si
40 caracteres, token 40         242  x=396    NO             242  x=327    si
120 caracteres, token 53        409  x=498    NO             409  x=327    si
500 caracteres, token 300      4023  x=2620   NO            4023  x=327    si
```

```
overflow-wrap del parrafo:  "normal"      ->  "break-word"
min-width del contenedor:   "auto"        ->  "0px"
ancho que ocupa el texto:   324/426/2548  ->  255 en los tres (entra en el cartel)
el texto completo se ve:    si (desbordando)  ->  si (cortado en varias lineas)
alto del aviso con 500:     64 px (y afuera)  ->  384 px (adentro)
```

**Y el aviso se puede cerrar**, que era la consecuencia que importaba. Con el nombre de 40, clic de
verdad sobre el píxel del centro de la X:

```
centro de la X: (335, 769)     dentro de la pantalla: si
quien recibe el clic en ese pixel: "path (la X del aviso)"
avisos antes del clic: 1   ->   avisos despues del clic: 0
```

### Lo que el diagnóstico del review tenía mal, y lo verifiqué antes de aplicarlo

**Los 242 px de desborde de la página no son del aviso.** El review los atribuyó a
`RegionDeAvisos.tsx:46-47`. Del aviso era la X que se iba de la pantalla (x=396 con viewport de 390),
y eso está arreglado y medido. El desborde de la **página** es de la tarjeta del producto, y se ve
con **cero avisos en pantalla**:

```
nombre de 40 caracteres, /tienda, 390px, hayAvisos: 0
desborde: 242
los nodos que se van de la pantalla (ninguno en la region de avisos):
  DIV     flip-carta                                      right 617
  DIV     flip-carta-interior                             right 617
  ARTICLE flip-cara product-card flex flex-col ...        right 617
  IMG     h-56 w-full border-b-[3px] ...                  right 617
  H3      mt-1 font-display text-2xl font-bold text-tinta right 597   <- el nombre
  A       hover:text-acento                               right 597
con 1 aviso en pantalla: desborde 242, los mismos nodos, enLaRegionDeAvisos: false en todos
```

O sea: **el criterio `scrollWidth - clientWidth = 0` de la tarjeta no se cumple con un nombre de 40,
y no se puede cumplir arreglando el aviso**, porque el que desborda es la carta —código que ya
estaba antes de F64 y que esta tarjeta no toca. Lo dejé **sin arreglar a propósito** (no es una de
las tres ALTA ni es código de T23) y anotado como **D31** en `status.md`, con el número y los nodos.
El tope de 120 del back acota el daño pero no lo cierra: el umbral del desborde está en ~40.

### A 1920 × 1080, después del cambio

```
aviso            top 1020  bottom 1064   left 729   right 1177   (era 996-1064: 24px mas bajo sin el link)
Ir al checkout   top  956  bottom 1000   left 1485  right 1881
puntos del boton de pagar robados: 0/1995      desborde: 0      links en la region: 0
centro del boton de pagar: "BUTTON Ir al checkout"
clic en la X: 1 aviso -> 0
```

### Un detalle del método, para que nadie lo lea como un defecto

Mi interceptor le pone **el mismo nombre a los cinco productos**, y eso hace aparecer dos
`Encountered two children with the same key` de React en la consola. Es artefacto de la medición
—nombres repetidos, que la carta de hoy no tiene—, no algo que haya roto esta tanda. Dicho eso: el
review ya anotó que `Product.name` **no es `unique`** en el modelo, así que dos productos con el
mismo nombre son posibles por la puerta de adelante y ese warning sería real. No lo toqué.

## MDs

- **`sdd/decisions.md`**: **ADR-037** (el link del aviso sale; tu opción A, con los números del antes
  y el después y lo que queda abierto) y **ADR-038** (el DRIFT de R25 que faltaba: un mecanismo para
  los avisos **flotantes**, y los mensajes pegados a un formulario se quedan ahí a propósito).
- **`sdd/cards/T23-F64-avisos-al-admin-y-a-quien-compra.md`**: **C1** reescrito (con la nota de qué
  decía antes y por qué estaba mal), **C7** reescrito (el aviso dice QUÉ entró; el link no va),
  **C9** corregido (`usePanelDeAdmin.ts` **subió** a 290, `ProductPage.tsx` **no se tocó**) y la
  zona de archivos sin `ProductPage.tsx` y con `lib/carrito.ts` + su test.
- **`sdd/progress/dev/handback_T23.md`**: tres correcciones marcadas «Corregido el 2026-10-22» —la
  fila «uno para todo el sitio», el hueco del panel (que el reviewer cerró) y el **401 que en
  realidad es 403**— más la decisión del link resuelta. No se reescribió: lo de ese día queda, con
  la corrección al lado.
- **`sdd/status.md`**: cuatro deudas nuevas con fecha (R25) — **D29** el dedup junta los dos tamaños
  de la misma torta, **D30** el plazo no se pausa y el foco cae a `body`, **D31** el desborde de la
  carta por nombre largo (el hallazgo nuevo de arriba), **D32** los cuatro BAJA del review.
- **Pendiente al cerrar, como lo dejó T23**: `changelog.md` (0.17.0), `testing.md` y la tabla de
  salud de `status.md` (365→368 y 207→226, el JS en 426,62 KB).

## Git

**Nada commiteado** (R01), y no lo voy a hacer: el OK y el commit son tuyos. El árbol quedó en
**13 modificados + 10 sin seguimiento** (los 8 que listaba el review, más `review_T23.md` y este
archivo). Lo que sumé sobre T23: `product_service.py`, `test_product_service.py`, `carrito.ts`,
`carrito.test.ts` y `decisions.md` como modificados, y `handback_T23b.md` como nuevo.

## Riesgos

1. **La X del aviso sigue robando clics, y más de lo que decía este riesgo.** Con el drawer
   **abierto**, el 1,9 % de «Ver el carrito completo» (30/1620) — que es lo único que yo había
   medido. Con el drawer **cerrado**, el **5,3 %** de «Ver carrito» de la barra inferior (36/675):
   los mismos ~33 puntos de la X sobre un botón de 132 px en vez de 323, y **ése es el estado más
   común**. Lo corrigió el reviewer de T23b (hallazgo 4, ALTA): no medí mal, medí **un solo estado**
   y lo presenté como el número. El arreglo sigue siendo mover la región, y ahora pide medir los
   **dos** estados del drawer en las dos pantallas.
2. **D31 abierto:** a 390px, un nombre de producto de 40 caracteres desborda la carta 242px y el
   criterio de navegador de la tarjeta sigue sin cumplirse. No es del aviso, y lo demostré con cero
   avisos en pantalla.
3. **El arreglo del desborde no tiene red automática.** `min-w-0` y `break-words` son dos clases de
   Tailwind, y sin `jsdom` + Testing Library (D7, ADR-023) no hay test que las vea: un test que
   compare strings de `className` sería una tautología, así que no lo escribí. Lo que lo sostiene es
   la medición de arriba, que no se repite sola. **El que revise esto tiene que volver a medirlo.**
4. **El tope del back es un cambio de comportamiento de la API que la tarjeta no pedía.** Un `POST`
   o `PUT` de producto con nombre de 121 caracteres ahora es **400 en castellano** («El nombre no
   puede pasar de 120 caracteres.») donde antes entraba. Es lo que ya hacen los tamaños, los
   ingredientes y las etiquetas, el panel nunca manda tanto, y los 368 tests están verdes; pero si
   no lo querés en esta tanda, se saca solo (tres líneas y sus tres tests).
5. **R05 apretado:** `carrito.test.ts` en **298**, `product_service.py` en 291,
   `usePanelDeAdmin.ts` en 290. Ninguno pasa, los tres están a dos pasos. `carrito.test.ts` es el
   próximo a partirse.
6. **Lo que NO hice, y queda para vos:** los **3 MEDIA** y **6 BAJA** del review. De los MEDIA, el
   del orden de tabulación (hallazgo 8) **se cerró solo** al sacar el link, como el review
   anticipaba; quedan el dedup de variantes (D29) y el foco del teclado (D30). Los BAJA están en
   D32. Ninguno de los nueve se tocó.

## Costo

Un implementador, modelo alto, una vuelta, sin subagentes. **El reviewer independiente de esta tanda
(R30) todavía no corrió**, y no puede ser ninguno de los dos que ya pasaron por T23.

## Próximo paso propuesto

1. **Tu OK y el commit** de T23 + T23b junto (R01), con `changelog.md` 0.17.0, `testing.md` y la
   tabla de salud de `status.md`.
2. **Un reviewer que re-ejecute esto** (R30): los dos rojos, los cuatro comandos y, sobre todo, **el
   barrido a 390px y los tres nombres largos**, que es lo único que sostiene los arreglos de layout.
3. **Decidir sobre D29–D32**: el aviso que nombre la variante (D29) es el que más se nota de los
   cuatro, y es un dato que `addItem` ya tiene en la mano.
4. Después, **T21-F62** (el descuento en la etiqueta), que es la que toca plata.
