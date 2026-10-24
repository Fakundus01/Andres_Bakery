# HANDBACK · T24 · El botón del carrito no se podía tocar en celular

**Rama:** `dev` · **Versión:** 0.17.1 · **Fecha:** 2026-10-24
**Estado:** el ALTA de `review_T23c.md` cerrada **con medición de antes y de después**, las dos MEDIA
de MD corregidas, **los cuatro comandos en verde**, **dos rojos de R29 vistos** (no deducidos).
**Sin commitear, sin un solo `git add`** (R01). Falta tu **OK** y un **reviewer que re-ejecute**
(R30): yo implementé, así que no puedo ser.

> **Base, con hash:** `7271583`. Al empezar, el árbol tenía **sólo** `?? sdd/progress/dev/review_T23c.md`
> (el review de la vuelta anterior, sin commitear) — lo dejé como estaba, no lo toqué.

---

## 1 · Git, al empezar y al terminar

```
AL EMPEZAR
$ git log --oneline -1
7271583 T23-F64: el sitio avisa qué entró al carrito, y el panel deja de pisar sus avisos (0.17.0)

$ git status --porcelain
?? sdd/progress/dev/review_T23c.md
```

```
AL TERMINAR
$ git log --oneline -1
7271583 T23-F64: el sitio avisa qué entró al carrito, y el panel deja de pisar sus avisos (0.17.0)

$ git status --porcelain
 M front/Andres_Bakery/src/components/AyudaPanel.tsx
 M sdd/changelog.md
 M sdd/decisions.md
 M sdd/status.md
 M sdd/testing.md
?? front/Andres_Bakery/src/lib/capasFijas.test.ts
?? front/Andres_Bakery/src/lib/capasFijas.ts
?? sdd/progress/dev/review_T23c.md
```

**Mismo hash, nada en el índice.** Un archivo de código modificado, dos nuevos, cuatro MDs, y este
handback (que aparecerá como quinto `??` en cuanto lo guardes y mires de nuevo).

```
$ sha256sum (lo que toqué de código)
b80708eb571d65931e496b8bcb0c43fcd34845aaad8a2a5c400d97d160ebe3a4 *src/components/AyudaPanel.tsx
4d22349274a661e6c72a87d5e00eca921c93162bcbc95c15a6a2e412fa503bbf *src/lib/capasFijas.ts
5e4b1258e83ef35d06cd730aa980ca2152d477ddeabab89aa41a1e3c83056589 *src/lib/capasFijas.test.ts

$ wc -l   →   154 / 94 / 72.   R05: ninguno pasa de 300, el más alto es 154.
```

---

## 2 · ANTES · el fallo reproducido, con la salida literal

Servidores propios (back `127.0.0.1:5000`, front `localhost:5173`), **apagados al terminar** (§7).
Barrido de cada botón **punto por punto, una muestra cada 3 px incluyendo los dos bordes**,
preguntando con `document.elementFromPoint` quién recibe el clic en cada punto. `/tienda`.

### 2.1 · El botón está muerto: 675 de 675, con cero avisos en pantalla

```
viewport: innerWidth=390 innerHeight=844 clientWidth=375
avisos en pantalla: 0
drawer presente: false
--- «Ver carrito» rect x 219-351 y 776-820 (132x44)
    robadosTOTAL 675/675
    ladrones: DIV · fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))] ×675
    centro (285,798) lo recibe: DIV · fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]  esElBoton=false
--- «Ayuda» rect x 24-122 y 776-820 (98x44)
    robadosTOTAL 0/495
    ladrones: -
    centro (73,798) lo recibe: BUTTON · btn-secondary  esElBoton=true
desborde horizontal: 0
```

**675 de 675. Un solo ladrón, y es el contenedor del panel de Ayuda** (`AyudaPanel.tsx:64`).

### 2.2 · Y el clic de verdad no hace nada

```
clic REAL de mouse en (285,798) = centro de «Ver carrito»
  antes:   drawer=false  url=http://localhost:5173/tienda
  despues: drawer=false  url=http://localhost:5173/tienda
```

Playwright, además, **se niega a hacer el clic** y dice exactamente por qué:

```
$ page.locator('button.btn-primary.fixed.bottom-6.right-6').click()
TimeoutError: browserBackend.callTool: Timeout 5000ms exceeded.
Call log:
  - locator resolved to <button type="button" class="btn-primary fixed bottom-6 right-6 z-40">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]"> intercepts pointer events
    - retrying click action
    …
```

### 2.3 · Los cinco anchos del rango muerto, antes

