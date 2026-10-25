# REVIEW · D29 + D30 (+ la mitad de D32) · reviewer independiente de R30

**Rama:** `dev` · **Commit revisado:** `02a1872` (0.17.2) · **Base de la tanda:** `d9fd66b`
**Fecha:** 2026-10-25 · **Rol:** reviewer independiente — **no implementé nada de esto y no arreglé nada**.
**Veredicto:** **CHANGES_REQUESTED** — y conviene leer la primera línea del porqué: **no hace falta
tocar una sola línea de producción**. D29, D30 y los dos ítems de D32 **funcionan y están medidos**;
todo lo que el handback declara como comportamiento **se sostuvo al re-ejecutarlo**. Lo que no se
sostiene son **tres afirmaciones del registro** (una medición generalizada desde un solo ancho, una
frase sobre la base de datos y una sobre quién produce errores) y **una deuda nueva que quedó más
chica de lo que es** (D37). R30 pide evidencia honesta, no sólo código que anda: por eso el
veredicto cae del lado del registro.

## 0 · Estado del árbol, al empezar y al terminar

```
$ git rev-parse --abbrev-ref HEAD
dev
$ git rev-parse HEAD
02a1872c61163dfa71ec418198953a98c9f38ea1

$ git status --short        (AL EMPEZAR)
(vacío: árbol limpio)

$ git status --short        (AL TERMINAR)
(vacío: árbol limpio)
```

**Los 8 archivos de la tanda, con hash al empezar y al terminar — los mismos:**

```
29dfd271b7f529cd399a9547eaa3590afaedb3d97ef3497c99f1b2d925c2be23  src/components/RegionDeAvisos.tsx
52815d1b7424f071941a222667c359327d0f7c80860b1ba937a45fcb72c0122a  src/contexts/AvisosContext.tsx
6c020aca2ab8dc1f59babb4c864db25955a01af91587c09384d45fc67b3ff12a  src/contexts/CartContext.tsx
83b457824bedc3f78a31f65f2fc7536d64ff626a50a97ebb2dae3c6c05534af3  src/lib/avisos.test.ts
c8057c77a53198884df79de5d46a547b22c76e41f250a23f636b49ec859e4925  src/lib/avisos.ts
49921055976866a8d1533dbebe7d0cec8702328174b00242950bd58855656c59  src/lib/carrito.aviso.test.ts
711a444569a1a165409e093b11bbeac72c073935bb0d0903718e44b14cc7855f  src/lib/carrito.test.ts
7bc42273ca7bb5c19cce81ca5594537549c7287990e8156e79e231efcab94b40  src/lib/carrito.ts
```

**R01 respetada:** ni `git add`, ni `commit`, ni `push`, ni `restore`, ni `checkout` en toda la
revisión. Cada archivo que muté se guardó antes en una copia byte a byte y se restauró desde esa
copia **comparando sha256**, como lo hizo el implementer. El único archivo versionado que escribo es
éste.

## 1 · Los números del handback, re-ejecutados

| Qué declara el handback | Re-ejecutado | Veredicto |
|---|---|---|
| Rojo contra la base: **18 failed / 238 passed (256)** | **18 failed / 238 passed (256)**, exit **1** | **SE SOSTIENE** |
| Front: **256 passed en 20 archivos** | **256 passed (20)**, exit **0** | **SE SOSTIENE** |
| Back: **368 OK**, sin tocar | **Ran 368 tests ... OK**, exit **0** | **SE SOSTIENE** |
| Lint (eslint + los dos `tsc`) limpio | sin salida, exit **0** | **SE SOSTIENE** |
| Build: `index-ukpe8W5L.js` **428.10 kB** / gzip 128.49, 1868 módulos | idéntico, **mismo hash de bundle**, exit **0** | **SE SOSTIENE** |
| 9 mutantes muertos, con los tests que caen por nombre | los 9, **con exactamente los nombres declarados** | **SE SOSTIENE** |
| **M10 sobrevive: borrarle el `onFocus` deja las 256 en verde** | **256 passed (256)**, exit **0** | **CONFIRMADO** |
| Un test no podía ser rojo contra la base (el del plazo) | verificado: la constante **ya valía 4000** en `d9fd66b` | **HONESTO** |

### 1.1 · El rojo, reconstruido contra `d9fd66b`

No se puede volver al momento en que el implementer lo midió, así que lo reconstruí: **producción de
`d9fd66b`, tests de `02a1872`**, que es exactamente lo que su `git diff --stat` vacío describe.

