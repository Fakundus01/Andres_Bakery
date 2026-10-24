# REVIEW · T24 · El botón «Ver carrito» estaba muerto en celular

**Veredicto: `CHANGES_REQUESTED`** — 3 ALTA, 2 MEDIA, 3 BAJA. **Ninguna pide cambiar el código.**

**Rama:** `dev` · **Base:** `0758e55` · **Fecha:** 2026-10-24 · **Rol:** reviewer independiente (R30)
**Reviewer:** no implementé nada de T24. Escribo **sólo** este archivo.

> **El arreglo está bien y lo re-ejecuté entero.** `675/675 → 15/675`, el centro llega al botón en
> los seis anchos, el clic real abre el drawer, Ayuda sigue usable, los cuatro comandos dan los
> números declarados y los tres `sha256` del código son los que el handback declaró. **Lo que pido
> corregir son MDs y el handback, no `.tsx`.**

**Las tres ALTA, en una línea cada una:**

1. **El DRIFT 2 acusa en falso al reviewer anterior.** Sus `570/330` y los `540/300` del handback
   son **los dos correctos**: medidos en estados distintos de la pantalla (un aviso vs cero avisos).
   Reproduje **las nueve filas** de `review_T23c.md` exactamente, con un aviso.
2. **El piso de `15/675` no es «el borde del layout»:** son 15 puntos en **una sola columna**, en
   `x = rect.right`, que **no está sobre el botón**. El residual real es **0/660 = 0 %**, y el
   `51/675 = 7,6 %` que queda como número de referencia para la próxima tarjeta es **36/660 = 5,45 %**.
3. **`current.md` volvió a mentir en el mismo commit en que se escribió la lección de no mentir**, y
   cita un **DRIFT 3** que no existe.

---

## 0 · Git, al empezar y al terminar

```
AL EMPEZAR
$ git log --oneline -1
0758e55 T24: el botón «Ver carrito» estaba muerto en celular, 675/675 (0.17.1)

$ git status --porcelain
(vacío)
```

```
AL TERMINAR
$ git log --oneline -1
0758e55 T24: el botón «Ver carrito» estaba muerto en celular, 675/675 (0.17.1)

$ git status --porcelain
(vacío)
```

**Mismo hash, árbol limpio, ni un `git add`.** Este archivo aparecerá como `?? sdd/progress/dev/review_T24.md`
en cuanto lo mires de nuevo.

**Diferencia con el handback, que conviene registrar:** el handback declara base `7271583` y el
árbol sin commitear. Hoy **todo eso está commiteado** en `0758e55`, que es mi base. Reviso el árbol
commiteado, no el que el handback describe.

### Lo que toqué y restauré

Para ver los rojos de R29 tuve que modificar archivos. Los restauré y lo verifiqué por hash:

```
$ sha256sum  (al terminar, los cuatro)
1ca0fedd20c13dd7020b4dda03a616a0385c09918ccbe00d52634b897982c764 *src/layout/AppShell.tsx
4d22349274a661e6c72a87d5e00eca921c93162bcbc95c15a6a2e412fa503bbf *src/lib/capasFijas.ts
5e4b1258e83ef35d06cd730aa980ca2152d477ddeabab89aa41a1e3c83056589 *src/lib/capasFijas.test.ts
b80708eb571d65931e496b8bcb0c43fcd34845aaad8a2a5c400d97d160ebe3a4 *src/components/AyudaPanel.tsx
```

Los tres últimos son **idénticos a los que el handback declaró** en su §1. `wc -l`: **154 / 94 / 72**,
también los declarados. Y `git status --porcelain` vacío al terminar.

**La medición del estado PRE-arreglo la hice sin tocar un archivo**: le saqué `pointer-events-none`
al contenedor **en el DOM vivo**. Es fiel porque `pointer-events: auto` es el valor por defecto, así
que quitar la clase del contenedor deja exactamente el árbol de antes; y lo confirma el resultado,
que reprodujo `675/675` con **un solo ladrón** y el desglose por ladrón del handback al punto
(`525 + 15` a 430 px, `285 + 15` a 480 px). Está en «Lo que no pude verificar» #4 igual.

### La base de desarrollo

```
$ sha256sum instance/bakery.db   (al empezar)
4da5c6c83fa129724fc6940b7544a4b11aec91920c9d9d86143fadd6d08d740a
```

Es **el hash con que el handback la dejó** (`c73ecb35… → 4da5c6c8…`), y `page_view` id 28 estaba en
**8**, el valor restaurado. Copia previa al scratchpad antes de levantar nada. Mis ~70 cargas de
página la movieron a 80; la devolví a 8 y el diff tabla por tabla, fila por fila:

```
tablas: 19
TABLAS CON ALGUNA FILA DISTINTA: NINGUNA - fila por fila como la encontre
```

**Servidores apagados** (los dos que levanté yo):

```
back 5000: caido
front 5174: caido
```

---

## 1 · La medición, re-ejecutada entera

Mismo método: barrido cada 3 px con `document.elementFromPoint`, `<=` en los dos ejes, más clics
**reales** de mouse (`page.mouse.move/down/up`, no `.click()` de JS). `/tienda`.

### 1.1 · ANTES · el fallo reproducido

```
viewport: innerWidth=390 innerHeight=844 clientWidth=375 · avisos=0 · drawer=false · desborde=0
clase del contenedor: "fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]"

«Ver carrito» rect 219-351 x 776-820
    robados 675/675
    ladrones: DIV · fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))] x675
    centro (285,798) lo recibe: DIV · fixed bottom-6 left-6 …   esElBoton=false
«Ayuda»       rect  24-122 x 776-820
    robados 0/495 · centro (73,798) esElBoton=true
```