```
=== 320 px (clientWidth 305) · drawer=false · avisos=0 · desborde=15
  «Ver carrito» rect 149-281 x 761-805  robados 675/675  centro (215,783) -> DIV fixed bottom-6 left-6 … esElBoton=false
  «Ayuda»       rect  24-122 x 761-805  robados   0/495  centro  (73,783) -> BUTTON btn-secondary       esElBoton=true
=== 360 px (clientWidth 345) · desborde=0
  «Ver carrito» rect 189-321 x 776-820  robados 675/675  centro (255,798) -> DIV fixed bottom-6 left-6 … esElBoton=false
=== 390 px (clientWidth 375) · desborde=0
  «Ver carrito» rect 219-351 x 776-820  robados 675/675  centro (285,798) -> DIV fixed bottom-6 left-6 … esElBoton=false
=== 430 px (clientWidth 415) · desborde=0
  «Ver carrito» rect 259-391 x 776-820  robados 540/675  centro (325,798) -> DIV fixed bottom-6 left-6 … esElBoton=false
     ladrones: DIV fixed bottom-6 left-6 … x525 | DIV pixel-panel p-5 x15
=== 480 px (clientWidth 465) · desborde=0
  «Ver carrito» rect 309-441 x 776-820  robados 300/675  centro (375,798) -> BUTTON btn-primary fixed … esElBoton=true
     ladrones: DIV fixed bottom-6 left-6 … x285 | DIV pixel-panel p-5 x15
=== 1920 px (clientWidth 1905) · desborde=0
  «Ver carrito» rect 1749-1881 x 1012-1056  robados 15/675  centro (1815,1034) -> BUTTON btn-primary fixed … esElBoton=true
     ladrones: DIV flex flex-1 x15
```

**320, 360 y 390: el centro no llega. 430 tampoco. 480 ya sí.** El `desborde=15` a 320 px es **D21**,
que ya estaba declarado y no es de esto.

### 2.4 · Los dos estados del drawer, con un aviso en pantalla (antes)

```
=== 390 px · UN AVISO · DRAWER ABIERTO · avisos=1 drawer=true desborde=0
  aviso rect 16-359 x 764-828 · links adentro: 0 · X rect 327-343 x 776-792
  «Ir al checkout»          rect  28-351 x 720-764  robados    0/1620  centro (190,742) esElBoton=true
  «Ver el carrito completo» rect  28-351 x 776-820  robados   30/1620  centro (190,798) esElBoton=true
     ladrones: svg lucide-x x27 | path x3        (la X del aviso)
  «Ayuda»                   rect  24-122 x 776-820  robados  495/495   centro  (73,798) esElBoton=false
     ladrones: ASIDE (el drawer) x30 | BUTTON «Ver el carrito completo» x465

=== 390 px · UN AVISO · DRAWER CERRADO · avisos=1 drawer=false desborde=0
  aviso rect 16-359 x 764-828 · links adentro: 0 · X rect 327-343 x 776-792
  «Ver carrito» rect 219-351 x 776-820  robados 675/675  centro (285,798) esElBoton=false
     ladrones: DIV fixed bottom-6 left-6 … x639 | svg lucide-x x33 | path x3
  «Ayuda»       rect  24-122 x 776-820  robados   0/495  centro  (73,798) esElBoton=true
```

**Los números declarados de T23 son exactos y los reproduje al punto:** `0/1620`, `30/1620` = 1,9 %,
`0/495`, y los **36** de la X sobre «Ver carrito» = **5,3 %** (33 svg + 3 path). La geometría del
cartel coincide al píxel. **Lo que nadie había leído es la otra columna: 639 de los 675 los robaba
Ayuda.**

---

## 3 · Qué cambié, y por qué eso y no otra cosa

**Un archivo de código tocado y dos nuevos:**

```
front/Andres_Bakery/src/components/AyudaPanel.tsx   148 -> 154   (tres clases + el porqué)
front/Andres_Bakery/src/lib/capasFijas.ts             0 ->  94   (la regla, hecha función)
front/Andres_Bakery/src/lib/capasFijas.test.ts        0 ->  72   (7 unitarios + el guard)
```

El cambio, entero:

```diff
-    <div className="fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]">
+    <div className="pointer-events-none fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]">
       {abierto ? (
-        <div className="pixel-panel mb-3 max-h-[min(70vh,540px)] overflow-y-auto p-0">
+        <div className="pixel-panel pointer-events-auto mb-3 max-h-[min(70vh,540px)] overflow-y-auto p-0">
…
-      <button type="button" className="btn-secondary" onClick={…}>
+      <button type="button" className="btn-secondary pointer-events-auto" onClick={…}>
```

**Por qué `pointer-events` y no reubicar.** Está escrito entero en **ADR-039**; el resumen:

1. **Es el patrón que la casa ya eligió y ya midió.** `RegionDeAvisos.tsx` hace exactamente esto
   desde T23. Dos componentes resolviendo el mismo problema de dos formas es la deuda que no se ve.
