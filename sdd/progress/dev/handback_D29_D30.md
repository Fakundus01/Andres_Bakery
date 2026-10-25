# HANDBACK · D29 + D30 (+ la mitad de D32) · El aviso del carrito nombra el tamaño, y su plazo se pausa

**Rama:** `dev` · **Versión de la hoja:** 0.17.1 · **Fecha:** 2026-10-25
**Base:** `d9fd66b`, árbol limpio al empezar. **Sin commitear** (R01 activa). **Falta el reviewer
independiente** (R30).
**Estado:** las dos deudas cerradas, **cuatro comandos en verde**, **rojo medido contra la base**,
**9 mutantes muertos** y **medido en el navegador a 390 px** con el MCP de Playwright, que esta vez
**sí conectó**.

> **Lo que NO entró, a propósito:** los otros dos BAJA de D32 (el `aria-label` de la X y el
> reordenamiento del dedup), por consigna. Y hay **tres cosas declaradas** abajo, en
> «DRIFT y decisiones declaradas (R25)»: una frase de la tarjeta que apunta al hallazgo
> equivocado, un **resto de D29 que esta tanda no cierra**, y un **recorte deliberado** de lo que
> hace Escape.

## 1 · Hecho

| Dónde | Antes | Ahora |
|---|---|---|
| Aviso del carrito (**D29**) | `«Cheesecake de Frutos Rojos» se agregó al carrito` para los dos tamaños ⇒ el dedup se llevaba el primero | `«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito` ⇒ **dos avisos, uno por tamaño** |
| Plazo con el foco adentro (**D30**) | corría igual: a los 4 s React desmontaba el nodo enfocado y el foco caía a `body` | **se pausa** mientras el aviso tiene el foco **o** el mouse encima (WCAG 2.2.1) |
| Al cerrarse (**D30**) | el foco quedaba en `body`: el próximo Tab arrancaba desde el principio de la página | **vuelve a donde estaba** (WCAG 2.4.3); si no hay destino válido, no se toca el foco |
| Escape (**D30**) | no cerraba nada | **cierra**: el aviso enfocado si el foco está adentro, y los que se iban a ir solos si está afuera |
| Plazo de 4 s (**D32**) | `>= 3000` en el test: el mutante `4000 -> 3000` quedaba verde | clavado en `4000`, con el mutante medido |
| `useMemo` del carrito (**D32**) | `avisos` faltaba en las dependencias; andaba porque `avisar` es estable | declarado en las dependencias, con el porqué escrito al lado |

**Archivos tocados (7) + 1 nuevo:**

| Archivo | Líneas | R05 |
|---|---|---|
| `front/Andres_Bakery/src/lib/avisos.ts` | 168 | ok |
| `front/Andres_Bakery/src/lib/avisos.test.ts` | 245 | ok |
| `front/Andres_Bakery/src/lib/carrito.ts` | 260 | ok |
| `front/Andres_Bakery/src/lib/carrito.test.ts` | 285 (era 298) | ok |
| `front/Andres_Bakery/src/lib/carrito.aviso.test.ts` | 80 | **nuevo** |
| `front/Andres_Bakery/src/contexts/AvisosContext.tsx` | 150 | ok |
| `front/Andres_Bakery/src/contexts/CartContext.tsx` | 224 | ok |
| `front/Andres_Bakery/src/components/RegionDeAvisos.tsx` | 167 | ok |

`carrito.aviso.test.ts` **nace por R05**: `carrito.test.ts` estaba en **298** líneas y el tope son
300, así que el `describe` de `avisoDeAgregado` se mudó a su propio archivo en vez de empujarlo a
301. Es el archivo que `review_T23b.md` (hallazgo 10) ya había marcado como el más alto del diff.

**Las cinco decisiones nuevas, todas puras y testeables sin montar React (ADR-023):**

- `avisoDeAgregado(product, variante)` — nombra el tamaño si hay uno, y **limpia el nombre**: una
  variante en blanco no deja `«Cheesecake ()»`.