**675 de 675, un solo ladrón, y es el contenedor de Ayuda.** Idéntico al handback §2.1.

### 1.2 · DESPUÉS · los seis anchos que el handback declara

```
 w   clientWidth  rect de «Ver carrito»      robados   centro       esElBoton  Ayuda   desborde
320      305        149-281 x 761-805        15/675   (215,783)        sí      0/495      15 (D21)
360      345        189-321 x 776-820        15/675   (255,798)        sí      0/495       0
390      375        219-351 x 776-820        15/675   (285,798)        sí      0/495       0
430      415        259-391 x 776-820        15/675   (325,798)        sí      0/495       0
480      465        309-441 x 776-820        15/675   (375,798)        sí      0/495       0
1920    1905      1749-1881 x 1012-1056      15/675  (1815,1034)       sí      0/495       0
```

**`675/675 → 15/675` en los cinco anchos del rango muerto y el centro llega al botón en los seis.
El contenedor de Ayuda desapareció de la lista de ladrones en todos. Confirmado.** Los `rect`
coinciden al píxel con los del handback, y el `desborde=15` a 320 px es D21, que ya estaba.

### 1.3 · El clic real de mouse

```
clic REAL de mouse en (285,798) = centro de «Ver carrito»  (mouse.move + down + up)
  antes:   drawer=false
  despues: drawer=true          <- el botón abre el carrito
```

**Confirmado.** Y en el estado PRE-arreglo, Playwright se niega igual que en el handback:

```
<div class="fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]"> intercepts pointer events
```

### 1.4 · Los dos estados del drawer, con un aviso (ADR-037 re-medido)

```
=== 390 · UN AVISO · DRAWER CERRADO
  «Ver carrito»  36/675 robados por RegionDeAvisos  ·  ladrones: svg x33 | path x3   (la X)
                 51/675 en el barrido total (36 la X + los 15 del borde derecho)
=== 390 · UN AVISO · DRAWER ABIERTO
  «Ver el carrito completo»  30/1620 robados por RegionDeAvisos  ·  svg x30
```

**Los números de ADR-037 están clavados: `36/675 = 5,3 %` con el drawer cerrado y `30/1620 = 1,9 %`
con el drawer abierto.** El arreglo de T24 no los movió, que es lo que el handback afirma.

---

## 2 · Que Ayuda siga usable · todo con clics REALES de mouse

```
paso                                                           panel  faq  form  campos
0 · estado inicial                                             false  0/0  false  -
1 · clic REAL (73,798) «Ayuda»                                 true   0/4  false  -
2 · clic REAL en el summary del 1er FAQ                        true   1/4  false  -
3 · clic REAL en el summary del 3er FAQ                        true   2/4  false  -
4 · clic REAL (187,726) «Escribir por mail»                    true   2/4  true   los 3 vacíos
    (elementFromPoint en ese punto: BUTTON·btn-secondary w-full justify-center)
5 · texto escrito con el TECLADO tras clic REAL en el campo    true   2/4  true   ver abajo
6 · clic REAL (317,252) la X «Cerrar ayuda»                    false  0/0  false  -
    (elementFromPoint en ese punto: path, dentro del svg de la X)
```

Los tres campos, escritos de verdad con el teclado:

```
Tu nombre   = "Reviewer R30"
Tu email    = "reviewer@ejemplo.test"
Tu consulta = "Comprobando que el panel sigue usable despues de T24."
```

**El botón «Enviar consulta» existe en `39-332 x 703-747` y NO lo apreté** (manda un mail de verdad).

Y con el panel de Ayuda **abierto**, el carrito sigue vivo:

```
panelRect  24-364 x 224-764   ·   botonRect  219-351 x 776-820
robados 15/675 · centro (285,798) · esElBoton=true · ladrones: DIV·pixel-panel p-5 x15
```

**Arreglar esto no rompió Ayuda.** El panel scrollea (`scrollHeight 728 > clientHeight 540`) y con el
panel abierto no tapa el botón: ocupa `224 → 764` y el botón está en `776 → 820`.

**Consola del navegador: 0 errores y 0 advertencias** del sitio. Los errores que había en la sesión
eran de **otros orígenes** (`localhost:3000` de un Next, `:5173`, `:3220`), ninguno de esta app.

---

## 3 · El guard, roto a propósito, y hasta dónde llega

Rompí el guard de **dos formas distintas de las dos del implementador** (él sacó la clase del
componente y debilitó el regex a `includes`), para no repetir su experimento.

### Rojo 1 · una capa fija nueva con fuga, en un archivo que el guard nunca había marcado

Sembré en `src/layout/AppShell.tsx:53` un `<div className="fixed bottom-24 right-6 z-30 w-72">`:

```
$ npm --prefix front/Andres_Bakery run test
AssertionError: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "layout/AppShell.tsx:53 <div> \"fixed bottom-24 right-6 z-30 w-72\" — contenedor fixed sin pointer-events-none",
+ ]

 ❯ src/lib/capasFijas.test.ts:70:68

 Test Files  1 failed | 18 passed (19)
      Tests  1 failed | 233 passed (234)
TEST_FRONT_EXIT=1
```

**El guard no cuida sólo `AyudaPanel`: cuida el proyecto, y dice archivo, línea y clase.** ✓

### Rojo 2 · le rompo la lectura de las fuentes, para ver si se da cuenta de que dejó de mirar

Cambié el glob a un patrón que no matchea nada (`"../**/*.NO-EXISTE-tsx"`):