2. **Reubicar arregla una instancia, no la clase.** Mover el botón de Ayuda o bajarle el `z-index`
   hace que *estos dos* dejen de chocar hoy; el próximo elemento clickeable que caiga en esos
   340 × 44 px vuelve a quedar muerto **y nadie se entera, porque nada avisa en pantalla**.
3. **`w-fit` en el contenedor** (la tercera opción) obliga a mudar el `w-[min(340px,calc(100vw-48px))]`
   al panel, que es justo lo que lo mantiene adentro de la pantalla a 320 px: riesgo de desborde a
   cambio de nada.
4. **No toca el dibujo.** Lo único que cambia es quién recibe el puntero donde no hay nada dibujado.

---

## 4 · DESPUÉS · re-medido, los seis anchos y los dos estados del drawer

### 4.1 · Los seis anchos, sin avisos, drawer cerrado

```
=== 320 px (clientWidth 305) · SIN AVISOS · DRAWER CERRADO · avisos=0 desborde=15
  «Ver carrito» rect 149-281 x 761-805  robados 15/675  centro (215,783) -> BUTTON btn-primary fixed bottom-6 right-6 z-40  esElBoton=true
     ladrones: H3 mt-4 font-display … x11 | DIV pixel-panel p-5 x4
  «Ayuda»       rect  24-122 x 761-805  robados  0/495  centro  (73,783) -> BUTTON btn-secondary pointer-events-auto      esElBoton=true
=== 360 px · desborde=0
  «Ver carrito» rect 189-321 x 776-820  robados 15/675  centro (255,798) -> BUTTON btn-primary fixed …  esElBoton=true
=== 390 px · desborde=0
  «Ver carrito» rect 219-351 x 776-820  robados 15/675  centro (285,798) -> BUTTON btn-primary fixed …  esElBoton=true
=== 430 px · desborde=0
  «Ver carrito» rect 259-391 x 776-820  robados 15/675  centro (325,798) -> BUTTON btn-primary fixed …  esElBoton=true
=== 480 px · desborde=0
  «Ver carrito» rect 309-441 x 776-820  robados 15/675  centro (375,798) -> BUTTON btn-primary fixed …  esElBoton=true
=== 1920 px · desborde=0
  «Ver carrito» rect 1749-1881 x 1012-1056  robados 15/675  centro (1815,1034) -> BUTTON btn-primary fixed …  esElBoton=true
```

**675/675 → 15/675 en los cinco anchos del rango muerto, y el centro llega al botón en los seis.**
El contenedor de Ayuda **desapareció de la lista de ladrones** en todos. Los 15 que quedan son el
borde del layout (una columna del barrido, `pixel-panel p-5` / `flex flex-1`): **ya estaban a 1920 px
antes de tocar nada**, en la medición de §2.3 y en la del reviewer anterior, que los llamó
«el borde del layout, no el aviso».

### 4.2 · El clic de verdad, y el que Playwright antes se negaba a hacer

```
1 · clic REAL de mouse en (285,798) = centro de «Ver carrito»
   antes:   drawer=false
   despues: drawer=true          <- el botón abre el carrito

2 · page.locator('button.btn-primary.fixed.bottom-6.right-6').click()
   -> OK, sin interceptacion. drawer=true
```

### 4.3 · Los dos estados del drawer, con un aviso, a 390 y a 1920

```
=== 390x844 · UN AVISO · DRAWER ABIERTO · avisos=1 drawer=true desborde=0
  aviso 16-359 x 764-828 · links: 0 · X 327-343 x 776-792
  «Ir al checkout»          rect  28-351 x 720-764  robados   0/1620  centro (190,742) esElBoton=true
  «Ver el carrito completo» rect  28-351 x 776-820  robados  30/1620  centro (190,798) esElBoton=true
     ladrones: svg lucide-x x27 | path x3
  «Ayuda»                   rect  24-122 x 776-820  robados 495/495   centro  (73,798) esElBoton=false
     ladrones: ASIDE (el drawer) x30 | BUTTON «Ver el carrito completo» x465

=== 390x844 · UN AVISO · DRAWER CERRADO · avisos=1 drawer=false desborde=0
  aviso 16-359 x 764-828 · links: 0 · X 327-343 x 776-792
  «Ver carrito» rect 219-351 x 776-820  robados 51/675  centro (285,798) -> BUTTON btn-primary fixed …  esElBoton=true
     ladrones: svg lucide-x x33 | path x3 | DIV pixel-panel p-5 x15
  «Ayuda»       rect  24-122 x 776-820  robados  0/495  centro  (73,798) esElBoton=true

=== 1920x1080 · UN AVISO · DRAWER ABIERTO · avisos=1 drawer=true desborde=0
  aviso 729-1177 x 1020-1064 · links: 0 · X 1145-1161 x 1032-1048
  «Ir al checkout»          robados 15/1995  centro (1683,978)  esElBoton=true   (el borde del ASIDE)
  «Ver el carrito completo» robados 15/1995  centro (1683,1034) esElBoton=true   (idem)
  «Ayuda»                   robados 495/495  centro   (73,1034) esElBoton=false  (el velo del drawer, a propósito)

=== 1920x1080 · UN AVISO · DRAWER CERRADO · avisos=1 drawer=false desborde=0
  «Ver carrito» rect 1749-1881 x 1012-1056  robados 15/675  centro (1815,1034) esElBoton=true
  «Ayuda»       rect   24-122  x 1012-1056  robados  0/495  centro   (73,1034) esElBoton=true
```