```
$ for f in RegionDeAvisos.tsx AvisosContext.tsx CartContext.tsx avisos.ts carrito.ts;
      do git show d9fd66b:<ruta>/$f > <ruta>/$f; done
$ git diff --stat -- <los 3 archivos de test>
(vacío: los tests son los de 02a1872, byte a byte, hashes verificados)

$ npm --prefix front/Andres_Bakery run test
 Test Files  2 failed | 18 passed (20)
      Tests  18 failed | 238 passed (256)
EXIT=1
```

Los 18, **por grupo, contados sobre la salida literal**: **4** de `elPlazoCorre`, **4** de
`agregarRetencion`/`quitarRetencion`, **4** de `cerrarConEscape`, **4** de `aDondeVuelveElFoco` y
**2** de D29 (`nombra el tamaño cuando se eligió uno`, `los dos tamaños de la misma torta dan DOS
avisos, no uno`). **Es exactamente el reparto declarado.** Restaurado por hash después.

### 1.2 · El test que no podía ser rojo: la excusa es verdad

```
$ git show d9fd66b:.../lib/avisos.ts   | grep MS_PARA_IRSE_SOLO
const MS_PARA_IRSE_SOLO = 4000;                      <-- ya valía 4000 en la base
$ git show d9fd66b:.../lib/avisos.test.ts | grep -A2 "varios segundos"
    expect(ms).toBeGreaterThanOrEqual(3000);         <-- el test viejo, con margen
```

`expect(msParaIrse("exito")).toBe(4000)` **no podía fallar** contra `d9fd66b`, y su rojo es el
mutante M3. **No es una excusa: es el enunciado de D32.** Lo digo con la salida porque el handback
pedía que se verificara.

### 1.3 · Los 10 mutantes, uno por uno

Cada uno: una línea de producción rota, suite entera, restauración desde copia en memoria con
sha256 antes/después. **`restaurado: true` en los diez.**

| # | Mutante | Suite | Tests que cayeron (por nombre) | Declarado |
|---|---|---|---|---|
| M1 | el aviso deja de nombrar la variante | 2 failed / 254 | los dos de D29 | = |
| M2 | `variante.name` sin `.trim()` | 1 / 255 | «una variante sin nombre no deja un paréntesis vacío colgado» | = |
| M3 | `MS_PARA_IRSE_SOLO` 4000 → 3000 | 2 / 254 | los dos de `msParaIrse` | = |
| M4 | `elPlazoCorre` ignora las retenciones | 3 / 253 | foco, mouse, y «sacar el mouse NO reanuda…» | = |
| M5 | `agregarRetencion` apila dos veces | 1 / 255 | «entrar con el mouse no cuenta doble» | = |
| M6 | Escape ignora qué aviso tiene el foco | 2 / 254 | los dos de «con el foco adentro» | = |
| M7 | el Escape global se lleva el error (contra C3) | 2 / 254 | los dos de «con el foco afuera» | = |
| M8 | el `body` vuelve a ser destino válido | 1 / 255 | «el `body` no es un destino» | = |
| M9 | un elemento desmontado vuelve a ser destino | 1 / 255 | «un elemento que ya no está en la página no sirve» | = |
| **M10** | **borro `onFocus`/`onBlur` del `<div>` de la región** | **20 passed / 256 passed** | **ninguno** | **SOBREVIVE** |

```
{ "mutante": "M10 - borro onFocus/onBlur del <div> de la region",
  "archivo": "RegionDeAvisos.tsx", "exit": 0,
  "tests": "Test Files  20 passed (20) | Tests  256 passed (256)",
  "fallidos": [], "restaurado": true, "VEREDICTO": "SOBREVIVE" }
```

**El décimo mutante se confirma.** Lo que está escrito en `status.md` (D37), en `testing.md` y en el
changelog es **cierto**. Y es cierto por una razón estructural que conviene dejar dicha, porque hace
la deuda más grande de lo que D37 dice — ver hallazgo **A1**.

## 2 · El navegador (R07)

**El MCP de Playwright conectó** (no conectaron `github` ni `codegraph`, igual que en la tanda). No
hizo falta el camino de CDP a mano. Servidores propios: back `127.0.0.1:5000`, front
`localhost:5173`, **los dos apagados y verificado al final** (§6). `HashRouter` confirmado:
`http://localhost:5173/#/producto/cheesecake-de-frutos-rojos`. Producto 2, el único con variantes,
con **dos grupos obligatorios** (Relleno y Bizcocho), como dice `status.md`.
Foto del reviewer: `C:\Users\Facundo\Estudio_Trabajo\Cerebro\.playwright-mcp\review-D29-D30-aviso-pausado-390px.png`.