```
$ npm --prefix front/Andres_Bakery run test
AssertionError: expected 0 to be greater than 0
 ❯ src/lib/capasFijas.test.ts:69:26
     68|     // Si esto da 0, el barrido se rompió y el test no estaría proband…
     69|     expect(capas.length).toBeGreaterThan(0);
       |                          ^

 Test Files  1 failed | 18 passed (19)
      Tests  1 failed | 233 passed (234)
TEST_FRONT_EXIT=1
```

**El `expect(capas.length).toBeGreaterThan(0)` se gana el lugar: el guard no puede dejar de mirar en
silencio.** Es lo mejor que tiene este test y lo digo con la salida. ✓

### Y la pregunta que el handback declara y no contesta

> *«prueba la declaración, no la geometría»* — ¿hay hoy alguna otra capa fija que el guard apruebe y
> que igual tape algo?

**Sí, una, y es la que ya está declarada abierta.** Barrí **todas** las capas `position: fixed` vivas
y, para cada una, qué clickeable pierde puntos por ella, en tres estados a 390 px:

```
(a) SIN AVISOS, DRAWER CERRADO
    ninguna capa fixed le roba un solo punto a nada.          <- el arreglo, limpio

(b) UN AVISO, DRAWER CERRADO
    DIV·pointer-events-none fixed inset-x-0 bottom-0 (RegionDeAvisos)
        «Ver carrito»  36/675   por  svg x33 | path x3        <- la X: el 5,3 % abierto
    BUTTON·btn-primary fixed bottom-6 right-6 (el botón del carrito)
        «Cookies New York»  8/690                             <- legítimo: está dibujado ahí
    DIV·pointer-events-none fixed bottom-6 left-6 (AyudaPanel)
        «Cookies New York»  29/690  por  BUTTON·btn-secondary pointer-events-auto
                                                              <- legítimo: es el botón de Ayuda

(c) DRAWER ABIERTO
    DIV·fixed inset-0 z-50 bg-tinta/30 (el velo)  tapa todo   <- a propósito, es un modal
    RegionDeAvisos: «Ver el carrito completo» 30/1620 por svg x30
```

**La respuesta medida:** `RegionDeAvisos.tsx:29` **pasa el guard** (tiene `pointer-events-none`) y
sigue robando **36/675 de «Ver carrito»** a través de un descendiente con `pointer-events-auto`. No
es nuevo —es el 5,3 % de ADR-037— pero es la demostración de que **el guard aprobando un archivo no
dice nada sobre lo que tapan sus hijos con `pointer-events-auto`**. Las otras dos (el botón del
carrito y el de Ayuda sobre la carta «Cookies New York») **son legítimas**: están dibujadas ahí y el
usuario las ve.

**Y lo que buscaba el encargo —otras víctimas del contenedor de Ayuda— no hay ninguna.** Ver §4.

---

## 4 · Las otras víctimas, que el implementador declaró no haber buscado

Barrí, en el estado PRE-arreglo, **todo** clickeable (`button, a[href], input, select, textarea,
summary, [role=button], [tabindex]`) cuyo rect cruza la caja del contenedor, en **las 13 rutas** de
`AppShell.tsx` a 390 px, y en **6 rutas × 3 anchos** más:

```
390 px · 13 rutas (/, /tienda, /historia, /cv, /cuenta, /configuracion, /carrito,
                   /checkout, /pedidos, /admin, /ingresar, /registro, /producto/:slug)
  contenedor 24-364 x 776-820
  víctimas en TODAS: «Ver carrito» 219-351 x 776-820 roba 675/675, el centro lo recibe Ayuda
  y NINGUNA otra.

320 px · 6 rutas · contenedor 24-296 x 761-805 → sólo «Ver carrito» 675/675
360 px · 6 rutas · contenedor 24-336 x 776-820 → sólo «Ver carrito» 675/675
430 px · 6 rutas · contenedor 24-364 x 776-820 → sólo «Ver carrito» 525/675
```

**«Ver carrito» era la única víctima, en todas las rutas y en los cuatro anchos angostos.** El punto
1 de «Lo que NO se verificó» del handback queda **cerrado, y a favor del arreglo**: no había otras
capas muertas que nadie hubiera notado. Es un hallazgo que no encontró nada, y lo digo con la misma
evidencia con la que diría que encontró algo.

Verifiqué además las dos limitaciones que el handback declara, y **hoy no muerden**:

```
$ grep -rn "position:\s*fixed" src --include=*.css     ->  (nada)
$ grep -rn "clsx\|classNames(" src --include=*.tsx     ->  (nada)
```

---

## 5 · Los cuatro comandos de `harness.config.json`

```
$ npm --prefix front/Andres_Bakery run test
 Test Files  19 passed (19)
      Tests  234 passed (234)
TEST_FRONT_EXIT=0

$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
Ran 368 tests in 93.888s
OK
EXIT=0

$ npm --prefix front/Andres_Bakery run lint
> npm run lint:eslint && npm run typecheck
> eslint .
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
LINT_EXIT=0

$ npm --prefix front/Andres_Bakery run build
> tsc -b && vite build
vite v7.3.7 building client environment for production...
✓ 1868 modules transformed.
dist/index.html                   1.19 kB │ gzip:   0.60 kB
dist/assets/index-DywBBMqZ.css   36.28 kB │ gzip:   7.35 kB
dist/assets/index-DFNjbxcP.js   426.68 kB │ gzip: 128.02 kB
✓ built in 3.21s
BUILD_EXIT=0
```

**Declarado: 234 front, 368 back, lint 0, build OK. Medido: 234/19, 368, 0, OK — y los dos hashes del
bundle son exactamente `index-DywBBMqZ.css` 36,28 kB e `index-DFNjbxcP.js` 426,68 kB, con los mismos
1868 módulos.** Los cuatro, verdes y con los números declarados. ✓