**Con el drawer cerrado y un aviso, «Ver carrito» pasó de 675/675 a 51/675 = 7,6 %**, y de esos 51
son **36 la X del aviso** (el 5,3 % de siempre, que sigue abierto y es el punto 1 de la cola) y
**15 el borde del layout**. **El drawer abierto no cambió en nada**: los números de ADR-037 siguen
clavados (`0/1620`, `30/1620`, `495/495` de «Ayuda» tapado por el drawer, que es lo que un modal
hace a propósito). **Desborde horizontal: 0** en todo salvo los 15 px de D21 a 320 px, que ya
estaban. **Consola del navegador: 0 errores y 0 advertencias** (3 entradas, las tres de Vite y React
DevTools).

### 4.4 · Y el panel de Ayuda sigue usable — que era lo que podía romperse

Todo con clics **reales** de mouse, no `.click()` de JS:

```
0 · estado inicial:                      {"panelAyuda":false,"faqAbiertos":0,"faqTotal":0,"formMail":false,"drawer":false}
1 · clic REAL en (73,798) «Ayuda»:       {"panelAyuda":true, "faqAbiertos":0,"faqTotal":4,"formMail":false,"drawer":false}
2 · clic REAL en (194,380) «¿Hacen envíos?»: {"panelAyuda":true,"faqAbiertos":1,"faqTotal":4,"formMail":false,"drawer":false}
3 · formulario de mail: {"email":"facu@ejemplo.test","msg":"Probando que el panel de Ayuda sigue vivo.","scrollable":true}
4 · con el PANEL DE AYUDA ABIERTO a 390px:
    { "panelRect": "24-364 x 224-764",
      "botonRect": "219-351 x 776-820",
      "robados": "15/675", "centro": "(285,798)", "esElBoton": true,
      "ladrones": "DIV·pixel-panel p-5 x15" }
5 · clic en la X «Cerrar ayuda»:         {"panelAyuda":false,"faqAbiertos":0,"faqTotal":0,"formMail":false,"drawer":false}
```

**Abre con un clic real, las cuatro preguntas abren, el formulario de mail acepta texto de verdad en
los dos campos, el panel sigue scrolleando (`scrollHeight > clientHeight`) y la X lo cierra.** Y con
el panel **abierto** no tapa el carrito: ocupa `224 → 764` y el botón está en `776 → 820`.
**Arreglar esto no rompió Ayuda.**

---

## 5 · El test que lo cuida, y el rojo MEDIDO de R29

**Sí se pudo llevar a función pura, y no es un test de fachada.** `src/lib/capasFijas.ts` tiene la
regla —un contenedor `fixed` sin `pointer-events-none` es una **fuga**, salvo el velo de un modal
(`inset-0`) y el elemento interactivo que es él mismo la capa— y `capasFijas.test.ts` tiene **7
unitarios** más **un guard que corre la regla sobre todos los `.tsx` del proyecto**.

Las clases quedan **literales en el TSX a propósito**: Tailwind las busca en el texto de las fuentes,
así que armarlas con una función las haría desaparecer del CSS. El cableado con la regla no es un
`import` en el componente: es el guard, que lee las fuentes con `import.meta.glob(..., '?raw')` de
Vite — no con `node:fs`, porque `tsconfig.app.json` no tiene los tipos de Node y el `lint` lo
rechazaba (lo vi: `TS2307: Cannot find module 'node:fs'`).

### Rojo 1 · le saco la clase al contenedor (el defecto original, re-sembrado)

```
$ sed -i 's|className="pointer-events-none fixed bottom-6 left-6 z-40|className="fixed bottom-6 left-6 z-40|' src/components/AyudaPanel.tsx
$ grep -n 'fixed bottom-6 left-6' src/components/AyudaPanel.tsx
70:    <div className="fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]">

$ npm --prefix front/Andres_Bakery run test
- Expected
+ Received

- []
+ [
+   "components/AyudaPanel.tsx:70 <div> \"fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]\" — contenedor fixed sin pointer-events-none",
+ ]

 ❯ src/lib/capasFijas.test.ts:70:68
     68|     // Si esto da 0, el barrido se rompió y el test no estaría proband…
     69|     expect(capas.length).toBeGreaterThan(0);
     70|     expect(regla.fugas(capas).map((fuga) => regla.explicar(fuga))).toE…
       |                                                                    ^

 Test Files  1 failed | 18 passed (19)
      Tests  1 failed | 233 passed (234)
```