- `elPlazoCorre(aviso, motivos)` — el plazo corre solo si nadie lo retiene.
- `agregarRetencion` / `quitarRetencion` — **dos motivos independientes** (`foco` y `mouse`) y
  alcanza con uno. Sin esto, sacar el mouse de la X mientras el teclado la tiene enfocada
  reanudaba el plazo: el mismo robo de foco por una puerta más chica.
- `cerrarConEscape(cola, idEnfocado)` — con el foco adentro cierra ése (error incluido); con el
  foco afuera se lleva los que se iban a ir solos y **deja el error**.
- `aDondeVuelveElFoco(previo, body)` — tres cosas descartan un destino: que no haya, que ya no esté
  en la página, y que sea el `body` (devolverle el foco al body **es** el síntoma).

## 2 · El rojo, MEDIDO contra `d9fd66b` (R29)

Los tests se escribieron primero y se corrieron **con producción intacta**. Verificado antes de
correr:

```
$ git rev-parse HEAD
d9fd66b70f72a52a7441093e0226bc3471e66699

$ git status --short
 M front/Andres_Bakery/src/lib/avisos.test.ts
 M front/Andres_Bakery/src/lib/carrito.test.ts
?? front/Andres_Bakery/src/lib/carrito.aviso.test.ts

$ git diff --stat -- .../lib/avisos.ts .../lib/carrito.ts .../contexts .../components
(vacío: ni una línea de producción tocada)
```

```
$ npm --prefix front/Andres_Bakery run test
 Test Files  2 failed | 18 passed (20)
      Tests  18 failed | 238 passed (256)
```

Los 18, literales (recorte de los más representativos):

```
 FAIL  src/lib/carrito.aviso.test.ts > avisoDeAgregado > nombra el tamaño cuando se eligió uno (D29)
AssertionError: expected { Object (texto) } to deeply equal { Object (texto) }
- Expected
+ Received
  {
-   "texto": "«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito",
+   "texto": "«Cheesecake de Frutos Rojos» se agregó al carrito",
  }

 FAIL  src/lib/carrito.aviso.test.ts > avisoDeAgregado > los dos tamaños de la misma torta dan DOS avisos, no uno (D29)
AssertionError: expected [ Array(1) ] to deeply equal [ …(2) ]
- Expected
+ Received
  [
-   "«Cheesecake de Frutos Rojos» (8 porciones) se agregó al carrito",
-   "«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito",
+   "«Cheesecake de Frutos Rojos» se agregó al carrito",
  ]

 FAIL  src/lib/avisos.test.ts > elPlazoCorre · pausar lo que se va solo (D30, WCAG 2.2.1) > con el foco del teclado adentro, el plazo NO corre
TypeError: elPlazoCorre is not a function

 FAIL  src/lib/avisos.test.ts > cerrarConEscape (D30) > con el foco afuera, el error se QUEDA: un error que desaparece es un error perdido (C3)
TypeError: cerrarConEscape is not a function

 FAIL  src/lib/avisos.test.ts > aDondeVuelveElFoco (D30, WCAG 2.4.3) > el `body` no es un destino: devolverle el foco al body ES el síntoma
TypeError: aDondeVuelveElFoco is not a function
```

Los 18 rojos, por grupo: **2** de D29 (los dos de arriba; los otros 5 de ese archivo son los que ya
existían y los que describen la forma del texto, que pasaban), **4** de `elPlazoCorre`, **4** de
`agregarRetencion`/`quitarRetencion`, **4** de `cerrarConEscape` y **4** de `aDondeVuelveElFoco`.

> **Un test de esta tanda NO pudo verse en rojo contra la base, y lo digo en vez de esconderlo:**
> `expect(msParaIrse("exito")).toBe(4000)` **pasa** en `d9fd66b`, porque la constante ya valía
> 4000. Ese es justamente el punto de D32: el valor estaba bien y **nadie lo cuidaba**. Su rojo es
> el **mutante M3** de la sección 4, no un rojo contra la base. Un test que nunca vio rojo no
> prueba nada; éste lo vio en la única forma en que podía verlo.

## 3 · El verde · los cuatro comandos de `harness.config.json`