Y después de restaurar lo que rompí, la suite vuelve a **234/234**.

---

## 6 · Los dos números en disputa · los DOS tienen razón

El handback (DRIFT 2) declara que `review_T23c.md` se equivocó: dice `570/675` a 430 px y `330/675`
a 480, y que midiendo da **540** y **300**. **Medí los dos, y el DRIFT 2 está mal.**

### Con cero avisos en pantalla

```
 w    rect              robados   ladrones
320   149-281 x 761-805  675/675  Ayuda x675
360   189-321 x 776-820  675/675  Ayuda x675
390   219-351 x 776-820  675/675  Ayuda x675
430   259-391 x 776-820  540/675  Ayuda x525 | DIV·pixel-panel p-5 x15
480   309-441 x 776-820  300/675  Ayuda x285 | DIV·pixel-panel p-5 x15
520   349-481 x 776-820   90/675  Ayuda x75  | DIV·pixel-panel p-5 x15
560   389-521 x 776-820   15/675  DIV·pixel-panel p-5 x14 | DIV·grid gap-4 x1
640   469-601 x 776-820   15/675  MAIN x15
768   597-729 x 1012-1056 15/675  MAIN x15
```

**Da 540 y 300: los números del handback.**

### Con UN aviso en pantalla y el drawer cerrado

```
 w    rect              robados   ladrones                                      review_T23c
390   219-351 x 776-820  675/675  Ayuda x639 | svg x33 | path x3                  675/675  ✓
430   259-391 x 776-820  570/675  Ayuda x525 | svg x27 | path x3 | DIV x15        570/675  ✓
480   309-441 x 776-820  330/675  Ayuda x285 | svg x27 | path x3 | DIV x15        330/675  ✓
520   349-481 x 776-820  120/675  Ayuda x75  | svg x24 | path x6 | DIV x15        120/675  ✓
560   389-521 x 776-820   45/675  svg x27 | path x3 | DIV x15                      45/675  ✓
640   469-601 x 776-820   45/675  svg x24 | path x6 | MAIN x15                     45/675  ✓
768   597-729 x 1012-1056 15/675  MAIN x15                                         15/675  ✓
```

**Las nueve filas de `review_T23c.md` se reproducen exactamente — con un aviso en pantalla.**

### La aritmética, y de dónde salen los 30 de diferencia

La diferencia es **+30 constante en 430, 480, 520, 560 y 640, y 0 en 320/360/390 y en 768**. Son **la
X del aviso**: `svg 27 + path 3 = 30`, visible en la columna de ladrones de cada fila. Desaparece a
768 px porque la región de avisos es `inset-x-0 ... items-center` con el cartel en `max-w-md`: en
pantalla ancha el cartel se **centra** y su X deja de caer sobre el botón de abajo a la derecha
(a 1920 px la X está en `1145-1161` y el botón en `1749-1881`). A 320/360/390 no se nota porque el
contenedor de Ayuda ya roba **los 675**, y no hay nada más que robar.

El handback razona así: *«a 430 el botón va de 259 a 391 y las columnas que caen en ≤364 son 36, por
15 filas = 540»*. **La cuenta llega al total correcto por el camino equivocado:** medido, el
contenedor de Ayuda roba **525 = 35 columnas** (las de `x < 364`, porque `364` es el borde
**exclusivo** de su caja) y la columna 36 la roba el `pixel-panel`. Y su conclusión —*«para llegar a
570 harían falta columnas hasta x≈370, que el contenedor no alcanza»*— es cierta y **no viene al
caso**: los 30 que faltan no son del contenedor, son de la X.

> **Veredicto de la disputa: no hay un número mal medido. Hay dos mediciones correctas en dos
> estados distintos de la pantalla, comparadas como si fueran la misma.** Ver ALTA 1.

---

## 7 · Hallazgos

### ALTA 1 · El DRIFT 2 acusa en falso al reviewer anterior, con el defecto que esta tarjeta vino a arreglar

El handback §9 titula el DRIFT 2 *«Dos números del review anterior no me dan, y **el mío es el que
cierra con la geometría**»*, y su §12 manda al reviewer a mirar *«el DRIFT 2 (mis 540/300 contra los
570/330 del review anterior)»*. Medido (§6): **los dos juegos de números son correctos**. Los del
handback son el estado **sin avisos**; los de `review_T23c.md` son el estado **con un aviso**, y sus
nueve filas se reproducen clavadas.

**Por qué es ALTA y no una nota al pie:** es **exactamente** el defecto que originó esta tarjeta,
cometido en la sección donde se lo está explicando. La casa lleva tres vueltas encontrando lo mismo
—T23 midió *un punto por botón*, T23b midió *un estado del drawer*, T23c midió *un botón muerto*— y
el handback de T24 lo nombra bien y después **compara dos barridos de estados distintos como si
fueran el mismo** y declara equivocado a quien midió el otro estado. El DRIFT 2 no es un drift: es
una medición propia que contesta otra pregunta.

Atenuante real: **no llegó a ningún MD commiteado.** Grepeé `540`, `570/675`, `330/675` y `300/675`
en `sdd/*.md` y **no aparecen en ninguno**; vive sólo en `handback_T24.md` §9 y §12. Pero el handback
es la evidencia de R29/R30 de esta tanda, y hoy deja escrito que un reviewer se equivocó cuando no.

**Qué pido:** corregir el DRIFT 2 en `handback_T24.md` — que los dos números son correctos, que la
diferencia es el estado de la pantalla, y que lo que falta en los dos lados es **declarar el estado
del barrido junto con el número**. Y que ninguna tabla de robo de puntos se publique sin decir
`avisos=N, drawer=abierto|cerrado`.