> **Nota de método, para que nadie le crea de más a estos números.** El MCP agrega ~2 s a cada
> acción de Playwright, o sea que **dos clics reales no entran nunca en la ventana de 4 s** del
> aviso. Donde el reloj importaba (contar dos avisos juntos), disparé los clics **adentro de la
> página**, que ejecuta los mismos handlers de React en el mismo Chromium: lo que cambia es quién
> aprieta, no qué corre. Todo lo de D30 —pausa, Escape, mouse, auto-cierre— está medido con
> **teclado y puntero de verdad** (`page.keyboard.press`, `page.mouse.move/click`), porque ahí la
> retención mantiene el aviso vivo y el reloj deja de apurar.

### 2.1 · D29 · los dos tamaños, en pantalla al mismo tiempo

```
paso: "agrego 8 porciones"                                   t=126ms
  avisos: 1   ["«Cheesecake de Frutos Rojos» (8 porciones) se agregó al carrito"]
paso: "agrego 12 porciones (otro renglon, mismo nombre)"      t=529ms
  avisos: 2   ["«Cheesecake de Frutos Rojos» (8 porciones) se agregó al carrito",
               "«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito"]
carrito: $ 14.200 + $ 19.800 = Subtotal $ 34.000
```

**SE SOSTIENE**, con el mismo subtotal declarado. Y una confirmación por la puerta de atrás: cuando
los dos «Agregar» se separan más de 4 s (tres acciones del MCP, 8.007 ms medidos), el primero **ya se
fue solo** y en pantalla queda uno. No es un defecto; es el plazo haciendo su trabajo, y explica por
qué este caso hay que medirlo con el reloj en la mano.

### 2.2 · D30 · la pausa, con teclado y mouse de verdad

```
enfoco la X del primer aviso
  avisosEnPantalla: 1   activo: "BUTTON"   activoEsBody: false
  aria: "Cerrar el aviso ««Cheesecake de Frutos Rojos» (8 porciones) se agregó al carrito»"
   ... 4300 ms sin tocar nada ...
  avisosEnPantalla: 1   activo: "BUTTON"   activoEsBody: false   (sigue ahí, y el foco también)

el mouse DE VERDAD sobre la X (puntero en 335,784)   avisos: 1  foco: BUTTON «Vainilla»
 ... 4400 ms con el mouse quieto ...                 avisos: 1  foco: BUTTON «Vainilla»
tras el clic DE VERDAD en la X                       avisos: 0  foco: BUTTON «Vainilla»  activoEsBody: false

aviso nuevo, nadie lo retiene (mouse en 5,5, foco afuera)   avisos: 1
 ... 4300 ms ...                                            avisos: 0   (el auto-cierre, intacto)
```

**SE SOSTIENE entero**: pausa por foco, pausa por mouse, el clic real devuelve el foco a donde
estaba y **nunca al `body`**, y el plazo sigue vivo cuando nadie lo retiene. La foto muestra el
aviso en pantalla pasados los 4,5 s con el anillo de foco en su X.

### 2.3 · Escape · las dos mitades, y las cuatro cosas que ya cerraba

```
tras apretar Escape DE VERDAD con la X enfocada
  avisos: 0   activo: "BUTTON"   activoEsBody: false   foco: «Vainilla»   drawerSigueAbierto: true
```

Y el Escape global, con el foco **afuera** del aviso, apretado una sola vez con un panel abierto:

```
antes:   avisos: 1   ayudaAbierta: true    foco: BUTTON «Vainilla»
Escape:  avisos: 0   ayudaAbierta: false   foco: BUTTON «Vainilla»   activoEsBody: false
```

**Las cuatro cosas que el handback dice que Escape ya cerraba, re-ejecutadas** (clics y teclas
reales):

| Qué | Antes de Escape | Después | Veredicto |
|---|---|---|---|
| **NavDrawer** (☰) | `fixed inset-0 z-50 bg-tinta/40` con «MenúInicioCartaAndreaMis pedidos…» | desaparece | **sigue cerrando** |
| **Menú de cuenta** | `menuDeCuenta: true` | `false` | **sigue cerrando** |
| **Panel de Ayuda** | el contenedor incluye «¿Hacen envíos?…» | vuelve a decir sólo «Ayuda» | **sigue cerrando** |
| **`<dialog>` del panel** | — | — | **NO VERIFICADO** (§5) |