```
$ npm --prefix front/Andres_Bakery run test
 Test Files  20 passed (20)
      Tests  256 passed (256)          (piso: 234 · +22)

$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
Ran 368 tests in 101.304s
OK                                      (piso: 368 · sin regresiones; el back no se tocó)

$ npm --prefix front/Andres_Bakery run lint
> eslint .
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
(sin salida: limpio)

$ npm --prefix front/Andres_Bakery run build
✓ 1868 modules transformed.
dist/assets/index-ukpe8W5L.js   428.10 kB │ gzip: 128.49 kB
✓ built in 3.69s
```

## 4 · Mutación · 9 mutantes muertos, y 1 que sobrevive y lo digo (R29)

Cada uno rompe **una** línea de producción, corre la suite entera y restaura el archivo desde una
copia en memoria, **comparando el sha256 antes y después** (`restaurado: true` en los nueve).
**No se usó `git restore` ni `git checkout`** en ningún momento de esta tanda.

| # | Mutante | Suite | Lo que cayó |
|---|---|---|---|
| M1 | el aviso deja de nombrar la variante | 2 failed / 254 | los dos tests de D29 |
| M2 | `variante.name` sin `.trim()` | 1 failed / 255 | «una variante sin nombre no deja un paréntesis vacío colgado» |
| M3 | `MS_PARA_IRSE_SOLO` 4000 → 3000 | 2 failed / 254 | los dos del plazo (**el rojo de D32**) |
| M4 | `elPlazoCorre` ignora las retenciones | 3 failed / 253 | foco, mouse, y «sacar el mouse NO reanuda si el teclado sigue adentro» |
| M5 | `agregarRetencion` apila el mismo motivo dos veces | 1 failed / 255 | «entrar con el mouse no cuenta doble» |
| M6 | Escape ignora qué aviso tiene el foco | 2 failed / 254 | los dos de «con el foco adentro» |
| M7 | el Escape global se lleva el error también | 2 failed / 254 | los dos de «con el foco afuera» (**C3**) |
| M8 | el `body` vuelve a ser destino válido | 1 failed / 255 | «el `body` no es un destino» |
| M9 | un elemento desmontado vuelve a ser destino válido | 1 failed / 255 | «un elemento que ya no está en la página no sirve» |

Salida literal de dos de ellos:

```
{ "mutante": "M3 · D32 · el plazo pasa de 4000 a 3000",
  "restaurado": true, "tests": "2 failed | 254 passed (256)",
  "fallidos": [ "src/lib/avisos.test.ts > msParaIrse > el éxito se va a los 4 segundos exactos: suficiente para leerlo, no más",
                "src/lib/avisos.test.ts > msParaIrse > el aviso tiene el mismo plazo que el éxito" ] }

{ "mutante": "M7 · D30 · el Escape global se lleva el error también (contra C3)",
  "restaurado": true, "tests": "2 failed | 254 passed (256)",
  "fallidos": [ "... > con el foco afuera, Escape se lleva los que se iban a ir solos",
                "... > con el foco afuera, el error se QUEDA: un error que desaparece es un error perdido (C3)" ] }
```

Tras los nueve: `git status --short` sin cambios inesperados y la suite de vuelta en **256/256**.

**Y un décimo que SOBREVIVE, medido a propósito porque es el hueco de la sección 7.** Le saqué al
`<div>` de la región las dos líneas que enchufan la pausa por teclado:

```
M10 · borro  onFocus={alEntrarElFoco} / onBlur={alSalirElFoco}  de RegionDeAvisos.tsx
$ npm --prefix front/Andres_Bakery run test
 Test Files  20 passed (20)
      Tests  256 passed (256)        <-- VERDE con D30 desenchufado
restaurado: True
```

Eso no es un defecto de los tests que escribí: es **la frontera de ADR-023** (Vitest en `node`, sin
jsdom). Lo digo acá para que nadie lea «256 en verde» como «D30 está cuidado por la suite».

## 5 · El navegador (R07) · a 390 px, con la carta real