### ALTA 2 · Los `15/675` no son «el borde del layout»: son la grilla midiendo un punto que no está sobre el botón

Medido, con el rect exacto:

```
rect de «Ver carrito» a 390 px:  left 218.875  right 351  top 776  bottom 820
                                 width 132.125  height 44

la grilla que da 675:   45 columnas × 15 filas
  primera col 219 · última col 351   ->  bordeDerechoIncluido:   true
  primera fila 776 · última fila 818 ->  bordeInferiorIncluido:  false

elementFromPoint(348, 798) = BUTTON · btn-primary fixed bottom-6 right-6 z-40
elementFromPoint(350, 798) = BUTTON · btn-primary fixed bottom-6 right-6 z-40
elementFromPoint(351, 798) = DIV · pixel-panel p-5        <- x=351 NO está sobre el botón
elementFromPoint(285, 818) = BUTTON · btn-primary …
elementFromPoint(285, 820) = DIV · pixel-panel p-5        <- la fila 820 no se muestrea
```

Y los 15 «robados» están **siempre en esa única columna**, en los seis anchos:

```
 w    robados  columnasRobadas  soloEnElBordeDerecho
320   15/675        281                true
360   15/675        321                true
390   15/675        351                true
430   15/675        391                true
480   15/675        441                true
1920  15/675       1881                true
```

**No es el layout: es el borde derecho del propio botón**, un punto que cae fuera de su caja y por
eso lo recibe lo que hay detrás (de ahí que el «ladrón» cambie de `pixel-panel` a `MAIN` a
`flex flex-1` según la ruta y el ancho — es *lo que haya detrás*, no una capa). Lo confirma el
barrido de capas fijas de §3: **sin avisos, ninguna capa `fixed` le roba un solo punto a nada**, así
que los 15 no pueden ser una capa.

**Las consecuencias, en números:**

| | declarado | real |
|---|---|---|
| Puntos muestreados que están sobre el botón | 675 | **660** (44 col × 15 filas) |
| Residual post-arreglo, sin avisos | `15/675` | **`0/660` = 0 %** |
| Residual con un aviso (la X) | `51/675` = **7,6 %** | **`36/660` = 5,45 %** |

El arreglo es **más limpio de lo que el handback se atribuye**. Pero el `51/675 = 7,6 %` quedó
escrito como **el número contra el que comparar la próxima tarjeta** (handback §12.3: *«El número
contra el que comparar es 51/675»*), así que una base equivocada se arrastra al próximo ciclo —
y ese ciclo es justo el que ADR-037 obliga a medir en los dos estados.

**Dónde vive el texto (los cuatro lugares):**

```
sdd/status.md:128                 D35:      «Los 15 que quedan son el borde del layout»
sdd/decisions.md:1027             ADR-037:  «51/675 = 7,6 % contando los 15 puntos del borde del layout»
sdd/progress/dev/current.md:21              «15/675 (el borde del layout, que ya estaba a 1920)»
sdd/progress/dev/current.md:46              «(36 la X + 15 el borde del layout)»
```

**Qué pido:** corregir los cuatro, y arreglar la descripción del método, que es inexacta en los dos
ejes a la vez. Dice *«una muestra cada 3 px **incluyendo los dos bordes**»*: en `x` incluye un borde
que está **afuera** del elemento (porque 132 es divisible por 3) y en `y` **excluye** el borde de
abajo (porque 44 no lo es). Lo honesto es muestrear el interior (`x < right`, `y < bottom`) y decir
el denominador real.

### ALTA 3 · `current.md` volvió a mentir en el mismo commit en que se escribió la lección de no mentir, y cita un DRIFT que no existe

`current.md` **fue reescrito en `0758e55`** (170 líneas cambiadas, está en el `--stat`), y el mensaje
del commit lo dice (*«current.md estaba en T20-F61 / 0.16.0 … Reescrito»*). **El handback §8 afirma
lo contrario:** *«**No lo reescribí**: contiene el registro de T20 y decidir qué queda de eso es
tuyo, no mío»*, y su §1 «AL TERMINAR» no lo lista entre los modificados. Alguien lo reescribió
después de que el handback se cerrara, y el handback quedó diciendo que no se tocó.

Y tal como quedó commiteado, **es falso en los tres datos que sirven para retomar tras un corte**:

```
current.md:3   «**Último commit:** `7271583`»            -> el real es 0758e55 (el commit que lo contiene)
current.md:38  «**Nada commiteado** (R01). 5 modificados  -> el árbol está LIMPIO; los 9 archivos
                y 4 sin seguimiento»                         están todos dentro de 0758e55
current.md:58  «Lo señaló el **DRIFT 3** del handback»    -> handback_T24.md §9 tiene DRIFT 1 y
                                                             DRIFT 2. No hay DRIFT 3:
                                                             $ grep -n "DRIFT" handback_T24.md
                                                             520: ## 9 · DRIFT (R25) · dos, …
                                                             522: ### DRIFT 1 · …
                                                             540: ### DRIFT 2 · …
                                                             611: … el DRIFT 2 …
```

**Lo que lo vuelve ALTA y no BAJA:** las líneas 52-59 de ese mismo archivo son una sección titulada
«Deuda de método, declarada» cuya lección escrita es *«`current.md` se actualiza **al commitear**, no
al empezar lo siguiente — si no, miente justo cuando más se lo necesita»*. **Se commiteó violando la
lección que acababa de escribir, en el renglón de abajo.** Es el archivo que R30 manda leer para
retomar, y hoy manda al commit anterior y dice que nada está commiteado.