**El guard dice el archivo, la línea y la clase.** Lo corrí dos veces: una con la versión que leía
con `node:fs` y otra con la de `import.meta.glob`, para no dar por bueno que el cambio de lectura
seguía viendo las fuentes reales. Las dos veces, el mismo rojo.

### Rojo 2 · debilito la regla

```
- return /(^|\s)pointer-events-none(\s|$)/.test(capa.clases);
+ return capa.clases.includes("pointer-events-none");

$ npm --prefix front/Andres_Bakery run test
- Expected
+ Received
- true
+ false

 ❯ src/lib/capasFijas.test.ts:39:80
     37|   it("no confunde `pointer-events-none` con un prefijo pegado", () => {
     38|     // `md:pointer-events-none` no vale: la regla tiene que valer a 32…
     39|     expect(regla.esFuga(capa("div", "fixed bottom-6 md:pointer-events-…

 Test Files  1 failed | 18 passed (19)
      Tests  1 failed | 233 passed (234)
```

Con `includes`, un `md:pointer-events-none` —que a 320 px no aplica— pasaría por bueno. **Los dos
archivos restaurados y verificados**: `grep` devuelve el regex y la clase de nuevo en su lugar, y la
suite vuelve a 234/234.

**Y lo que el guard NO prueba, dicho antes de que lo pregunte el reviewer:** prueba la
**declaración**, no la geometría. Que un botón reciba el clic en el píxel que sea sólo se prueba en
el navegador (R07, §2 y §4). Un `fixed` puesto desde CSS en vez de desde una clase de utilidad, o
clases armadas en una variable, **el guard no los ve** — está escrito en el comentario de
`capasFijasDe`.

---

## 6 · Los cuatro comandos de `harness.config.json`

### `test_front`

```
$ npm --prefix front/Andres_Bakery run test
> vitest run
 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery

 Test Files  19 passed (19)
      Tests  234 passed (234)
   Start at  11:33:51
   Duration  1.63s (transform 52%, tests 20%, import 16%, worker 12%)
TEST_FRONT_EXIT=0
```

**234 en 19 archivos** (eran 226 en 18: **+8** de `capasFijas.test.ts`).

### `test` · back

```
$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
----------------------------------------------------------------------
Ran 368 tests in 97.747s

OK
EXIT=0
```

**368 OK, sin cambios.** No toqué el back.

### `lint`

```
$ npm --prefix front/Andres_Bakery run lint
> npm run lint:eslint && npm run typecheck
> eslint .
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
LINT_EXIT=0
```

Sin salida. **La primera pasada dio `LINT_EXIT=2`** con tres errores (`node:fs`, `node:path` y
`__dirname` no existen bajo `tsconfig.app.json`), y es lo que me hizo cambiar la lectura de fuentes
a `import.meta.glob`. Lo dejo escrito porque el lint encontró algo real.

### `build`

```
$ npm --prefix front/Andres_Bakery run build
> tsc -b && vite build
vite v7.3.7 building client environment for production...
transforming...
✓ 1868 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.19 kB │ gzip:   0.60 kB
dist/assets/index-DywBBMqZ.css   36.28 kB │ gzip:   7.35 kB
dist/assets/index-DFNjbxcP.js   426.68 kB │ gzip: 128.02 kB
✓ built in 7.29s
BUILD_EXIT=0
```

**1868 módulos, los mismos.** Los **dos hashes cambiaron** y es lo esperado: el CSS porque entró
`pointer-events-auto` (36,23 → **36,28 kB**) y el JS por las clases nuevas en el TSX
(426,62 → **426,68 kB**, +60 bytes). `capasFijas.ts` **no entra al bundle**: sólo lo importa su test.

**Base declarada: 226/18 front, 368 back, lint 0, build OK. Medida hoy: 234/19, 368, 0, OK.**

---

## 7 · La base de desarrollo y los servidores, como los encontré

```
$ sha256sum instance/bakery.db   (al empezar)
c73ecb35b4e3b536b0e39360c8feee408c21966fae65881f2cf1383bec951907
```

Copia previa guardada en el scratchpad antes de levantar nada. Al terminar, el **diff tabla por
tabla, fila por fila**, de la copia contra la base:

```
tablas iguales: True
igual: alembic_version 1 · ingredient 2 · option 5 · option_group 2 · order 7 · order_delivery 7
igual: order_item 8 · order_item_option 0 · payment 0 · product 5 · product_ingredients 1
igual: product_option_groups 2 · product_tags 5 · product_variant 2 · site_content 2
igual: stored_image 0 · tag 4 · user 3
DISTINTA: page_view
  +  (28, '2026-10-24', '/', 'mouse', 18)
  -  (28, '2026-10-24', '/', 'mouse', 8)
```

**Lo único que se movió en toda la base fue el contador de visitas de hoy**, porque la app cuenta
sola cada vez que se abre una página (es lo mismo que les pasó a los dos reviewers anteriores,
26 → 27 y 27 → 28). **Lo devolví a 8**, y el diff final:

```
tablas con alguna diferencia de filas: NINGUNA — la base quedó fila por fila como la encontré
```

El **hash del archivo no vuelve** (`c73ecb35…` → `4da5c6c8…`) porque SQLite reescribe páginas, pero
**no hay una sola fila distinta en ninguna tabla**. Los cinco productos siguen con los largos de
nombre 24/26/16/17/8.

**El carrito del navegador también quedó como estaba.** Mis mediciones hicieron tres «Agregar»
(`4:3 → 4:6`); se lo devolví al JSON exacto que encontré y verifiqué que es **idéntico byte por
byte**. Ahí sigue el nombre de 40 caracteres que sembró el reviewer de T23b y quedó congelado en
`localStorage` (**D14**, hallazgo 9 de `review_T23c.md`): no lo toqué, para no romper esa evidencia.

**Servidores apagados:**

```
$ curl -m 2 http://127.0.0.1:5000/api/products   ->  back 5000: caido
$ curl -m 2 http://localhost:5173/                ->  front 5173: caido
```

---

## 8 · MDs

| Archivo | Qué |
|---|---|
| `sdd/decisions.md` | **ADR-039 nuevo** (las tres opciones, la decisión y las cuatro razones, lo medido de Ayuda, y lo que el guard no prueba). **ADR-037 matizado**: el 5,3 % era exacto pero se lo robaba a un botón muerto |
| `sdd/status.md` | **D35 nueva y cerrada el mismo día** · **D33 corregida** (la frase falsa, con lo que decía antes y la medición que la desmiente) · **D34 ampliada** con el BAJA 8 del reviewer · el **renglón 1 de la cola** matizado · la **tabla de salud** al día (234 OK, los dos hashes del bundle) · la **tercera vuelta de review** registrada · cabecera a 0.17.1 |
| `sdd/changelog.md` | **0.17.1** nueva. Y en **0.17.0** se agregó —sin borrar nada, R13— que la descripción del tope de 120 quedó corta |
| `sdd/testing.md` | front 226 → **234**, en los dos lugares donde estaba el número |

**Las dos frases que el reviewer pidió corregir, corregidas:**

1. **D33** decía *"el desborde de D31 **no se puede arreglar desde la interfaz**"*. **Es falso**, y la
   deuda ahora dice lo que sí pasa: el formulario se prellena con el nombre, no tiene `maxLength`, y
   un `PUT` que **acorta** el nombre entra. Lo imposible es cambiar el precio **dejando** el nombre
   largo.
2. **El tope de 120 hace más de lo declarado.** Agregado al changelog: no fue un `if len(...)`, fue
   pasar el nombre por `nombre_para_guardar`, que **colapsa espacios interiores y saltos de línea**,
   **saca los invisibles** y **acepta un `name` numérico** donde antes había un 500 por
   `AttributeError`. Las dos primeras ya les pasan a ingredientes, tamaños y etiquetas; la tercera es
   una mejora. Lo que faltaba no era revertirlo: era escribirlo, porque el nombre sale por el `GET`
   público y ADR-030 dice «no modifiques en silencio».

**Lo que NO toqué, a propósito:** `review_T23c.md` ni ningún otro review o handback de otra vuelta
(R09). La corrección del 5,3 % va en los MD vivos —ADR-037 y la cola—, no reescribiendo la historia.

**Y uno que encontré y NO arreglé, porque no es de esta tarjeta:** `sdd/progress/dev/current.md`
sigue siendo el de **T20-F61, versión 0.16.0**. Nunca se actualizó en T23, T23b ni T23c, y su
párrafo *"si esta sesión se corta"* dice que el último commit es **`4146ea3`** cuando es
**`7271583`**. Es justo el archivo que R30 pone para retomar tras un corte, y hoy mandaría a la
rama equivocada. **No lo reescribí**: contiene el registro de T20 y decidir qué queda de eso es tuyo,
no mío. Lo dejo señalado acá.

**Tampoco creé una tarjeta `sdd/cards/T24.md`.** Esto no nació de la cola, nació de un hallazgo de
review, y D35 + ADR-039 + el changelog ya lo dejan trazado. Si querés que la cola tenga su renglón
propio, es una línea y la escribo.

---