**El MCP de Playwright conectó esta vez.** No hizo falta el camino de CDP a mano que describe
`status.md` §1 («Navegador sin Playwright»); los que no conectaron fueron `github` y `codegraph`.
Servidores propios: back `127.0.0.1:5000`, front `localhost:5173`, **los dos apagados al terminar**
(§8). Producto 2 (Cheesecake de Frutos Rojos), el único con variantes.

> **Detalle de ruteo que cuesta media hora si no se sabe: el sitio usa `HashRouter`.** La URL de
> una ficha es `http://localhost:5173/#/producto/<slug>`; sin el `#` el servidor devuelve el
> index y React muestra la **home**, con el `h1` del carrusel, que se parece lo suficiente a una
> ficha como para creerle.

### 5.1 · D29 · los dos tamaños, en pantalla al mismo tiempo

```
paso: "agrego 8 porciones"
  avisos: 1   textos: ["«Cheesecake de Frutos Rojos» (8 porciones) se agregó al carrito"]
paso: "agrego 12 porciones (otro renglon, mismo nombre)"
  avisos: 2   textos: ["«Cheesecake de Frutos Rojos» (8 porciones) se agregó al carrito",
                       "«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito"]
carrito: Subtotal $ 34.000      (14.200 + 19.800, los dos renglones del review)
```

Contra lo que midió el review de T23 en el mismo lugar: `avisos: 1` en los dos pasos.

### 5.2 · D30 · el plazo se pausa con el foco en la X

```
enfoco la X del primer aviso
  avisosEnPantalla: 1   activo: "BUTTON"   activoEsBody: false
  aria: "Cerrar el aviso ««Cheesecake de Frutos Rojos» (8 porciones) se agregó al carrito»"
   ... 4300 ms ...
  avisosEnPantalla: 1   activo: "BUTTON"   activoEsBody: false   (sigue ahí, y el foco también)
```

Foto: `C:\Users\Facundo\Estudio_Trabajo\Cerebro\.playwright-mcp\aviso-pausado.png` — el aviso en
pantalla pasados los 4 s, con el anillo de foco en su X, y el carrito detrás con los dos renglones.

### 5.3 · Y es una pausa, no un apagado

```
aviso nuevo, el foco esta AFUERA del aviso (en «Ir al checkout»)
  avisos: 1   foco: BUTTON «Ir al checkout»
   ... 4300 ms, sin tocar nada ...
  avisos: 0   foco: BUTTON «Ir al checkout»     (se fue solo, y el foco quedó donde estaba)
```

Y el ida y vuelta, en una sola corrida:

```
estado al empezar (la X enfocada)              avisos: 1  foco: BUTTON «Cerrar el aviso …»
muevo el foco a «Ir al checkout»               avisos: 1  foco: BUTTON «Ir al checkout»
vuelvo el foco a la X antes de los 4 s         avisos: 1  foco: BUTTON «Cerrar el aviso …»
```

### 5.4 · Escape cierra, y el foco NO termina en `body`

Tecla de verdad (`page.keyboard.press("Escape")`), con la X enfocada:

```
tras apretar Escape con la X enfocada
  avisos: 0
  activo: "BUTTON"   activoEsBody: false   foco: BUTTON «Ir al checkout»
  drawerSigueAbierto: true
```

Con el foco **afuera** del aviso (el Escape global):

```
aviso en pantalla, el foco esta en «Agregar 1» (AFUERA del aviso)   avisos: 1  foco: BUTTON «Agregar 1»
tras un Escape global                                               avisos: 0  foco: BUTTON «Agregar 1»
```

**Sin regresiones de Escape** (el listener nuevo es del documento y no corta la propagación):

```
menu cerrado                 menuAbierto: false
tras clickear el menu ☰      menuAbierto: true
tras Escape                  menuAbierto: false
```

### 5.5 · El mouse de verdad: pausa y clic

Puntero real de Chromium sobre la X, sin tocar el teclado:

```
el mouse de verdad sobre la X          avisos: 1  foco: BUTTON «Agregar 1»
 ... 4400 ms, con el mouse quieto ...  avisos: 1  foco: BUTTON «Agregar 1»
tras el clic de verdad en la X         avisos: 0  foco: BUTTON «Agregar 1»
```