**Qué pido:** actualizar las líneas 3 y 36-41 al estado real (`0758e55`, árbol limpio, pendiente este
review), corregir «DRIFT 3» → la §8 del handback, y en el handback §8 corregir la frase «no lo
reescribí». Y, si la lección vale, convertirla en un paso del cierre y no en un párrafo.

### MEDIA 4 · El guard aprueba un contenedor `fixed` con fuga si su etiqueta no está en una lista de diez

`capasFijas.ts` tiene `CONTENEDORES` con 10 etiquetas, y `esPiezaTocable()` devuelve `true` para
**todo lo demás**, con lo que `esFuga()` devuelve `false`. Es una lista blanca usada como lista
negra. Sembré tres sondas en `AppShell.tsx` y corrí la suite:

```
<span  className="fixed bottom-24 right-6 z-30 w-72 block">   -> el guard la APRUEBA (verde)
<label className="fixed bottom-24 left-6 z-30 w-72">          -> el guard la APRUEBA (verde)
<div   className={`fixed bottom-24 left-6 z-30 w-72 ${""}`}>  -> el guard la CAZA:

+   "layout/AppShell.tsx:55 <div> \"fixed bottom-24 left-6 z-30 w-72 ${\"\"}\" — contenedor fixed sin pointer-events-none",
 Test Files  1 failed | 18 passed (19)
      Tests  1 failed | 233 passed (234)
```

(Dato a favor del implementador: el `className={\`…\`}` **sí** lo ve, mejor de lo que su comentario
promete.)

**Y la fuga no es teórica.** Inyecté en la página viva exactamente el `<span>` que el guard aprueba,
en el lugar y el tamaño que tenía el contenedor de Ayuda:

```
antes de la sonda:  robados 15/675 · esElBoton=true  · enCentro BUTTON·btn-primary fixed …
CON la sonda:       robados 675/675 · esElBoton=false · enCentro SPAN·fixed bottom-6 left-6 z-40
                    ladrones: SPAN·fixed bottom-6 left-6 z-40 x675
tras quitarla:      robados 15/675 · esElBoton=true
```

**675/675 y el centro muerto: el defecto de D35, reproducido con una capa que el guard declara
limpia.** Quedan exentos también `p`, `li`, `article`, `figure`, `dialog` y **cualquier componente de
React** (`<Overlay>`, `<Portal>`, `<Toaster>`), que es el caso más probable en este proyecto.

El handback declara en «Lo que no se verificó» #5 y #6 las otras dos limitaciones (clases no
literales y `absolute` con `z-index`). **Esta no está declarada**, y es la más fácil de pisar.

**Qué pido:** invertir la regla —contenedor es *todo* salvo lo que sea interactivo de verdad
(`button`, `a`, `input`, `select`, `textarea`, `summary`, `[role]` interactivo)— o, si se prefiere no
tocar código, **declararla** en ADR-039 y en «lo que el guard no prueba», que hoy no la nombra.

### MEDIA 5 · «Declaración vs geometría»: el guard aprobando un archivo no dice nada sobre lo que tapan sus hijos

Medido en §3(b): `RegionDeAvisos.tsx:29` **pasa el guard** (tiene `pointer-events-none`) y su
descendiente con `pointer-events-auto` sigue robando **36/675 de «Ver carrito»** con un aviso y el
drawer cerrado. La regla sólo mira el contenedor; **no mira si lo que el contenedor reactiva cae
encima de algo**. No es un defecto nuevo —es el 5,3 % abierto— pero sí es el límite real del guard,
más estrecho que el que ADR-039 declara. Un archivo verde en el guard puede tener la fuga entera
adentro.

**Qué pido:** una línea en ADR-039 y en D35: el guard prueba que el **contenedor** cede los punteros;
lo que sus hijos con `pointer-events-auto` tapan **sólo se mide en el navegador**, y el caso vivo de
eso es la X del aviso.

### BAJA 6 · «Escribir por mail» cae fuera de la ventana; sólo se llega scrolleando el panel

A 390 × 844 con dos FAQ abiertas, el botón está en **`y 892-936`**: debajo del área visible del panel
(`224-764`) **y debajo del viewport (844)**. Mi primer clic real de mouse en esas coordenadas **no
abrió nada** —cayó fuera del panel— y el formulario recién apareció después de un
`scrollIntoViewIfNeeded`:

```
panelRect 24-364 x 224-764 · scrollTop 0 · scrollHeight 728 · clientHeight 540
boton «Escribir por mail» rect 40-333 x 892-936     <- fuera de la ventana
```

El panel scrollea, así que **se llega y no es una regresión de T24**. Lo anoto porque el handback §4.4
reporta el formulario andando sin decir que hubo que scrollear para llegar, y un dedo de verdad tiene
que descubrir ese scroll con el botón invisible.

### BAJA 7 · El contador `page_view` mete todas las rutas en `/`

Cargué 13 rutas distintas decenas de veces. La única fila que se movió fue
`(28, '2026-10-24', '/', 'mouse', 8 → 80)`; **no se creó ninguna fila para `/tienda`, `/admin`,
`/checkout`…** El contador registra la raíz de la SPA en vez de la ruta. Fuera del alcance de T24, y
las tres sesiones anteriores vieron el mismo movimiento (8→18, 26→27, 27→28) sin nombrarlo.
Restaurado a 8 y verificado fila por fila.

### BAJA 8 · «front 5173: caido» no prueba nada en esta máquina, y el `localStorage` de la evidencia vive en otro origen

El puerto **5173 lo tiene otro proyecto**: cuando lo consulté respondió `200` con
`<title>Espejo Marketplace</title>`, y mi propio Vite se corrió solo:

```
Port 5173 is in use, trying another one...
  ➜  Local:   http://localhost:5174/
```

Dos consecuencias para la evidencia del handback:

1. Su §7 apaga los servidores y lo prueba con `curl http://localhost:5173/ -> caido`. En una máquina
   donde 5173 puede ser de otro, ese check puede dar «caído» con el front propio vivo en 5174, o
   «vivo» con el propio apagado. **Conviene apagar por PID y verificar por PID**, no por puerto.
2. El handback midió en el origen `localhost:5173`, así que el `localStorage` que describe —el nombre
   de 40 caracteres de D14 congelado en el carrito, que dice no haber tocado para no romper la
   evidencia— **vive en ese origen, no en el de la app**. Mi origen (`:5174`) arrancó con
   `localStorage` **vacío** (`claves: []`), y lo dejé vacío.

---

## 8 · Lo que SÍ está bien, dicho con evidencia

No todo es hallazgo, y las cosas verificadas valen lo mismo que las encontradas:

| Sospecha que fui a buscar | Cómo la probé | Resultado |
|---|---|---|
| El `675/675 → 15/675` está inflado o es de otro árbol | Barrido propio en 6 anchos + los 3 `sha256` + `wc -l` | **Bien.** Los seis dan `15/675`, los tres hashes y los tres `wc -l` son los declarados |
| El centro no llega en alguno de los seis anchos | `elementFromPoint` en el centro, los seis | **Bien.** `esElBoton=true` en los seis |
| El clic real no abre el drawer (sólo `.click()` de JS) | `mouse.move + down + up` en (285,798) | **Bien.** `drawer=false → true` |
| Arreglar esto rompió Ayuda | 6 clics reales + teclado real, sin apretar Enviar | **Bien.** Abre, 4 FAQ abren, el form acepta texto en los 3 campos, scrollea y la X cierra |
| El arreglo movió los números de ADR-037 | Barrido en los dos estados del drawer | **Bien.** `36/675` cerrado y `30/1620` abierto, clavados |
| Había más víctimas del contenedor y nadie las buscó | 13 rutas × 390 px + 6 rutas × 3 anchos | **Bien.** «Ver carrito» era la única, siempre |
| Los cuatro comandos no dan lo declarado | Los cuatro, con hash de bundle | **Bien.** 234/19, 368, lint 0, build OK, y los dos hashes del bundle coinciden |
| El guard es de fachada y nunca vio rojo | Roto de 2 formas nuevas + 3 sondas | **Bien** en lo que cubre: caza una capa nueva en otro archivo y se da cuenta si deja de leer las fuentes (ver MEDIA 4 por lo que no cubre) |
| Las limitaciones declaradas del parser muerden hoy | `grep` de `position:fixed` en CSS y de `clsx` | **Bien.** Ninguna de las dos existe hoy en el proyecto |
| Las correcciones de MD se aplicaron sólo donde el review puso el ejemplo | Grep de cada texto en todos sus lugares | **Bien, las cuatro.** Ver abajo |

**La propagación de MDs, que era lo que más se temía, está completa.** Lo verifiqué texto por texto:

```
front 226 -> 234:   sdd/testing.md:13 y :204  (los DOS lugares donde vivía el número; el diff
                    de testing.md en el commit tiene exactamente esos 2 renglones)
                    + sdd/status.md:14 (tabla de salud) + changelog 0.17.1
la frase falsa de D33:  grep de "no se puede arreglar"/"desde la interfaz" en sdd/*.md ->
                    sólo status.md:126 (corregida, con lo que decía antes y la medición que la
                    desmiente) y changelog.md:35 (la nota de la corrección). Ninguna copia vieja.
el tope de 120:     changelog 0.17.1 (la explicación entera) + el entry de 0.17.0 AMENDADO EN SU
                    LUGAR sin borrar nada (R13): «Esta descripción quedó corta y se completa en
                    0.17.1» (2º hunk del diff, @@ -37,7 +95,9 @@) + la línea al pie de D34
hashes del bundle:  los nuevos en status.md:16 y changelog:54-55; los viejos sobreviven SÓLO en
                    el entry histórico del changelog y en handbacks/reviews de vueltas anteriores,
                    que R09 dice no reescribir. Correcto.
```

Me equivoqué una vez revisando esto: leí el primer hunk del diff del changelog y concluí que el
entry de 0.17.0 **no** se había tocado. Había truncado la salida; el segundo hunk muestra que **sí**
se amendó en su lugar. **La afirmación del handback §8 sobre el changelog es verdadera.**

---

## 9 · Lo que no pude verificar

1. **Celular de verdad.** Todo es Chromium con el viewport cambiado. **No hay un dedo en un teléfono
   real.** El `touch` de iOS Safari con `-webkit` no lo probó nadie, acá ni en las tres vueltas
   anteriores. Es el mismo hueco que el implementador declaró y no lo cerré.
2. **«Enviar consulta».** Lo ubiqué (`39-332 x 703-747`) y **no lo apreté**: manda un mail de verdad
   por `contactApi.send` y la base de desarrollo tiene credenciales de correo. Que el `POST` salga y
   que el resultado se dibuje **no lo vi**, igual que el handback.
3. **El botón de WhatsApp del panel.** Sin `WHATSAPP_PHONE` en la base de desarrollo, en su lugar sale
   el cartel que lo explica. El `<a>` **no existió en pantalla en ningún momento**, así que no sé si
   recibe su clic con el `pointer-events-auto` nuevo. Cuelga del panel que sí probé, pero probado no
   está.
4. **El estado PRE-arreglo es una emulación.** Le saqué `pointer-events-none` al contenedor en el DOM
   vivo en vez de hacer checkout del árbol anterior, para no tocar archivos durante la medición.
   Reproduce `675/675`, el `intercepts pointer events` y **el desglose por ladrón del handback al
   punto** (`525+15` a 430, `285+15` a 480), así que lo doy por fiel — pero **no es el árbol
   literal `7271583`**.