El listener nuevo es del documento y **no corta la propagación** (leído en el código y medido: un
solo Escape cerró el panel de Ayuda **y** se llevó el aviso). Sin regresiones.

### 2.4 · C3 medido en el navegador — lo que el handback declaró que no podía medir

El handback dejó el aviso de **error** sin medir en el navegador. Lo medí, con una mutación
temporal y restaurada por hash (`avisos.exito` → `avisos.error` en `CartContext.tsx`, sólo para
producir un error de verdad en pantalla):

```
aviso de ERROR en pantalla + panel de Ayuda abierto
  avisos: 1   role: "alert"   clases: ["bg-error-suave"]   ayudaAbierta: true
 ... 4500 ms sin tocar nada ...            avisos: 1      (el error NO se va solo)
tras un Escape de verdad, foco AFUERA      avisos: 1      ayudaAbierta: false
   -> cerró el modal y DEJÓ el error en pantalla          <-- C3, medida
tras Escape con el foco ADENTRO del error  avisos: 0      foco: «Vainilla»  activoEsBody: false
```

**La decisión de partir Escape en dos se sostiene, y ahora está medida en un navegador y no sólo en
los tests puros y en M7.** Restaurado: `sha256 6c020aca…` idéntico, `avisos.error` 0 ocurrencias.

### 2.5 · El barrido de geometría, con MIS anchos y en los DOS estados del drawer

Barrido **punto por punto** (`elementFromPoint` sobre cada píxel entero del rectángulo), **sin
`scrollIntoView`** —la trampa documentada del repo hermano—, sobre **todo lo tocable que haya en
pantalla** y no sólo sobre dos botones: `button, a[href], input, textarea, select, [role=button]`.
Seis anchos, los dos estados del drawer, y un **control sin ningún aviso** para poder atribuir.

**«Ver carrito»** (rect 132×44 = **5.808 puntos**, igual que el handback):

| Ancho | drawer CERRADO, con aviso | ladrón | drawer CERRADO, **sin** aviso (control) | drawer ABIERTO |
|---|---|---|---|---|
| 320 | **0** robados · **0,00 %** | — | 0 | el botón **no está en pantalla** |
| 360 | 256 robados · **4,41 %** | `la X del aviso`: 256 | 0 | no está |
| 375 | 256 · **4,41 %** | la X: 256 | 0 | no está |
| 390 | 256 · **4,41 %** | la X: 256 | 0 | no está |
| 414 | 256 · **4,41 %** | la X: 256 | 0 | no está |
| 430 | 256 · **4,41 %** | la X: 256 | 0 | no está |

**«Ayuda»** (4.268 puntos en mi convención de barrido): **0 robados por el aviso en los seis
anchos** con el drawer cerrado. Con el drawer **abierto** pierde 4.268/4.268, y el ladrón es **el
velo del propio drawer** (`fixed inset-0`), que existe para comerse el clic y cerrar: es
comportamiento de modal preexistente, **no del aviso**.

Y el barrido de **todo lo tocable** (7 elementos en pantalla por ancho) devuelve, en los cuatro
anchos que corrí entero: **la única víctima del aviso es «Ver carrito», el único ladrón es la X, y
el cartel roba 0 en todas partes.** El `pointer-events-none` de T23/ADR-037 **sigue en pie**.

```
{"ancho":320,"cartel":{"alto":84,...},"laX":{"x":257,"y":741},"victimasDelAviso":[]}
{"ancho":390,"cartel":{"alto":64,...},"laX":{"x":327,"y":776},
 "victimasDelAviso":[{"etiqueta":"Ver carrito","total":5808,"porElAviso":256,"pct":4.41,
                      "porOtro":0,"quienes":{"la X del aviso":256}}]}
```

**Los números del handback (4,41 % a «Ver carrito», 0 % al cartel, 0 a «Ayuda») se sostienen** —
y resultan ser estables de 360 a 430. **Lo que NO se sostiene es la frase sobre la altura del
cartel**: hallazgo **A2**.

### 2.6 · D36 reproducida, y más fuerte que con el test borrado

El handback la midió con un test temporal que corrió y borró. La reproduje **en el navegador**:

```
paso: "12 porciones con Dulce de leche"                            avisos: 1
  ["«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito"]
paso: "12 porciones con Chocolate (mismo tamano, OTRO relleno)"    avisos: 1
  ["«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito"]

carrito: "$ 19.800 por 12 porciones · Relleno: Dulce de leche · Bizcocho: Vainilla"
         "$ 20.600 por 12 porciones · Relleno: Chocolate · Bizcocho: Vainilla"
         Subtotal $ 40.400
```

**Dos renglones, un aviso. D36 está bien escrita.** Y es un poco peor de lo que la ficha dice: el
segundo aviso no es que se vea «menos», es que **no aparece ninguno nuevo** —el dedup reemplaza el
cartel por otro con el mismo texto—, así que quien agregó el Chocolate **no recibe ninguna
confirmación de que su segundo agregado entró**. El diagnóstico de la ficha (comparar la clave del
renglón, opción C, y **no** alargar el texto) queda **reforzado** por A2.

## 3 · Hallazgos

### ALTA

**A1 · El hueco que destapa M10 es mucho más grande que el `onFocus`, y D29 también está adentro.**
D37 nombra «el cableado de `onFocus`/`onBlur`/`onMouseEnter`, el listener de Escape, el
`data-aviso`, la restauración del foco y el efecto de los plazos». Es una lista de cosas de **D30**.
La causa real es estructural: **ningún test importa ninguno de los tres archivos de React**
(`RegionDeAvisos.tsx`, `AvisosContext.tsx`, `CartContext.tsx`). Lo verifiqué y después lo medí con
**10 mutantes propios**, distintos de los nueve del handback. **Sobreviven 7 de 10**, y los 7 son
exactamente los que tocan React:

| # | Mutante propio | Resultado |
|---|---|---|
| X1 | borro `onMouseEnter`/`onMouseLeave` de la X (pausa por mouse desenchufada) | **256/256 VERDE** |
| X2 | el cartel pierde su `data-aviso` (Escape no sabe cuál está enfocado) | **256/256 VERDE** |
| X3 | `cerrar()` ya no devuelve el foco (vuelve el síntoma del hallazgo 7) | **256/256 VERDE** |
| X4 | el listener de Escape **nunca se registra** | **256/256 VERDE** |
| X5 | **`RegionDeAvisos` no dibuja NADA** (`return null` al entrar) | **256/256 VERDE** |
| X6 | saco `avisos` de las deps del `useMemo` (deshago el ítem de D32) | **256/256 VERDE** |
| **X7** | **`addItem` deja de pasarle la variante a `avisoDeAgregado` (deshago D29)** | **256/256 VERDE** |
| X8 | el efecto de plazos ignora las retenciones (D30 muerta en el provider) | **256/256 VERDE** |
| X9 | *control, lógica pura*: `avisoDeAgregado` usa guion en vez de paréntesis | 2 failed / 254 · **MUERTO** |
| X10 | *control, lógica pura*: `quitarRetencion` no quita nada | 2 failed / 254 · **MUERTO** |

Los dos controles muestran que la suite **sí** cuida la lógica pura; los siete verdes muestran dónde
termina. **X5 es la frase más corta para el humano: se puede borrar la región de avisos entera y las
256 siguen en verde.** Y **X7 es la que obliga a corregir D37**: el cableado de **D29** —la deuda que
esta tanda da por cerrada— **tampoco lo cubre nada**; se puede deshacer D29 en producción sin que un
solo test se entere. Todo restaurado por hash, `git status` limpio.
**Qué pedir:** que D37 diga «ninguno de los tres archivos de React tiene test; D29 y D30 están los
dos adentro del hueco», con X5 y X7 como las dos líneas que lo prueban. No es código: es una deuda
que quedó escrita más chica que su tamaño.
**Reproducción:** los diez mutantes están arriba con su resultado; cada uno es una sustitución de una
línea en el archivo indicado, suite entera, restauración por sha256.

**A2 · «D29 no mueve un píxel de la geometría» es falso a 320 px, medido con el mismo método del
handback.** El handback mide los tres textos reales **a un solo ancho (390 px)**, le dan los tres 64
px, y concluye: *«El mismo alto, los tres. D29 no mueve un píxel de la geometría con la carta de
hoy»*. Clonando el cartel real y midiendo el mismo nodo con los mismos textos, **a seis anchos**:

| Ancho | `(12 porciones)` | `(8 porciones)` | **sin variante (como era ANTES de D29)** | `«Brownie Tentacion»` |
|---|---|---|---|---|
| **320** | **84** | **84** | **64** | 64 |
| 360 | 64 | 64 | 64 | 64 |
| 375 | 64 | 64 | 64 | 64 |
| 390 | 64 | 64 | 64 | 64 |
| 414 | 64 | 64 | 64 | **44** |
| 430 | 64 | 64 | 64 | **44** |

**A 320 px D29 le agrega 20 px de alto al cartel** (una línea más de texto) respecto de cómo era
antes de D29. La conclusión del handback vale **de 360 px para arriba**, no «con la carta de hoy». El
mismo cuadro muestra que la altura depende del ancho en los dos sentidos (el texto corto cae a 44 px
desde 414), así que **un solo ancho no podía responder esta pregunta** — que es, palabra por palabra,
la lección que este repo ya pagó dos veces, aplicada al eje del **ancho** en vez del eje del estado.
**La consecuencia, medida y dicha completa: no hay daño.** A 320 px el cartel de 84 px **sube la X a
y=741**, arriba de la barra de botones (y=761), y el robo de «Ver carrito» cae de 4,41 % a **0 %**,
sin que ningún otro tocable pierda un punto (`victimasDelAviso: []`). O sea: la frase es falsa, el
efecto es benigno y hasta favorable. Pero **el riesgo 2 del handback dice «con la carta de hoy no
ocurre (los tres textos reales dan 64)», y sí ocurre**: el mecanismo «cartel más alto ⇒ la X se para
sobre otra parte de la pantalla» **ya está activo hoy, a 320 px, con la carta real**.
**Qué pedir:** corregir la frase a «los tres textos dan 64 px **de 360 a 430**; a **320 px** los dos
con variante dan **84** y el de antes de D29 daba 64», y corregir el riesgo 2 para que diga que el
mecanismo ya se observa con la carta de hoy en el ancho más angosto. El 4,41 % de `status.md`
conviene que viaje con su ancho y su estado: **«drawer cerrado, 360–430 px»**.
**Reproducción:** §2.5 y el cuadro de arriba; el barrido está hecho con `elementFromPoint` punto por
punto y con control sin aviso.

### MEDIA

**M1 · «La base de desarrollo no se tocó … Ni una escritura» es falso: el sitio escribe en cada
carga.** El handback §8 lo declara como evidencia de cuidado. El log del back de **mi** pase, que
hizo lo mismo que el suyo:

```
     66 "POST /api/metrics/view HTTP/1.1"      <-- escribe y commitea
     66 "GET  /api/products/cheesecake-de-frutos-rojos HTTP/1.1"
     62 "GET  /api/site/delivery HTTP/1.1"
      2 "GET  /api/products HTTP/1.1"
```

`POST /api/metrics/view` → `metrics_service.registrar_visita` → `db.session.add(PageView(...))` +
`db.session.commit()` (`backend/services/metrics_service.py:83-85`). **Cada carga de página
inserta o incrementa una fila `PageView` en la base de desarrollo**, sin auth y sin que nadie la
pida. No es un dato sensible (ADR-019: sin cookie y sin IP) y no afecta a D29/D30, pero:
(a) la frase del handback es **falsa tal como está escrita**, y es justo la clase de frase que R30
existe para no dejar pasar; (b) **la consigna «no escribas en la base de desarrollo» no se puede
cumplir** mientras se cargue el sitio en un navegador, y conviene que el próximo reviewer lo sepa
antes y no después. **Yo también escribí**: ~66 filas de visitas, y lo declaro acá en vez de
repetir la frase.
**Qué pedir:** cambiar la frase por «sin escrituras **de dominio**: ni productos, ni pedidos, ni
migraciones; el contador de visitas (`PageView`) sí se incrementa en cada carga, por diseño».
**Reproducción:** levantar el front, abrir cualquier ruta y mirar el log del back.

**M2 · «El único productor de errores es el panel de admin» es falso: hoy no hay ninguno.** El
handback §7 justifica no haber medido el aviso de error en el navegador diciendo que llegar hasta
él *«pedía loguearse y forzar un guardado fallido contra la base de desarrollo»*. Busqué el
productor y **no existe**:

```
$ grep -rn "useAvisos" --include="*.ts*" src/ | grep -v test
  components/RegionDeAvisos.tsx     (el que dibuja)
  contexts/CartContext.tsx:108      -> avisos.exito(...)      linea 129
  pages/admin/usePanelDeAdmin.ts:47 -> avisos.exito(mensaje)  linea 56   <-- SOLO exito
$ grep -rnE "\berror\(" --include="*.ts*" src/ | grep -v test | grep -v console
(vacío)
$ grep -rn 'tono: *"error"' --include="*.ts*" src/ | grep -v test
(vacío)
```