La última línea es la otra mitad de WCAG 2.4.3: el clic real enfoca la X (Chrome enfoca el botón en
`mousedown`), y al cerrar el foco **vuelve al botón que lo tenía antes**, no al `body`.

### 5.6 · El texto más largo, barrido punto por punto (no un punto por botón)

D29 **alarga el texto del aviso**, y este repo ya pagó caro un arreglo de `pointer-events`
declarado completo midiendo un punto por botón. Con el aviso en pantalla, a 390 px, barriendo
**cada píxel** de la superficie de los botones de la barra de abajo:

```
textoDelAviso: "«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito"
altoDelCartel: 64   anchoDelCartel: 343   viewport: 390x844

boton "Ver carrito":  puntos 5808   robados por el aviso 256  = 4.41 %   ladrones: { "la X del aviso": 256 }
boton "Ayuda":        puntos 4312   robados por el aviso   0  = 0 %
```

El cartel roba **0**: el `pointer-events-none` de T23 sigue en pie y el único ladrón es la X, que
no cambió de tamaño. Y la pregunta que de verdad importaba —**¿el texto más largo agranda el
cartel?**— medida clonando el cartel real y midiendo el mismo nodo con los tres textos:

```
"«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito"   alto 64   X de 16 px
"«Cheesecake de Frutos Rojos» se agregó al carrito"   (como era)     alto 64   X de 16 px
"«Brownie Tentacion» se agregó al carrito"            (sin variante) alto 64   X de 16 px
```

**El mismo alto, los tres.** D29 no mueve un píxel de la geometría con la carta de hoy.

Con nombres de catástrofe, que es donde esto podría romperse, el cartel **crece pero no desborda**
(el `min-w-0` + `break-words` de T23 aguanta):

```
"«TortaDeChocolateConDulceDeLecheYMerengue» se agregó al carrito"                      alto  64  X en x=343  seSaleDePantalla: false
"«TortaDeChocolateConDulceDeLecheYMerengue» (12 porciones) se agregó al carrito"       alto  84  X en x=343  seSaleDePantalla: false
"…» (PorcionesParaVeinticuatroPersonas) se agregó al carrito"                          alto 104  X en x=343  seSaleDePantalla: false
```

El ancho de página se queda en 375 px en los tres (sin desborde horizontal). Lo que sí pasa con un
cartel de 104 px es que **la X sube 40 px**, o sea se para sobre otra parte del botón de abajo. Con
la carta de hoy no ocurre (los tres textos reales dan 64), pero queda anotado abajo como riesgo.

## 6 · DRIFT y decisiones declaradas (R25)

**DRIFT 1 — la tarjeta manda al hallazgo equivocado (dato, no instrucción · R26).**
El encargo dice que «Escape tampoco cierra el aviso» es parte del **hallazgo 7** de `review_T23.md`.
Fui a verificarlo antes de actuar: el hallazgo 7 es **solo** la pérdida de foco; `trasEscape:
{ avisos: 1 }` está en el **hallazgo 8** («El link del aviso es el penúltimo de 48 paradas de
tabulación»), que además se declara a sí mismo obsoleto *«si se toma la opción A y el link se saca,
este hallazgo se va con él»* — y A es la que se tomó (ADR-037). **Qué dice:** D30 = hallazgo 7.
**Qué encontré:** D30 = hallazgo 7 + la mitad viva del 8. **Opciones:** (A) corregir la cita en
`status.md` D30 a «hallazgos 7 y 8»; (B) dejarlo. **Recomiendo A**, una línea: el próximo que
vaya a verificar D30 contra el hallazgo 7 no va a encontrar ahí el Escape y va a creer que me lo
inventé. No lo toco yo porque `status.md` lo escribe el leader.