5. **Que la tabla de nueve anchos de `review_T23c.md` se haya corrido con un aviso.** Probé que sus
   nueve filas son **exactamente** lo que da el estado «un aviso» y **exactamente** lo que no da el
   estado «cero avisos», con el desglose `svg + path` que lo explica fila por fila. Es fuerte, pero
   sigue siendo una **inferencia de la causa**: ese review no declara su estado y su script ya no
   existe, así que no descarté por lectura una causa distinta que sumara exactamente 30 en esos
   cinco anchos y 0 en los otros cuatro. Me parece inverosímil; no imposible.
6. **El back, enteramente.** Corrí sus 368 y no lo leí. Las dos MEDIA de MD que T24 corrigió (D33 y
   el tope de 120) **las midió el reviewer de T23c**: no re-sembré los 200 caracteres ni volví a
   correr los siete bordes del tope ni el `PUT` con el nombre acortado. Las doy por verificadas
   **por él**, y así siguen escritas.
7. **Mutación sistemática.** Rompí el guard de dos formas y le puse tres sondas, pero **no corrí
   Stryker** ni muté los otros cinco unitarios de `capasFijas.test.ts`: no sé si alguno pasa de
   casualidad. El handback declara el mismo hueco.
8. **Capas fijas que no monté.** Mi barrido de capas `position: fixed` sólo ve lo que estaba montado
   en los estados que visité (cero avisos / un aviso / drawer abierto, 13 rutas a 390 px y 6 rutas a
   320/360/430). Una capa que sólo aparece en un camino de error, con sesión de admin, o en el
   `NavDrawer` abierto, **no la vi**. Tampoco probé dos avisos apilados.
9. **El `desborde=15` a 320 px.** Lo reproduje y no lo investigué: es D21, declarado y anterior a
   esta tarjeta.
10. **El `page_view` restaurado.** Devolví el contador de 80 a 8 con un `UPDATE` directo y verifiqué
    que **ninguna fila de ninguna de las 19 tablas** quedó distinta. El **hash del archivo no
    vuelve** (SQLite reescribe páginas); la copia previa quedó en mi scratchpad.
11. **Si «Escribir por mail» quedaba fuera de la ventana antes de T24.** Lo medí sólo en el árbol de
    hoy. Depende de cuántas FAQ estén abiertas y del alto del viewport, y T24 no tocó esa geometría,
    pero **no lo comparé contra el árbol anterior**.

---

## 10 · Resumen

**El arreglo de T24 es correcto, y lo re-ejecuté entero.** `pointer-events-none` en el contenedor con
`pointer-events-auto` en lo que se toca cierra D35: `675/675 → 15/675`, el centro del botón llega en
los seis anchos, un clic real de mouse abre el drawer, Ayuda sigue usable con clics reales, los
números de ADR-037 no se movieron, los cuatro comandos dan lo declarado con los dos hashes del bundle
coincidiendo, y los tres `sha256` del código son los del handback. **No pido cambiar una línea de
`.tsx`.** Y cerré a favor del arreglo el hueco que el implementador declaró: barriendo 13 rutas y
cuatro anchos, **«Ver carrito» era la única víctima del contenedor**.

**Lo que pido corregir son tres afirmaciones y dos declaraciones.** Las dos que más importan son la
misma cosa vista dos veces: **un número bien medido que no mide lo que se cree**, que es el hallazgo
que originó esta tarjeta, repetido adentro de ella.

- El **DRIFT 2** compara dos barridos de estados distintos de la pantalla y declara equivocado a
  quien midió el otro estado. Las nueve filas de `review_T23c.md` se reproducen **exactas** con un
  aviso en pantalla; las del handback, **exactas** sin avisos. Nadie midió mal: lo que falta es
  **declarar el estado junto con el número**, y es la cuarta vuelta consecutiva en que esta casa
  encuentra la misma clase de error un nivel más abajo.
- Los **`15/675`** no son «el borde del layout»: son una columna en `x = rect.right`, afuera del
  botón, en los seis anchos (`soloEnElBordeDerecho: true`). El residual real post-arreglo es **0 %**
  —el arreglo es mejor de lo que se atribuye— y el número de referencia para la próxima tarjeta es
  **36/660 = 5,45 %**, no `51/675 = 7,6 %`. Está escrito en cuatro lugares.
- **`current.md`** se commiteó diciendo que nada está commiteado, apuntando al commit anterior y
  citando un DRIFT 3 que no existe — en el mismo archivo donde se acababa de escribir que
  `current.md` se actualiza al commitear «porque si no miente justo cuando más se lo necesita».

Y el guard, que es lo mejor de esta tanda (se da cuenta si deja de leer las fuentes: eso lo vi en
rojo), **aprueba hoy un `<span>` o un `<label>` o cualquier componente de React con la fuga entera**,
cosa que ADR-039 no declara, y lo demostré inyectando esa capa aprobada y volviendo a matar el botón:
**675/675**.

**Para el `done` de R16 falta:** el OK humano sobre estas correcciones. Son de MD y de handback; el
código, por mí, pasa.

---

## 11 · Costo

| Rol | Modelo | Vueltas | Nota |
|---|---|---|---|
| reviewer (R30) | Opus 5 | 1 | re-ejecución entera: 4 comandos, 6 anchos post-arreglo, 10 anchos pre-arreglo × 2 estados de aviso, 3 estados de drawer, 13 rutas + 6 rutas × 3 anchos de barrido de víctimas, 2 rojos nuevos del guard + 3 sondas, clics reales de Ayuda, diff de 19 tablas de la base |