## 9 · DRIFT (R25) · dos, y ninguno lo arreglé en silencio

### DRIFT 1 · La hoja decía que lo único abierto era el 5,3 %, y el botón estaba muerto

- **Qué dice la hoja.** `status.md` §5 renglón 1: *"queda **abierto el robo de clics de la X del
  aviso** —hasta el **5,3 %** de «Ver carrito» con el drawer cerrado, 36 puntos de 675—, que se
  arregla subiendo la región arriba de la barra de botones"*. Lo mismo en la tabla de ADR-037.
- **Qué encontré.** El 5,3 % es exacto (lo reproduje: 36/675). Pero el **94,7 % restante lo robaba el
  contenedor de Ayuda**, y el botón no recibía **ningún** clic de 320 a 430 px. La frase describe
  como «lo único que falta» algo que, arreglado solo, **habría dejado el botón sin funcionar y la
  medición post-arreglo diciendo «0 % robado»**.
- **Opciones que había:** **A)** corregir las dos frases y arreglar el botón (lo que hice, por tu
  encargo explícito); **B)** arreglar el botón y dejar las frases, con la cola mintiendo; **C)**
  anotar la deuda y no tocar código, que es lo que el reviewer pidió porque él no escribe código.
- **Hecho: A.** Las dos frases ahora dicen que el 5,3 % se le robaba a un botón muerto **por otra
  causa**, y que hoy, con el botón andando, es lo único que le queda robando — así que mover la
  región sí se va a notar. **Queda para tu OK** si eso entra como tarjeta propia o sigue en la cola.
- **No se cerró el 5,3 %.** Sigue abierto, con su número y su estado, y ahora medido sobre un botón
  que anda: **51/675 = 7,6 %**, de los que 36 son la X y 15 el borde del layout.

### DRIFT 2 · Dos números del review anterior no me dan, y el mío es el que cierra con la geometría

- **Qué dice `review_T23c.md`** (§4, tabla de los nueve anchos): a **430 px** «Ver carrito» pierde
  **570/675** y a **480 px**, **330/675**.
- **Qué medí:** **540/675** y **300/675**. Treinta menos en los dos, y **la aritmética da mi
  número**: el contenedor de Ayuda termina en `x=364` fijo (24 + 340). A 430 el botón va de 259 a 391
  y el barrido toma columnas cada 3 px → las que caen en `≤364` son 36, por 15 filas = **540**. A 480,
  de 309 a 441 → 19 columnas `≤364`, por 15 = 285, más los 15 del borde = **300**. Para llegar a 570
  harían falta columnas hasta `x≈370`, que el contenedor no alcanza.
- **No cambia ninguna conclusión**: los dos coincidimos en `675/675` a 320/360/390, en que el centro
  no llega hasta 430 y en que a 480 ya sí. Lo declaro porque **es una diferencia medida y no la voy a
  dejar sin decir**, y porque `review_T23c.md` no es mío y no lo edito.

---

## 10 · Lo que NO se verificó

1. **Si el contenedor de Ayuda tapaba algo más.** Barrí «Ver carrito», «Ayuda», «Ir al checkout» y
   «Ver el carrito completo» en `/tienda`. El contenedor ocupaba `24 → 364 × 776 → 820` en **toda**
   pantalla angosta, así que cualquier otra cosa clickeable que cayera ahí estaba tapada. **No barrí
   la pantalla entera buscando más víctimas, ni probé las otras 10 rutas** del sitio. El arreglo es
   global (la clase está en el contenedor, no en el botón), así que las arregla a todas — pero no
   sé **cuáles** eran, ni puedo decir si alguna otra estaba muerta.
2. **Celular de verdad.** Todo es Chromium con el viewport cambiado. **No hay un dedo en un teléfono
   real**: `pointer-events` se comporta igual, pero el `touch` de iOS Safari con `-webkit` no lo
   probó nadie, acá ni en las vueltas anteriores.
3. **El panel de Ayuda contra el back.** Abrí el formulario de mail y escribí en los dos campos,
   pero **no apreté «Enviar consulta»**: eso manda un mail de verdad por `contactApi.send` y la base
   de desarrollo tiene credenciales de correo. Que el `POST` salga y que el resultado se dibuje **no
   lo vi**.
4. **El botón de WhatsApp del panel.** La base de desarrollo no tiene `WHATSAPP_PHONE`, así que en
   su lugar sale el cartel que lo explica. El `<a>` del WhatsApp **no existió en pantalla en ningún
   momento de mi sesión**, así que no sé si recibe su clic con el `pointer-events-auto` nuevo —
   cuelga del mismo panel que sí probé, pero probado no está.