En todo el front hay **exactamente dos** productores de avisos y **los dos son `exito`**. El `error`
de `usePanelDeAdmin.ts` es un `useState("")` local que el panel pinta aparte, **no un aviso**. O sea
que la rama `tono: "error"` —y con ella C3, `seVaSolo`, el `role="alert"` y el mutante M7— **cuida un
camino que hoy ningún código puede producir**. La decisión sigue siendo la correcta como invariante,
y la medí funcionando (§2.4); lo que está mal es la frase, que le hace creer a quien lea
`testing.md` o `status.md` que el error es alcanzable y sólo incómodo de disparar.
**Qué pedir:** decir que **hoy ningún llamador produce `error` ni `aviso`**, que la rama está
cubierta por los tests puros, por M7 y ahora por la medición de §2.4, y que el día que alguien
escriba el primer `avisos.error(...)` hay que volver a medir C3 en el navegador.
**Reproducción:** los tres `grep` de arriba.

### BAJA

**B1 · `status.md` §1 todavía declara el bundle de T24.** Dice `index-DFNjbxcP.js` **426,68 kB**; el
build de `02a1872` da `index-ukpe8W5L.js` **428,10 kB** (el valor correcto está en el handback §3,
pero no llegó a la fila «Build del front», que es la que alguien va a leer). Una línea.

**B2 · El 4,41 % viaja sin su estado ni su ancho.** La regla de la casa, escrita en `testing.md` por
este mismo repo, es que *«una medición se declara con el estado en el que se tomó»*. El número es
correcto, pero: con el drawer **abierto** el botón «Ver carrito» **ni siquiera está montado** (lo
verifiqué en los seis anchos), así que —a diferencia de T24— acá **hay un solo estado posible**, y
conviene decirlo en vez de dejar la duda. Y a 320 px el mismo número es **0 %** (A2).

**B3 · Diferencia de convención en el barrido, sin consecuencia.** El handback cuenta **4.312**
puntos en «Ayuda» (98×44) y mi barrido cuenta **4.268**, porque el rectángulo no cae en coordenadas
enteras y yo recorro `ceil(left) … floor(right)-1`. En «Ver carrito» los dos contamos **5.808**. Las
dos convenciones dan **0 robados por el aviso**, así que no cambia ninguna conclusión; lo anoto para
que el próximo barrido no lo lea como una discrepancia.

**B4 · Dos cosas preexistentes que encontré de paso y no son de esta tanda.** (i) El drawer del
carrito **no cierra con Escape** —lo probé dos veces, con y sin aviso en pantalla— aunque tiene velo
`fixed inset-0` y se comporta como modal; no es una regresión de D30 y el handback hace bien en no
listarlo entre las cuatro cosas que Escape cierra. (ii) El botón de cerrar de ese drawer **no tiene
nombre accesible** (`aria-label` vacío y sin texto): lo encontré al buscarlo para automatizar.
Ninguna de las dos toca D29/D30; quedan dichas por si valen una ficha.

## 4 · Lo que se sostiene, dicho con la salida que lo prueba

- **D29 anda**: dos tamaños, dos avisos, subtotal $34.000 (§2.1), y los dos tests mueren con M1 (§1.3).
- **D30 anda entera**: pausa por foco (4300 ms), pausa por mouse real (4400 ms), Escape que cierra y
  devuelve el foco **nunca al `body`**, y auto-cierre intacto (§2.2, §2.3).
- **La decisión de partir Escape en dos se sostiene**, y las cuatro cosas que ya cerraban con Escape
  **siguen cerrando** (§2.3). El error no se borra al cerrar un modal: **medido** (§2.4).
- **Los dos ítems de D32 están donde dicen estar**, y el del plazo tiene su mutante que muere.
- **Los nueve mutantes mueren con los nombres declarados**; **el décimo sobrevive**, como se declaró.
- **Los cuatro comandos del harness, verdes**, con exit 0 medido **sin tubería** y el mismo hash de
  bundle que el handback.
- **Ni un error ni un warning de consola** en todo el pase de navegador.
- **La honestidad del handback, donde se la puede chequear, es real**: el test que no podía ser rojo,
  M10, y los dos DRIFT de R25 (D36 se reproduce; la cita del hallazgo 7 vs 8 es correcta).