**DRIFT 2 — D29 queda con un resto, y no es el que D29 nombra.**
D29 dice «junta los **dos tamaños**» y su salida declarada es «que el aviso nombre la variante
cuando hay una». Eso está hecho y medido. Pero el mismo hallazgo 6 del review dice, en una línea
que la tarjeta no recogió: *«Lo mismo pasa con dos rellenos distintos del mismo tamaño»*. **Lo
medí, y sigue pasando.** Dos Cheesecakes de 12 porciones, uno con Dulce de leche y otro con
Chocolate, son **dos renglones** en el carrito (`claveDelRenglon` los separa bien) y **un solo
aviso**, porque `addItem` le pasa al texto la variante y nada más:

```
(test temporal, corrido y borrado · no quedó en el repo)
DRIFT2 avisos = 1 ["«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito"]
AssertionError: expected [ { id: 'aviso-2', …(2) } ] to have a length of 2 but got 1
``` **Opciones:** (A) dejarlo así y anotarlo como deuda
nueva; (B) que el aviso nombre también los sabores elegidos; (C) que el dedup compare la clave del
renglón en vez del texto. **Recomiendo A ahora y C después**, no B: los sabores de este producto
suman 34 caracteres al texto, y la sección 5.6 muestra que ahí el cartel pasa de 64 a 104 px y la X
se para sobre otra parte del botón de abajo — arreglaríamos un aviso perdido creando el robo de
clics que T23 y T24 tardaron dos tarjetas en sacar. C es más barato y no toca la geometría, pero es
otra tarjeta: toca el dedup, que es justo el BAJA que la consigna dejó afuera. **No lo arreglé en
silencio y tampoco lo escribí en `status.md`**, que lo escribe el leader.

**Decisión declarada — qué hace Escape, exactamente.**
D30 dice «Escape tampoco cierra el aviso», a secas. Lo implementé **partido en dos**, y el reviewer
tiene que saberlo para no medir la pregunta equivocada:

- Foco **adentro** del aviso ⇒ Escape cierra **ese** aviso, sea éxito o error, y devuelve el foco.
- Foco **afuera** ⇒ Escape se lleva los que se iban a ir solos y **deja el error en pantalla**.

El motivo del recorte es medido, no estético: el listener es del documento —tiene que serlo, porque
el cartel casi nunca tiene el foco— y en este sitio **Escape ya cierra** el menú de cuenta, el
NavDrawer, el panel de Ayuda y los `<dialog>` del panel. Si Escape se llevara todo, cerrar un modal
borraría un error que nadie leyó, que es exactamente lo que `seVaSolo` existe para evitar (C3). El
mutante M7 es el que cuida esa línea. Si el humano prefiere «Escape se lleva todo», es cambiar el
`filter` por `[]` y borrar un test.

## 7 · Lo que NO está cubierto por un test automático (hueco declarado)

El front corre en Vitest con `environment: "node"` y **sin jsdom** (ADR-023), así que **nada de lo
que vive adentro de React tiene test**: el cableado de `onFocus`/`onBlur`/`onMouseEnter`, el
listener de Escape, el `data-aviso`, la restauración del foco y el efecto de los plazos. Lo que
está probado son **las decisiones**, que es donde vive la lógica; lo que lo sostiene es la sección 5,
medida en un navegador de verdad. Dicho en una línea, y **medido** (mutante M10 de la sección 4):
**borrarle el `onFocus` al `<div>` de la región deja las 256 en verde.** Es el mismo hueco de clase
que `capasFijas.ts` vino a tapar para los `fixed`, y conviene decirlo antes que descubrirlo.

Dentro de ese hueco hay un caso concreto: el ítem de **D32 del `useMemo`** (`avisos` en las
dependencias de `CartContext`) **no tiene ni puede tener test hoy**, porque su efecto es nulo
mientras `avisar` siga siendo estable — el propio review lo midió así (hallazgo 17: diez clics,
diez avisos correctos). Es un cambio **declarativo**: saca una suposición invisible de un archivo
que no puede verla.

También quedó sin medir en el navegador el **aviso de error** (`tono: "error"`): hoy el único
productor de errores es el panel de admin (`usePanelDeAdmin.ts`), y llegar hasta ahí pedía
loguearse y forzar un guardado fallido contra la base de desarrollo. Decidí **no tocar la base**;
esa rama está cubierta por los tests puros y por M7.