5. **El guard contra clases no literales.** `capasFijasDe` es un parser de texto, no un AST. **No ve**
   un `fixed` puesto desde CSS, ni clases armadas en una variable o en un `clsx`. Hoy el proyecto no
   tiene ninguno de esos casos (lo miré con `grep`), pero el día que los tenga el guard va a decir
   «todo bien» sin haber mirado.
6. **El guard contra un `z-index` que tape sin ser `fixed`.** `absolute` dentro de un contenedor
   posicionado puede hacer lo mismo y la regla no lo mira. Elegí no ampliarla sin un caso medido.
7. **El back, enteramente.** No lo toqué y corrí su suite, nada más. Las dos MEDIA de MD que corregí
   (D33 y el tope de 120) **las midió el reviewer de T23c, no yo**: no re-sembré los 200 caracteres
   ni volví a correr los siete bordes del tope. Las doy por verificadas **por él**, y así están
   escritas en los MDs.
8. **El 5,3 % de la X, arreglado.** Sigue abierto a propósito: mover la región a `bottom-28` es un
   cambio de diseño de toda la región y no estaba en el encargo. Lo que sí hice fue medirlo sobre un
   botón vivo (51/675), que es el número contra el que habrá que comparar.
9. **Mutación sistemática.** Rompí a propósito **dos** cosas (la clase del componente y la regla). No
   corrí Stryker ni muté los otros cinco unitarios de `capasFijas.test.ts`: no sé si alguno de ellos
   pasa de casualidad.
10. **El `page_view` restaurado.** Devolví el contador de 18 a 8 con un `UPDATE` directo. Verifiqué
    que **ninguna otra fila** de **ninguna** tabla cambió, pero el **hash del archivo no vuelve al
    original** y eso no lo puedo arreglar sin restaurar el `.db` entero encima de la base real, que
    me pareció peor. Si querés el archivo idéntico, la copia previa está en mi scratchpad.

---

## 11 · Costo

| Rol | Modelo | Vueltas | Nota |
|---|---|---|---|
| implementer | Opus 5 | 1 | esta tanda entera: reproducción, arreglo, dos rojos, re-medición en 6 anchos × 2 estados, 4 comandos, 4 MDs y este handback |
| reviewer | — | **0** | **falta** (R30): no puedo revisarme |

---

## 12 · Próximo paso propuesto

1. **Tu OK**, y después un **reviewer independiente que re-ejecute** (R30): la reproducción de §2 (el
   `intercepts pointer events` es el testigo más corto), los dos rojos de §5 y los cuatro comandos.
   Que mire especialmente **el punto 1 y el 2 de «Lo que no se verificó»**: si había otras víctimas
   del contenedor, y el DRIFT 2 (mis 540/300 contra los 570/330 del review anterior).
2. **El commit de T23 + T24 juntos, o T24 aparte.** T23 sigue sin `Complete` por el OK y por el 5,3 %;
   T24 es un arreglo de algo que **ya estaba antes** de T23. Yo los commitearía separados, pero no
   commiteé nada.
3. **El 5,3 % de la X**, ahora que vale la pena: subir la región a `bottom-28` y **medir los dos
   estados del drawer en las dos pantallas**, como ADR-037 se obliga. El número contra el que
   comparar es **51/675**.
4. **Las deudas de T23 que siguen sin tocar:** D29, D30, D31, D32, D33 y D34.

## 13 · Riesgos

1. **El guard puede dar un falso positivo y frenar a alguien.** Si mañana hace falta un contenedor
   `fixed` que **sí** tiene que recibir punteros y no es un velo `inset-0`, el test se pone rojo con
   razón aparente y sin razón real. El mensaje dice el archivo, la línea y la clase, y la excepción se
   agrega en `ReglaDeCapasFijas`; pero quien lo encuentre va a tener que leer ADR-039 para saber que
   puede. **Es el precio elegido**: prefiero que pregunte a que un botón se muera en silencio.
2. **Un archivo nuevo en `src/lib/` que no es lógica de dominio.** `capasFijas.ts` es una regla sobre
   el código, no sobre el negocio, y vive al lado de `carrito.ts` y `avisos.ts`. Si el proyecto junta
   dos o tres más de estas, piden su propia carpeta.
3. **Los dos hashes del bundle cambiaron**, así que cualquier MD que los cite como «los de T23b»
   queda viejo. Corregí los que encontré (`status.md`); si hay otro que no vi, es un número
   desactualizado, no un defecto.
4. **El 5,3 % ahora se ve peor y no es peor.** Con el botón vivo, el barrido con un aviso dice
   `51/675 = 7,6 %` donde antes decía `675/675`. Alguien que compare los dos números sin leer puede
   pensar que algo empeoró: pasó lo contrario, y está escrito en los tres lugares donde el número
   aparece.
5. **`review_T23c.md` sigue sin commitear** y es la fuente de esta tanda. Si se pierde, este handback
   es lo único que queda de la medición original.