## 5 · Lo que NO pude verificar, y por qué

1. **Escape sobre los `<dialog>` del panel de admin.** Es la cuarta de las cuatro cosas que el
   handback dice que Escape ya cerraba, y la única que no pude medir: el panel pide login y las
   credenciales están en `backend/.env`, que la consigna me prohíbe abrir (y no pego credenciales en
   un informe). En el sitio público **no hay ningún `<dialog>`** (`dialogs: []` en todas las
   pantallas que recorrí). Lo que sí verifiqué, y es el mecanismo que importa: el listener nuevo es
   del documento, **no llama a `stopPropagation`** (leído en `RegionDeAvisos.tsx:80-94`) y medí un
   Escape que cerró un panel **y** se llevó el aviso en el mismo evento (§2.3), así que no hay motivo
   mecánico para que los `<dialog>` se comporten distinto. Queda **declarado, no medido**.
2. **El `git diff --stat` vacío en el momento exacto en que el implementer midió el rojo.** Es
   irrecuperable después del commit. Lo reemplacé por la reconstrucción de §1.1, que es la misma
   afirmación medida de nuevo desde `d9fd66b`: da los mismos 18/238.
3. **Los editores anidados del panel** (`EditorDeGrupo`, `SaboresDelGrupo`), que tienen su propio
   manejo de Escape con `stopPropagation` — mismo motivo que 1.
4. **Dispositivos reales y toque real.** Todo el barrido es Chromium a anchos CSS con
   `elementFromPoint`; no es un teléfono de verdad ni un dedo de verdad. Es la misma base con la que
   se midieron T23, T24 y D35, así que es comparable, pero no es lo mismo.
5. **El aviso de error en su camino real de producción** — porque ese camino **no existe** (M2). Lo
   medí forzándolo con una mutación temporal, que es lo más cerca que se puede estar hoy.
6. **`pip-audit` / `npm audit` y cualquier cosa de D10/D23**: fuera del alcance de esta tarjeta, no
   los corrí.

## 6 · Servidores, base y limpieza

```
$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/products
000   -> back 5000: CAIDO
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
000   -> front 5173: CAIDO
$ netstat -ano | grep -E ":5000|:5173" | grep LISTENING
(ningun LISTENING en 5000/5173)
```

Los dos **apagados y verificado**. El `npm run dev` deja un hijo que sobrevive a matar el padre:
hubo que bajarlo por PID, y lo anoto porque al próximo le va a pasar igual.

- **Base de desarrollo:** sin escrituras de dominio (ni productos, ni pedidos, ni migraciones). Los
  estados que necesité los armé en el navegador, en `localStorage`. **Sí se escribieron ~66 filas de
  `PageView`**, que es inevitable al cargar el sitio: ver **M1**.
- **`backend/.env` no se abrió.** Ninguna credencial en este informe.
- **Nada versionado tocado** salvo este archivo. Lo temporal (scripts de mutación y salidas) vivió en
  el scratchpad de la sesión; la foto quedó en `.playwright-mcp/`, que está en el `.gitignore`.
- **Suite final, después de todas las mutaciones:** `Test Files 20 passed (20) · Tests 256 passed
  (256)`, exit **0**, y `git status --short` vacío.

## 7 · Qué haría falta para pasar a APPROVED

Nada de producción. Cuatro correcciones de registro, todas del leader:

1. **D37**: que diga el tamaño real del hueco — ninguno de los tres archivos de React tiene test, y
   **D29 está adentro del hueco igual que D30** (X5 y X7 como prueba). **(A1)**
2. **La frase de geometría del handback y el riesgo 2**: los tres textos dan 64 px **de 360 a 430**;
   a **320 px** los dos con variante dan **84** y antes de D29 daban 64, así que el mecanismo del
   riesgo 2 **ya se observa con la carta de hoy**. Y que el 4,41 % viaje con «drawer cerrado,
   360–430 px». **(A2, B2)**
3. **La frase de la base de datos** y **la frase del productor de errores**: las dos son falsas como
   están escritas. **(M1, M2)**
4. **`status.md` §1, fila «Build del front»**: `index-ukpe8W5L.js` 428,10 kB. **(B1)**

Con eso, el registro dice lo que las mediciones dicen, que es todo lo que R30 pide. **El código de
D29, D30 y la mitad de D32 lo apruebo sin reservas: se re-ejecutó entero y aguantó.**