## 8 · Estado del árbol, servidores y base

```
$ git status --short
 M front/Andres_Bakery/src/components/RegionDeAvisos.tsx
 M front/Andres_Bakery/src/contexts/AvisosContext.tsx
 M front/Andres_Bakery/src/contexts/CartContext.tsx
 M front/Andres_Bakery/src/lib/avisos.test.ts
 M front/Andres_Bakery/src/lib/avisos.ts
 M front/Andres_Bakery/src/lib/carrito.test.ts
 M front/Andres_Bakery/src/lib/carrito.ts
?? front/Andres_Bakery/src/lib/carrito.aviso.test.ts
```

- **Nada commiteado, nada pusheado, ningún `git restore`/`checkout`** (R01 activa).
- Los archivos nuevos y los reescritos quedaron **normalizados a CRLF**, como el resto del repo.
- **La base de desarrollo no se tocó**: la verificación solo hizo `GET /api/products` y agregó al
  carrito, que vive en `localStorage` del navegador de prueba. Ni una escritura, ni una migración.
- Servidores apagados y verificado: `back 5000: caido`, `front 5173: caido`.
- `backend/.env` no se abrió.

## 9 · MDs

Este archivo, y nada más. `status.md`, `spec.md`, `decisions.md`, `features.md`, `testing.md` y
`changelog.md` los escribe el leader; lo que haría falta ahí está en la sección 6 (los dos DRIFT) y
en la 10 (versión y changelog propuestos).

## 10 · Próximo paso propuesto

1. **Leer los dos DRIFT de la sección 6** y decidir. El 1 es una línea en `status.md`; el 2 es una
   deuda nueva.
2. **Reviewer independiente** (R30): no puedo verificarme a mí mismo. Lo que más conviene que
   re-ejecute: los 9 mutantes (sección 4), el barrido de la 5.6 —con sus propios anchos, no solo
   390— y el Escape con el foco afuera, que es la decisión que más fácil se discute.
3. Con el OK, **commit** como `0.17.2` (PATCH: dos deudas y media, sin feature nueva) con una
   entrada de changelog por D29, D30 y los dos ítems de D32.
4. D32 queda **abierta a la mitad**: el `aria-label` de la X y el reordenamiento del dedup siguen
   sin tocar, por consigna.

## 11 · Riesgos

| # | Riesgo | Qué tan grande | Qué lo tapa |
|---|---|---|---|
| 1 | El cableado de React no tiene test: borrar el `onFocus` de la región deja las 256 verdes | **El más grande de esta tanda** | la sección 5, y un reviewer que vuelva a mirarlo en el navegador. Taparlo de verdad pide jsdom + RTL, o sea revisar ADR-023 |
| 2 | Un nombre de producto largo **más** una variante larga lleva el cartel a 104 px y sube la X 40 px, sobre otra parte del botón de abajo | Medio: con la carta de hoy no pasa (los tres textos reales dan 64 px) | el barrido de 5.6; si Andrea carga un nombre así, hay que volver a barrer |
| 3 | La retención es de la **región**, no de cada aviso: el mouse sobre la X de uno pausa los tres | Bajo, y es lo que hacen los toasts | son tres carteles en una columna que se lee junta; separarlo pide un mapa id→motivos |
| 4 | Si el aviso enfocado se cierra sin que el foco llegue a moverse, el navegador no dispara `focusout` y la retención `foco` quedaría colgada **dejando a todos los avisos siguientes sin plazo** | Bajo | tres redes: `liberar("foco")` explícito al cerrar por X y por Escape, y un efecto que limpia las retenciones cuando la cola queda vacía |
| 5 | El Escape global corre un `setAvisos` en cada tecla Escape del sitio | Muy bajo | `escapar` devuelve **la misma cola** si no se lleva nada: sin aviso en pantalla, no hay re-render |

## 12 · Costo

Rol `implementer`, un modelo alto, una vuelta. Sin `n/d`: una sesión, sin reintentos de los que
cuestan (el único tiempo perdido fue descubrir el `HashRouter`, anotado en §5 para el que venga).
