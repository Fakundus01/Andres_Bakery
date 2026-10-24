# REVIEW · T23-F64 · Avisos al admin y a quien compra

**Reviewer independiente (R30/R31).** No implementé nada de esta tanda. Todo lo de abajo lo
re-ejecuté yo: los cuatro comandos, el rojo de R29 contra el módulo mutado a mano, el navegador a
390 px y a 1920 px con barrido de puntos sobre cada botón, el panel (que el handback declara sin
mirar), y tres cosas que nadie midió: diez avisos seguidos, un nombre de producto largo y un
`<script>` viajando desde la base hasta el texto del aviso.

**Hash contra el que corrí todo:** árbol de trabajo sucio sobre `4bb20b0` (T20-F61, 0.16.0),
exactamente el `git status` del handback: 8 modificados + 7 sin seguimiento (más el propio
`handback_T23.md`, que es el octavo sin seguimiento). Verifiqué al terminar que el árbol quedó
igual que al empezar y que `lib/avisos.ts` volvió byte por byte
(`sha256 d0bc8d3d…5131dad7` antes y después de las dos mutaciones).

## Veredicto

**CHANGES_REQUESTED** · 12 hallazgos: **3 ALTA · 3 MEDIA · 6 BAJA**

El mecanismo está bien pensado y la decisión difícil está bien tomada: el error **no** se va solo y
el tope se lleva primero un éxito antes que un error, con el test que lo sostiene y que **sí vio
rojo** (lo repetí, hallazgo 11). El `aria-live` nace vacío, el tope de 3 aguanta diez avisos
seguidos sin crecer, y el `<script>` en el nombre del producto **no se ejecuta** (hallazgo 12: la
sospecha de seguridad era buena y el código estaba bien).

Lo que pido cambiar es **el arreglo de los `pointer-events`, que está incompleto**: el handback midió
un punto —el centro del botón de pagar— y declaró el defecto cerrado. Barriendo los botones punto
por punto a 390 px, el aviso **sigue robando clics de tres botones**, y al que más le roba no es el
de pagar: es el de «Ayuda», al que le come **el 27%**. El ladrón principal es el link «Ir al
carrito», que es justo el que el handback propone sacar en su opción A. Más dos cosas de la misma
familia que nadie midió —un nombre de producto de 40 caracteres sin espacios desborda la página
entera y manda la X del aviso fuera de pantalla, y el dedup se come la confirmación del segundo
tamaño de la misma torta **con la carta de hoy**, no con nombres duplicados hipotéticos— y un
criterio (C1) que el handback declara cumplido y no está.

**El hueco declarado lo cerré yo** (hallazgo 10): el aviso del panel se ve, dice «Etiqueta
guardada.», y la barra verde ya no está. Eso ya no bloquea nada.

---

## 1 · Los cuatro comandos (R30), re-ejecutados

### `test` (back · unittest, desde la raíz)

```
$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
----------------------------------------------------------------------
Ran 365 tests in 93.309s

OK
```

365 OK, como declara. (93,3 s contra los 93,7 s del handback.)

### `test_front`

```
$ npm --prefix front/Andres_Bakery run test
 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery

 Test Files  18 passed (18)
      Tests  224 passed (224)
   Start at  09:21:39
   Duration  1.32s
```

18 archivos / 224 tests, como declara. Los 17 nuevos están todos en `lib/avisos.test.ts` (los
conté: 3 + 3 + 2 + 7 + 2).

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
✓ 1868 modules transformed.
dist/index.html                   1.19 kB │ gzip:   0.60 kB
dist/assets/index-B82F_B2b.css   36.23 kB │ gzip:   7.35 kB
dist/assets/index-Dd9W5Qf1.js   426.60 kB │ gzip: 128.00 kB
✓ built in 7.72s
```

**Los dos hashes del bundle coinciden exactamente** con los del handback (`index-Dd9W5Qf1.js`,
`index-B82F_B2b.css`): es el mismo árbol, no uno parecido.

**Los cuatro comandos: verdes, y los números que declara son los números.**

---

## 2 · R05 · los 15 archivos del diff, medidos

```
   95  front/Andres_Bakery/src/lib/avisos.ts                   (nuevo)
  129  front/Andres_Bakery/src/lib/avisos.test.ts              (nuevo)
   98  front/Andres_Bakery/src/contexts/AvisosContext.tsx       (nuevo)
   71  front/Andres_Bakery/src/components/RegionDeAvisos.tsx    (nuevo)
   30  front/Andres_Bakery/src/App.tsx
  215  front/Andres_Bakery/src/contexts/CartContext.tsx
  146  front/Andres_Bakery/src/pages/admin/AdminPage.tsx
  290  front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts   ← el más alto
  113  backend/config.py
   76  backend/.env.example
  221  sdd/features.md
  150  sdd/status.md
   (+ las 3 tarjetas nuevas de sdd/cards/)
```

**R05 se cumple: ninguno pasa de 300.** `usePanelDeAdmin.ts` en 290 es exactamente lo que el
handback declara en su riesgo 4, y está bien dimensionado (hallazgo 9).

---

## 3 · ALTA · El arreglo de los `pointer-events` está incompleto: a 390 px el aviso todavía le roba clics a tres botones

**Qué dice el handback:** que el aviso se comía el clic de «Ir al checkout» a 390 px, que lo arregló
sacándole `pointer-events-auto` al cartel y dejándolo solo en el link y en la X, y que lo midió
después:

```
checkout            → quienRecibeElClic: "BUTTON Ir al checkout"   ✓
link del aviso      → quienRecibeElClic: "A Ir al carrito"         ✓
X del aviso         → quienRecibeElClic: "path"  (el svg del botón) ✓
```

**Qué encontré:** esa medición es de **un punto por botón**, el del centro. El centro está bien. Los
bordes no. Barriendo cada botón de la pantalla punto por punto (una muestra cada 3 px) con un aviso
en pantalla, a 390 × 844:

```
victima                   robados   de      %      quien lo roba
Ir al checkout                 15   1498    1.0    la X de cerrar
Ver el carrito completo       144   1498    9.6    el link «Ir al carrito»
Ayuda                         120    448   26.8    el link «Ir al carrito»
```

Las tres víctimas, con sus rectángulos medidos:

```
aviso                 top 740  bottom 828  left 16   right 359
  link «Ir al carrito»  top 796  bottom 816  left 60   right 131   (pointer-events: auto)
  X de cerrar           top 752  bottom 768  left 327  right 343   (pointer-events: auto)

Ir al checkout        top 720  bottom 764  left 28   right 351
Ver el carrito compl. top 776  bottom 820  left 28   right 351
Ayuda                 top 776  bottom 820  left 24   right 122
```

La X (327-343 × 752-768) entra 12 px dentro del botón de pagar por su esquina inferior derecha. El
link (60-131 × 796-816) cae **entero** adentro de «Ver el carrito completo» y de «Ayuda».

**Lo mismo con DOS avisos apilados** (que es lo que nadie midió), reproducido agregando un producto,
cerrando el drawer y agregando otro:

```
cantidadAvisos: 2
rectsAvisos:  [{top: 644, bottom: 732}, {top: 740, bottom: 828}]
links:        [{top: 700, bottom: 720}, {top: 796, bottom: 816}]
equis:        [{top: 656, bottom: 672}, {top: 752, bottom: 768}]
checkoutRect:  {top: 720, bottom: 764}
→ puntosRobados: 12/891 (1.3%), todos de la X del segundo aviso
→ centro del botón de pagar: "BUTTON Ir al checkout"   ✓
→ desborde: 0
```

Apilar **no empeora** el botón de pagar, y eso es información buena. Pero mirá el link del primer
aviso: `bottom: 720`, y el botón de pagar arranca en `top: 720`. **Cero píxeles de margen.** No se
tocan porque los números dan justo, no porque algo lo impida: cualquier cosa que haga el aviso un
píxel más alto mete el link adentro del botón de pagar (y el hallazgo 5 demuestra que un nombre de
producto cualquiera lo hace más alto).

**A 1920 × 1080, limpio:** `puntosDelBotonDePagarRobados: 0/1848`, `desborde: 0`, el aviso en
`729-1177 × 996-1064` y el botón de pagar en `1485-1881 × 956-1000`: no se cruzan. Por eso la
medición a 1920 del handback no vio nada, y por eso medir el centro a 390 tampoco.

**Por qué importa:** el handback dice que el defecto era «bloquear el camino a pagar durante cuatro
segundos» y lo arregló al 99%. El 1% que queda es la esquina del botón de pagar, que en un celular
es donde cae el pulgar derecho. Y el botón al que más le roba —«Ayuda», 27%— no lo miró nadie: quien
quiere ayuda justo después de agregar algo al carrito toca el link del aviso y se va al carrito.

**Qué pediría:** la opción **A** del handback (sacar el link) y nada más. Está medido que el ladrón
grande es el link, y el handback ya argumenta solo que es redundante porque `addItem` abre el
drawer. Sacarlo baja los tres números a cero salvo los 15 puntos de la X, que se cierran subiendo el
`bottom` de la región o dándole al cartel un margen inferior que lo despegue de la zona de botones.
Si se decide B (dejarlo), entonces esto hay que arreglarlo aparte.

---

## 4 · ALTA · C1 no se cumple, y el handback declara que sí: quedan cuatro mecanismos de aviso ad-hoc, tres de ellos adentro del panel

**Qué dice la tarjeta (C1):** *"Un solo mecanismo para todo el sitio, panel incluido: un
`AvisosContext` con su región de pantalla, y los tres mecanismos de hoy **migrados a él**. Esta
tarjeta no deja un cuarto."*

**Qué dice el handback**, en la tabla de «Hecho»:

| Dónde | Antes | Ahora |
|---|---|---|
| Mecanismo | uno por pantalla, ad-hoc | **uno** (`AvisosContext` + `RegionDeAvisos`) para todo el sitio |

**Qué encontré:**

```
$ grep -rn "setAviso" front/Andres_Bakery/src/pages/
pages/admin/OpcionesTab.tsx:59:           const [aviso, setAviso] = useState("");
pages/admin/SaboresDelGrupo.tsx:34:       const [aviso, setAviso] = useState("");
pages/admin/SelectorDeIngredientes.tsx:37: const [aviso, setAviso] = useState("");
pages/admin/usePanelDeAdmin.ts:54:        const setAviso = (mensaje: string) => {   ← el único migrado
```

Los tres primeros **no son nombres de variable sueltos: son avisos en pantalla**, cada uno con su
propio cartelito y su propio estilo:

```tsx
// SaboresDelGrupo.tsx:255-259
{aviso ? (
  <p className="mt-2 border-[3px] border-borde bg-superficie-alt px-3 py-2 text-xs ...">{aviso}</p>
) : null}

// SelectorDeIngredientes.tsx:135-139
{aviso ? (
  <p className="mt-2 border-[3px] border-borde bg-superficie px-3 py-2 text-xs ...">{aviso}</p>
) : null}

// OpcionesTab.tsx:156 y 212 — se lo pasa al FormularioDeGrupo, dos veces
<FormularioDeGrupo onCrear={crear} aviso={aviso} />
```

Y **`ProductPage.tsx` no se tocó**, aunque la tarjeta lo lista en su zona de archivos como
`ProductPage.tsx (274 -> su aviso migra)` y C9 afirma que *"también baja"*:

```
$ git status --porcelain | grep ProductPage        (sin salida: no está en el diff)
$ wc -l front/Andres_Bakery/src/pages/ProductPage.tsx
274                                               (no bajó: quedó igual)
$ grep -n "aviso" front/Andres_Bakery/src/pages/ProductPage.tsx
236:  {/* El aviso va pegado al botón, que es donde la persona está mirando. */}
```

Contados: después de esta tanda el sitio tiene **seis** mecanismos de aviso en pantalla
—`AvisosContext` (nuevo), `ErrorBanner` (se queda a propósito, C2b), los tres locales del panel, y
el de `ProductPage`— donde C1 pedía uno y prohibía explícitamente dejar un cuarto.

**Por qué importa, y qué NO estoy diciendo:** no creo que los tres del panel tengan que migrar. Son
mensajes pegados a su formulario («Ya tenés un grupo que se llama «X»», «No se pudo agregar «Y»»,
el recargo mal escrito) y **el razonamiento de C2b los cubre perfecto**: un error de formulario va
al lado del formulario. Lo mismo el `falta` de `ProductPage`, que avisa que falta elegir el relleno
justo arriba del botón. Esa decisión es la correcta.

Lo que está mal es que **se tomó en silencio**. R25 es explícito: *"spec mal/incompleta a mitad del
código ⇒ PROHIBIDO arreglarla en silencio ⇒ DRIFT{dice, encontré, opciones, recomiendo} ⇒ OK"*. Acá
la tarjeta pedía migrar tres mecanismos, se migró uno, se dejaron cuatro, y en vez de un DRIFT el
handback escribió en su tabla de «Hecho» que ahora hay **uno para todo el sitio**. Eso es
exactamente lo que el handback dice que aprendió del review de T19 —*"MDs que mandan a arreglar lo
que ya está bien"*— con el signo invertido: un MD que afirma terminado lo que no está, y que el
próximo que lea `features.md` va a creer.

**Qué pediría:** un DRIFT de una línea en `decisions.md` y la corrección de C1 en la tarjeta:
*"migra el éxito compartido del panel; los avisos pegados a un formulario se quedan donde están por
el mismo motivo de C2b"*. Y sacar de C9 la afirmación sobre `ProductPage.tsx`, que no se tocó.

---

## 5 · ALTA · Un nombre de producto de 40 caracteres sin espacios desborda la página entera a 390 px y manda la X del aviso fuera de pantalla

**Qué dice el handback:** *"Desborde horizontal: **0**"*, medido a 1920 px y a 390 px. Y la tarjeta
pone el desborde como criterio del navegador: *"A 390px, que no tape el botón de comprar ni desborde
(`scrollWidth - clientWidth = 0`)"*.

**Qué encontré:** el 0 vale para los cuatro nombres sembrados, que son cortos. El `<p>` del aviso no
tiene corte de palabra y el `div` con `flex-1` no tiene `min-w-0`:

```
estiloDelParrafo: { overflowWrap: "normal", wordBreak: "normal", whiteSpace: "normal",
                    minWidth del contenedor: "auto" }
```

que es el desborde clásico de flexbox por `min-content`. Medido de punta a punta —cambié el nombre
del producto 4 **en la base de desarrollo**, pedí `/api/products`, agregué al carrito a 390 px:

| nombre en `product.name` | token más largo | desborde de la página | la X de cerrar |
|---|---|---|---|
| `Brownie Tentacion` (el de hoy) | 17 | **0** | x=327, visible |
| `TortaDeChocolateConDulceDeLecheYMerengue` | **40** | **242 px** | x=396, **fuera de pantalla** |
| 120 caracteres, un token de 53 | 53 | **390 px** (una pantalla entera) | x=465, **fuera de pantalla** |
| 500 caracteres, un token de 300 | 300 | **4023 px** | x=3197, **fuera de pantalla** |

Con el de 40 caracteres:

```
nombre:  «TortaDeChocolateConDulceDeLecheYMerengue» se agregó al carrito
desbordeHorizontalDeLaPagina: 242
xDelBotonDeCerrar: 396     xVisible: false        (viewport = 390)
anchoDisponibleParaElTexto: 324    anchoQueOcupaElTexto: 324
```

**Dos consecuencias, las dos medidas:**

1. **La página entera se vuelve scrolleable en horizontal** a 390 px. No es el aviso el que se corta:
   es `document.documentElement.scrollWidth` el que crece, así que el header, la carta y el drawer
   quedan desalineados mientras el aviso está en pantalla.
2. **El aviso no se puede cerrar.** La X vive en `x=396` con la pantalla de 390 px de ancho. Y como
   el error **no se va solo** por diseño (C3), un aviso de error con un nombre largo adentro queda en
   pantalla **para siempre**, imposible de cerrar sin scrollear en horizontal.

**¿Es alcanzable?** Sí, y por la puerta de adelante. `Product.name` es `db.String(120)`
(`backend/models/catalogo.py:41`), y `product_service.update` (líneas 73-77) **no acota el largo**:
solo rechaza vacío, a diferencia de los nombres de variante, que sí pasan por
`saneado.normalizar_nombre(..., tope=TOPE_NOMBRE_VARIANTE)`. Con 120 caracteres permitidos y el
umbral del desborde en ~40, Andrea no tiene que hacer nada raro: le alcanza con un nombre pegado
tipo `BoxMeriendaVillaMaipuParaCuatroPersonas`.

**Por qué importa:** es **la misma familia** del defecto que esta tanda vino a arreglar —colisión de
layout a 390 px, invisible para las dos suites— encontrada con la misma herramienta y a dos pasos de
donde él estaba parado. El criterio del navegador de la propia tarjeta (`scrollWidth - clientWidth =
0`) no se cumple con un nombre que la base acepta hoy.

**Qué pediría:** `min-w-0` en el `div` con `flex-1` y `break-words` en el `<p>` de
`RegionDeAvisos.tsx:46-47`. Son dos clases. Y, aparte de esta tarjeta, un tope de largo en
`product_service.update` como el que ya tienen las variantes.

> **La base quedó como estaba.** Hice copia antes
> (`sha256 0e2a7a0f…3c58291`), cambié el nombre del producto 4 cuatro veces, y restauré el archivo
> entero al terminar: los cinco nombres de producto volvieron a los originales y la tabla `user`
> volvió a 3 filas. Lo único que cambió es que `page_view` creció a 25 filas con mi navegación, que
> es lo que la app registra sola cada vez que alguien abre una página.

---

## 6 · MEDIA · El dedup se come la confirmación del segundo tamaño de la misma torta, con la carta de hoy

**Qué dice el handback**, riesgo 3: *"El dedup compara texto exacto. Dos productos con el mismo
nombre darían un solo aviso. **Con la carta de hoy no pasa**, y los nombres son únicos de hecho, no
por regla."*

**Qué encontré:** no hace falta ningún nombre duplicado. El aviso se arma con `product.name` y nada
más (`CartContext.tsx:123`), así que **el mismo producto en dos tamaños distintos produce el mismo
texto**, y el dedup se lleva el primero. Medido en el navegador con el catálogo real, en la ficha del
Cheesecake (que tiene dos variantes):

```
paso: "agrego 8 porciones"
  avisos: 1   textos: ["«Cheesecake de Frutos Rojos» se agregó al carrito"]
paso: "agrego 12 porciones (otro renglón, mismo nombre)"
  avisos: 1   textos: ["«Cheesecake de Frutos Rojos» se agregó al carrito"]
```

Y el carrito, al mismo tiempo, tiene **dos renglones**:

```
CARRITO · Tu compra
  Cheesecake de Frutos Rojos   $ 14.200 por 8 porciones    Relleno: Dulce de leche · Bizcocho: Vainilla   1   $ 14.200
  Cheesecake de Frutos Rojos   $ 19.800 por 12 porciones   Relleno: Dulce de leche · Bizcocho: Vainilla   1   $ 19.800
Subtotal $ 34.000
```

Lo mismo pasa con dos rellenos distintos del mismo tamaño: `claveDelRenglon` separa bien los
renglones (eso anda), pero el aviso los junta.

**Por qué importa:** C6 dice que el del carrito *"es el que hoy no existe y es el más usado del
sitio"*, y C4 dice que *"el segundo no borra el primero"*. En el caso de la torta por encargo —la
que tiene variantes, la que más plata mueve— el segundo **sí** borra el primero. No se pierde plata:
el renglón entra y el drawer está abierto mostrando los dos. Lo que se pierde es la confirmación, que
es lo único que esta feature agrega sobre el drawer.

El riesgo 3 del handback, entonces, está **mal dimensionado en las dos mitades**: dice que no pasa
con la carta de hoy (pasa, lo acabo de medir con el producto 2) y lo atribuye a nombres duplicados
(el disparador real son las variantes, que son una función del producto, no una coincidencia). De
paso: `Product.name` tampoco es `unique` en el modelo (`catalogo.py:41`, comparado con `Tag.name` en
la 124, que sí lo es), así que los nombres duplicados también son posibles.

**Qué pediría:** que el texto del aviso incluya la variante cuando hay una
(`«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito`), que es un dato que `addItem`
ya tiene en la mano. Arregla el caso y además dice más.

---

## 7 · MEDIA · Cuando el aviso se va solo se lleva el foco del teclado a `body`

**Qué dice el handback y la tarjeta:** C5 se declara cumplido (`aria-live`, `role="alert"`), y el
handback mide que el aviso *"se va solo: a los 400ms está; a los 4.600ms ya no"*. Del teclado no
dice nada, ni la tarjeta lo pide.

**Qué encontré.** Medido a 390 px, con un aviso en pantalla: enfoqué su X y esperé el plazo.

```
focoAntes:            { activo: "BUTTON", esLaXDelAviso: true,
                        aria: "Cerrar el aviso ««Brownie Tentacion» se agregó al carrito»" }
   ... 4300 ms ...
focoDespuesDelPlazo:  { avisosEnPantalla: 0, activo: "BODY", activoEsBody: true }
```

El plazo **no se pausa** cuando el aviso tiene el foco (ni al pasar el mouse). A los 4 s React
desmonta el nodo que tenía el foco y el foco cae a `body`: el próximo Tab arranca desde el principio
de la página. Quien navega con teclado pierde su lugar por haber mirado el aviso.

**Por qué importa:** es el patrón que WCAG 2.2.1 pide poder pausar, y la pérdida de foco es 2.4.3.
No es la falla de C5 (el `aria-live` está bien puesto), es lo que falta al lado. Y es gratis
arreglarlo: pausar el plazo mientras el aviso tiene foco o el mouse encima, que es lo que hace
cualquier toast.

**Qué pediría:** pausar el plazo con `onFocus`/`onMouseEnter` y reanudarlo al salir. Si no se hace
ahora, una línea en `status.md` con fecha (R25, deuda).

---

## 8 · MEDIA · El link del aviso es el penúltimo de 48 paradas de tabulación, y vive 4 segundos: C7 no existe para el teclado

**Qué dice la tarjeta (C7):** *"El aviso del carrito dice qué hacer después. Agregar algo al carrito
y que el sitio no ofrezca ir al carrito es el momento exacto en que se pierde una venta: el aviso
lleva un link."*

**Qué encontré.** Con un aviso en pantalla, a 390 px:

```
ordenDeTabulacion: { totalEnfocables: 48,
                     posicionDelLinkDelAviso: 47,
                     posicionDeLaXDelAviso:   48 }
```

La región vive al final del árbol (`App.tsx`: `<AppShell /> <RegionDeAvisos />`), así que el link
«Ir al carrito» es la **parada 47 de 48**. Para alcanzarlo hay que apretar Tab 46 veces, y el aviso
se va a los 4 segundos. Con mouse el link funciona (lo verifiqué: `quienRecibeElClic: "A Ir al
carrito"`); con teclado es inalcanzable en la práctica.

De paso, Escape no lo cierra:

```
trasEscape: { avisos: 1 }
```

**Por qué importa:** C7 es el criterio «no perder la venta», y para una persona que navega con
teclado el criterio no se cumple. Dicho esto: **si se toma la opción A y el link se saca, este
hallazgo se va con él**, porque la X sola no es un camino que haya que ofrecer. Lo anoto porque es
un argumento más —medido— a favor de A.

**Qué pediría:** nada nuevo si se toma A. Si se toma B, mover la región antes de `<AppShell />` en
el orden del DOM (sigue dibujándose abajo, es `fixed`).

---

## 9 · MEDIA · Los cuatro riesgos del handback, pesados uno por uno

| # | Lo que declara | Lo que medí | Veredicto |
|---|---|---|---|
| 1 | *"El panel sin mirar. Es el riesgo real de esta tanda."* | Lo cerré yo (hallazgo 10): el aviso del panel se ve, dice «Etiqueta guardada.», se va a los 4,8 s, y **no quedó ninguna barra verde** fuera de la región | **Ya no es un riesgo.** Estaba bien dimensionado como hueco, y era cerrable en diez minutos |
| 2 | *"Sin tests de componente (D7): ni el defecto de los `pointer-events` ni el 'se va solo' tienen red automática"* | Correcto, y **peor de lo que dice**: sin esa red, el arreglo de los `pointer-events` quedó incompleto (hallazgo 3) y el desborde por nombre largo entró sin que nada chille (hallazgo 5). Dos defectos de layout en una tanda cuyo defecto central era de layout | **Subestimado.** No es «falta red», es «la falta de red ya costó dos defectos en este mismo diff» |
| 3 | *"El dedup compara texto exacto… con la carta de hoy no pasa"* | **Pasa con la carta de hoy** (hallazgo 6): dos tamaños del Cheesecake = 2 renglones, 1 aviso | **Mal dimensionado**, en el disparador y en el «no pasa» |
| 4 | *"`usePanelDeAdmin.ts` quedó en 290 líneas… a 10 del tope de R05"* | `wc -l` → **290**. Exacto | **Bien dimensionado.** Y el comentario de 6 líneas que explica por qué el `""` ya no hace nada se justifica: sin él, el próximo lector borra el `setAviso("")` de `conAviso:174` sin entender qué perdía |

---

## 10 · El hueco declarado: lo cerré · el aviso del panel SÍ se ve, y la barra verde ya no está

**Qué dice el handback:** *"El aviso del panel no se vio en el navegador. Armé un admin temporal con
contraseña random (nunca la tuya) y lo borré al terminar, pero el front entró al panel y el back le
devolvió **401 en todos los endpoints de admin**… Lo que falta mirar es que al guardar una etiqueta
aparezca el aviso y que la barra verde ya no esté."*

**Qué hice.** No repetí el camino del admin temporal: el cambio de esta tanda es **todo de front**
(el back no se tocó), así que la pregunta «¿aparece el aviso al guardar?» se contesta sin tocar
privilegios ni la base. Monté la sesión de admin en el navegador y respondí desde Playwright los
tres endpoints que piden admin (`/api/auth/me`, `/api/orders`, `/api/users`,
`/api/metrics/summary`) y el guardado de la etiqueta; **todo lo demás —productos, etiquetas,
ingredientes, grupos de opciones, `site/about`, `site/profile`— salió del back real en
`127.0.0.1:5000`**. Nada se escribió en la base.

El panel abre:

```
url: #/admin
TU PANEL · Todo lo que vendés, desde una sola pantalla
Resumen | La carta | Etiquetas | Gustos | Pedidos | Tu perfil | Tu historia
VISITAS 0 · PEDIDOS 0 · FACTURACIÓN $ 0 · CLIENTES CON CUENTA 0
```

Y guardando una etiqueta (pestaña Etiquetas → nombre → «Crear etiqueta»):

```
alGuardar: {
  cantidadAvisos: 1,
  textos:  ["Etiqueta guardada."],
  roles:   ["status"],
  rects:   [{ top: 784, bottom: 828, w: 343 }],
  barraVerdeFueraDeLaRegion: [],        ← ningún .bg-exito-suave fuera de la región
  hayErrorBanner: false
}
   ... 4800 ms ...
a4800ms: { cantidadAvisos: 0, regionSigueExistiendo: true }
```

**Las tres cosas que faltaban mirar, verificadas:** el aviso aparece al guardar, **se va solo** a los
4,8 s, y **la barra verde de `AdminPage` ya no existe** (busqué `.bg-exito-suave` fuera de la región
de avisos: cero nodos). Ese hueco queda cerrado y no bloquea el done.

**Una diferencia honesta con lo que el handback declara:** dice *"401 en todos los endpoints de
admin"*. `admin_required` (`backend/routes/utils.py:65-73`) devuelve **403**, no 401:

```python
if not user or not user.is_admin:
    return jsonify({"error": "Admin privileges required"}), 403
```

Un 401 sale de la verificación del JWT, no del chequeo de admin. O sea: lo que rebotó no era el
permiso de admin, era el token —y el síntoma que él describe («la app rebotó a `#/ingresar`») es
consistente con eso, porque `AuthContext` cierra la sesión cuando el back rechaza el token. Para que
el provider levante la sesión hay que tenerla en `localStorage` **antes de que monte**: con la sesión
puesta y después un `reload`, entra; puesta después del montaje, rebota a `#/ingresar` (me pasó, y
está en mis dos corridas). Puede haber sido eso y no «plomería de auth del usuario de prueba». Lo
anoto porque el próximo que intente entrar al panel va a leer ese párrafo y buscar en el lugar
equivocado.

---

## 11 · El rojo de R29: lo repetí y es de verdad

**Qué dice el handback:** que el rojo de suite entera (`Cannot find module './avisos'`) no alcanza
porque es de archivo, no de aserción, así que rompió `acotar` a propósito para que descarte por
antigüedad a secas y vio:

```
× el tope se lleva primero un éxito viejo antes que un error viejo
AssertionError: expected [ 'ok 0', 'ok 1', 'ok 2' ] to include 'no se pudo guardar'
  ❯ src/lib/avisos.test.ts:93:38
```

**Qué hice.** Copié `lib/avisos.ts` (`sha256 d0bc8d3d…5131dad7`), apliqué la misma mutación —saqué
el `findIndex` que busca el más viejo que se iba a ir solo y dejé el `splice(0, 1)` crudo:

```
  while (recortada.length > TOPE_VISIBLES) {
-   const elMasViejoQueSeIba = recortada.findIndex((aviso) => seVaSolo(aviso.tono));
-   recortada.splice(elMasViejoQueSeIba === -1 ? 0 : elMasViejoQueSeIba, 1);
+   recortada.splice(0, 1);
  }
```

y corrí la suite:

```
$ npm --prefix front/Andres_Bakery run test
 ❯ src/lib/avisos.test.ts (17 tests | 1 failed) 24ms
   ❯ agregarAviso (7)
     × el tope se lleva primero un éxito viejo antes que un error viejo 7ms

 FAIL  src/lib/avisos.test.ts > agregarAviso > el tope se lleva primero un éxito viejo antes que un error viejo
AssertionError: expected [ 'ok 0', 'ok 1', 'ok 2' ] to include 'no se pudo guardar'
 ❯ src/lib/avisos.test.ts:93:38
     93|     expect(cola.map((a) => a.texto)).toContain("no se pudo guardar");
       |                                      ^

 Test Files  1 failed | 17 passed (18)
      Tests  1 failed | 223 passed (224)
```

**Idéntico: mismo test, misma línea 93, misma aserción, mismo mensaje.** El rojo que declara es el
rojo que pasa. R29 cumplido, y el check **sí vio rojo**. Restauré el archivo y verifiqué el hash
(`d0bc8d3d…5131dad7`).

**Un mutante que sí sobrevive** (hallazgo 15, abajo): el plazo de 4 segundos no está clavado por
ningún test.

---

## 12 · El `<script>` en el nombre del producto: probado de punta a punta, y no pasa nada

**Lo que nadie miró, y que es seguridad.** El nombre del producto llega de la base y se mete en el
texto del aviso, en el `aria-label` de la X y en el drawer. Lo probé **desde la base**, no desde el
front: escribí el payload en `product.name`, verifiqué que la API lo devuelve tal cual, y agregué el
producto al carrito con el navegador escuchando `pageerror`.

Lo que guardé y lo que la API devuelve:

```
guardado:  '<script>window.__XSS_AVISO__=1</script><img src=x onerror="window.__XSS_IMG__=1">Torta'
la API devuelve el mismo string, sin escapar (es JSON: está bien que lo devuelva así)
```

Lo que llegó al aviso:

```
seEjecutoElScript:   false
seEjecutoElOnerror:  false
innerHTMLDelAviso:   «&lt;script&gt;window.__XSS_AVISO__=1&lt;/script&gt;
                      &lt;img src=x onerror="window.__XSS_IMG__=1"&gt;Torta» se agregó al carrito
etiquetasDentroDelAviso: []          ← cero elementos creados
scriptsEnElAviso: 0    imgsEnElAviso: 0    imgsSospechosas (src="x") en toda la página: 0
ariaLabelDeLaX: 'Cerrar el aviso ««<script>…</script><img src=x onerror="…">Torta» se agregó al carrito'
erroresDePagina: []
```

**Está bien y está bien por el motivo correcto:** el texto entra por `{aviso.texto}` en JSX
(`RegionDeAvisos.tsx:47`) y el `aria-label` por una prop (`:61`), y React escapa las dos cosas. No
hay ningún `dangerouslySetInnerHTML` en el diff ni en el resto del front
(`grep -rn dangerouslySetInnerHTML src/` → sin salida). El `&lt;script&gt;` del `innerHTML` es la
prueba de que escapó: el `<p>` no tiene ni un elemento hijo.

**Lo anoto aunque esté bien porque es información:** la superficie N0 que declara la tarjeta
(*"no hay endpoint nuevo, ni campo nuevo, ni dato nuevo"*) es correcta también por este lado. Un
nombre con HTML no abre nada nuevo; lo único que un nombre raro rompe es el **layout** (hallazgo 5),
no la seguridad.

---

## 13 · Diez avisos seguidos: el tope aguanta

**Lo que nadie miró.** Disparé diez avisos seguidos a 390 px, ciclando los cuatro productos
(agregar → cerrar el drawer → agregar, 90 ms entre cada paso), midiendo el DOM en cada vuelta:

```
vuelta  en el DOM   textos
   1        1       [Brownie]
   2        1       [Brownie]                                  ← repetido: reemplaza, no apila
   3        2       [Brownie, Cookies]
   4        2       [Brownie, Cookies]
   5        3       [Brownie, Cookies, Box]
   6        3       [Brownie, Cookies, Box]
   7        3       [Cookies, Box, Brownie]                    ← reordenó
   8        3       [Cookies, Box, Brownie]
   9        3       [Box, Brownie, Cookies]                    ← reordenó otra vez
  10        3       [Box, Brownie, Cookies]

final en el DOM: 3          altoDeLaRegion: 312 px (37% de 844)
desborde: 0                 regionTop: 532
ariaLive: "polite"          ariaAtomic: "false"       rolesInternos: [status, status, status]
```

**El tope funciona: diez avisos, tres nodos, cero crecimiento, cero desborde.** `TOPE_VISIBLES = 3`
está bien elegido: 312 px es el 37% de la pantalla, molesto pero no tapa el carrito.

Lo que sí aparece es el reordenamiento de las vueltas 7 y 9 (hallazgo 16).

---

## 14 · BAJA · El `aria-label` de la X repite el texto completo del aviso, dentro de un `role="status"` anidado en un `aria-live`

**Dónde:** `RegionDeAvisos.tsx:61` (`aria-label={`Cerrar el aviso «${aviso.texto}»`}`) y `:38`
(`role={aviso.tono === "error" ? "alert" : "status"}`) adentro del `aria-live="polite"` de `:28`.

**Medido** (lo que queda en el subárbol que el `aria-live` anuncia):

```
textoAccesible[0]:
  «Box Merienda Villa Maipú» se agregó al carrito
  Ir al carrito
  | X: Cerrar el aviso ««Box Merienda Villa Maipú» se agregó al carrito»
```

Dos cosas, las dos del mismo nodo:

1. El `aria-label` de la X está **dentro** de la región viva, así que lo que se anuncia al aparecer el
   aviso incluye el texto del aviso **dos veces**.
2. `role="status"` implica `aria-live="polite"` propio: hay una región viva adentro de otra región
   viva. Según el lector, eso puede anunciar dos veces.

**Hasta dónde llega mi medición, y hasta dónde no:** medí el DOM y los roles, **no corrí un lector de
pantalla**. Que el texto esté duplicado en el subárbol anunciado es un hecho; cuántas veces lo lee
NVDA o VoiceOver depende del lector y no lo verifiqué. Lo pongo en BAJA por eso.

**Qué pediría:** `aria-label="Cerrar este aviso"` sin repetir el texto (el `aria-labelledby` o el
contexto ya lo dan), y sacar el `role="status"` del hijo dejando solo el `aria-live` de la región,
que es lo que C5 pide. El `role="alert"` del error sí tiene sentido donde está: es lo que lo hace
`assertive` sin partir la región en dos.

---

## 15 · BAJA · El plazo de 4 segundos no tiene test: el mutante queda verde

**Dónde:** `lib/avisos.ts:26` (`const MS_PARA_IRSE_SOLO = 4000;`) contra
`avisos.test.ts:55-59`:

```ts
it("el éxito tiene un plazo de varios segundos, suficiente para leerlo", () => {
  const ms = msParaIrse("exito");
  expect(ms).not.toBeNull();
  expect(ms).toBeGreaterThanOrEqual(3000);
});
```

**Medido** (mutante aplicado a mano sobre el archivo nuevo, y restaurado después):

```
const MS_PARA_IRSE_SOLO = 4000;   →   const MS_PARA_IRSE_SOLO = 3000;
$ npm --prefix front/Andres_Bakery run test
 Test Files  18 passed (18)
      Tests  224 passed (224)
```

**Por qué importa poco y aun así importa:** C3 dice *"el éxito se va solo (~4s)"*, y el `~` deja
margen, así que 3000 no es un bug. Pero el único test de la constante acepta cualquier cosa de 3000
para arriba, incluido un valor absurdo: nadie va a notar si mañana el aviso se queda 40 segundos.
Es el mismo patrón que el reviewer de T20 marcó en el guard de `Number.isFinite`: el check está, lo
que falta es el test que lo sostenga el día que alguien lo toque.

**Qué pediría:** un `expect(msParaIrse("exito")).toBeLessThanOrEqual(8000)` al lado, o directamente
clavar el valor. Una línea.

---

## 16 · BAJA · El dedup reordena la pila: el aviso repetido salta al final y la pila se mueve bajo el dedo

**Dónde:** `lib/avisos.ts:72-75`. El repetido no se actualiza en su lugar: se **filtra** y se
**vuelve a agregar al final**.

```ts
const sinElRepetido = cola.filter(
  (previo) => !(previo.tono === aviso.tono && previo.texto === aviso.texto),
);
return acotar([...sinElRepetido, aviso]);
```

**Medido** (del hallazgo 13, vueltas 6 → 7):

```
vuelta 6:  [Brownie, Cookies, Box]
vuelta 7:  [Cookies, Box, Brownie]      ← agregué Brownie otra vez: su aviso salta de 1º a 3º
```

Con tres avisos apilados de 88 px, eso mueve dos carteles 96 px cada uno en el mismo frame, justo
arriba de los botones de pagar. Y como la región es `aria-atomic="false"`, un nodo que se mueve es
un nodo que el lector puede volver a anunciar.

**Por qué importa poco:** el comentario del código explica la intención y es buena (*"el id nuevo
hace que su plazo vuelva a empezar, y eso sí importa cuando alguien agrega el mismo producto dos
veces"*). El salto visual es el precio, y el precio no está en el comentario.

**Qué pediría:** conservar la posición (reemplazar en el índice donde estaba, en vez de empujar al
final). El plazo se reinicia igual porque el id es nuevo.

---

## 17 · BAJA · El aviso del carrito se arma con una copia vieja del contexto de avisos; anda hoy por casualidad

**Dónde:** `CartContext.tsx:185-204`. El `value` del carrito está memoizado en `[isCartOpen, items]`,
y `addItem` —que está adentro de ese `useMemo`— cierra sobre `avisos`, que **no** está en las
dependencias:

```tsx
const avisos = useAvisos();                 // :107, objeto nuevo en cada cambio de la cola
...
const value = useMemo<CartContextValue>(() => ({ ..., addItem, ... }), [isCartOpen, items]);
```

Cuando aparece o se va un aviso, `AvisosProvider` arma un `valor` nuevo (su `useMemo` depende de
`avisos`), `CartProvider` se re-renderiza, pero su `useMemo` **no** se recalcula: el `addItem` que
quedó publicado sigue apuntando al objeto `avisos` del render anterior.

**Por qué anda igual, y lo verifiqué:** `avisos.exito` delega en `avisar`, que es un `useCallback`
con dependencias `[]`, o sea **estable para toda la vida del provider**. Así que la copia vieja llama
a la misma función que la nueva. Medido: diez clicks, diez avisos correctos, ninguno perdido
(hallazgo 13).

**Por qué lo anoto:** anda por una propiedad de `AvisosContext` que `CartContext` no declara y no
puede ver. El día que `exito` necesite leer algo del estado de los avisos —por ejemplo «no avises si
ya hay un error en pantalla»— el carrito va a usar una foto vieja y el síntoma va a ser
intermitente. Es una línea: agregar `avisos` al array de dependencias, o sacar `exito` del objeto
memoizado.

---

## 18 · BAJA · C6 quedó a medias, y está bien declarado

**Qué dice la tarjeta (C6):** *"los casos que pidió el humano, andando: 'se agregó al carrito'…
'la etiqueta se guardó', **y los errores de cada uno**"*.

**Qué dice el handback:** *"el tono `error` no tiene todavía ningún productor real. Está construido y
testeado… pero en la app nadie lo dispara… Así que el error flotante existe sin usarse. No lo forcé
para poder tachar el criterio."*

**Qué encontré:** exacto, y no pude medirlo en el navegador por el mismo motivo: no hay forma de
disparar un error flotante desde la interfaz, así que el camino `role="alert"` + «no se va solo» en
pantalla **sigue sin verse**. Lo que sí está verificado es la lógica: los tests de `seVaSolo`,
`msParaIrse` y el del tope que protege al error están, y el del tope **vio rojo** (hallazgo 11).

**Esto no lo cuento como falta en contra.** Declarar un criterio a medias en vez de inventarle un
productor para tacharlo es lo correcto, y es la diferencia entre este handback y uno que miente. Lo
anoto para que quede en el inventario: **el tono `error` no se vio nunca en pantalla**, y el día que
aparezca su primer productor hay que mirarlo (y mirar el hallazgo 5, porque un error con un nombre
largo adentro es el que queda imposible de cerrar).

---

## 19 · Sospechas que verifiqué y estaban bien

Las pongo porque son información: son los lugares donde fui a buscar un bug y el código aguantó.

| Sospecha | Cómo la probé | Resultado |
|---|---|---|
| El `<script>` del nombre del producto se ejecuta en el aviso o en el `aria-label` | Payload en `product.name` en la base → API → navegador escuchando `pageerror` | **Bien.** React escapa; cero elementos creados, cero errores (hallazgo 12) |
| Diez avisos seguidos hacen crecer el DOM sin límite | Diez adds reales a 390 px, contando nodos en cada vuelta | **Bien.** Tope de 3 respetado, 312 px, desborde 0 (hallazgo 13) |
| El `aria-live` nace con su contenido y no se anuncia | Busqué `[aria-live="polite"]` en una carga limpia, sin avisos | **Bien.** La región existe vacía, como declara, y sigue existiendo cuando el último aviso se va (`regionSigueExistiendo: true`) |
| El aviso dice «se agregó» cuando el producto llegó a su cantidad máxima y no se agregó nada | Leí `lib/cantidades.ts` entero | **Bien, y la sospecha era infundada:** no hay máximo. `subirCantidad` siempre sube (`Math.max(minimo, cantidad + salto)`), así que el aviso no puede mentir por ese lado |
| El `setAviso("")` que ya no hace nada dejó un aviso colgado en alguna pestaña del panel | `grep` de `panel.aviso` en `pages/admin/` + `tsc` | **Bien.** Ninguna pestaña lee `aviso` del hook; el `aviso` del `return` se sacó y el typecheck lo habría cazado |
| Apilar dos avisos empeora el robo de clics del botón de pagar | Barrido de 891 puntos con dos avisos en pantalla | **Bien.** 1,3%, igual que con uno: apilar no empeora (hallazgo 3) |
| El plazo de un aviso que ya se fue descarta por id a otro aviso | Leí el `useEffect` de limpieza de `AvisosContext.tsx:59-67` + los diez adds | **Bien.** El plazo colgado se limpia; en diez vueltas no desapareció ninguno de más |
| A 1920 px el aviso tapa algo | Barrido de 1848 puntos sobre el botón de pagar | **Bien.** 0/1848, desborde 0 |
| `usePanelDeAdmin.ts` pasó de 300 | `wc -l` | **Bien.** 290, como declara (R05, §2) |
| Las dos correcciones de MDs que el handback declara (la barra verde no es «siempre verde»; agregar al carrito «sí dice algo» porque abre el drawer) | `AdminPage.tsx:60` (`setError` → `ErrorBanner`) y el drawer en el navegador | **Bien las dos.** El panel manda los errores por otro canal y el drawer sí se abre. Las correcciones del handback son correctas |

---

## 20 · Resumen de los hallazgos

| # | Gravedad | Qué |
|---|---|---|
| 3 | **ALTA** | El arreglo de los `pointer-events` está incompleto: a 390 px el link y la X roban clics de «Ir al checkout» (1%), «Ver el carrito completo» (9,6%) y «Ayuda» (**26,8%**) |
| 4 | **ALTA** | C1 no se cumple y el handback declara que sí: quedan 4 mecanismos de aviso ad-hoc (3 en el panel + `ProductPage`), `ProductPage.tsx` no se tocó, y no hay DRIFT (R25) |
| 5 | **ALTA** | Un nombre de producto de 40 caracteres sin espacios desborda la página 242 px a 390 px y manda la X del aviso fuera de pantalla: el aviso no se puede cerrar. Rompe el criterio de navegador de la propia tarjeta |
| 6 | MEDIA | El dedup se come la confirmación del segundo tamaño de la misma torta, **con la carta de hoy** (el riesgo 3 del handback está mal dimensionado) |
| 7 | MEDIA | Cuando el aviso se va solo se lleva el foco del teclado a `body`, y el plazo no se pausa con foco ni con el mouse encima |
| 8 | MEDIA | El link del aviso es la parada 47 de 48 en el orden de tabulación y vive 4 s: C7 no existe para el teclado. Escape tampoco lo cierra |
| 14 | BAJA | El `aria-label` de la X repite el texto completo del aviso, dentro de un `role="status"` anidado en el `aria-live` |
| 15 | BAJA | El plazo de 4 s no tiene test: el mutante `4000 → 3000` queda verde |
| 16 | BAJA | El dedup reordena la pila: el repetido salta al final y mueve dos carteles 96 px cada uno |
| 17 | BAJA | El aviso del carrito se arma con una copia vieja del contexto de avisos (`avisos` falta en las dependencias del `useMemo`); anda hoy porque `avisar` es estable |
| 18 | BAJA | C6 a medias: el tono `error` no tiene productor y nunca se vio en pantalla. **Bien declarado por el implementador** |
| — | — | Hallazgo 10: el hueco del panel **lo cerré yo** y ya no bloquea. Hallazgos 11, 12, 13 y 19: lo que fui a romper y aguantó |

### Los bloqueantes del done (R16), uno por línea

1. **Hallazgo 3** — el aviso todavía le roba el 27% del botón de «Ayuda» y la esquina del de pagar a 390 px.
2. **Hallazgo 5** — un nombre de producto de 40 caracteres desborda la página y deja el aviso sin poder cerrarse.
3. **Hallazgo 4** — C1 declarado cumplido sin estarlo, y sin el DRIFT que R25 exige.

Los tres son de front y chicos de arreglar (dos clases de Tailwind y una decisión que el handback ya
tiene planteada como opción A). Los hallazgos 6, 7 y 8 se pueden tomar ahora o anotar como deuda con
fecha en `status.md`; el 8 desaparece solo si se toma la opción A.

---

## 21 · Estado del árbol al terminar

```
$ git status --porcelain
 M backend/.env.example
 M backend/config.py
 M front/Andres_Bakery/src/App.tsx
 M front/Andres_Bakery/src/contexts/CartContext.tsx
 M front/Andres_Bakery/src/pages/admin/AdminPage.tsx
 M front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts
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

$ sha256sum front/Andres_Bakery/src/lib/avisos.ts
d0bc8d3d87e61f61edcf85ba1d43e646109579cfe45510b3340fb4765131dad7
```

**Idéntico a como lo encontré** (más este archivo, que es mi única escritura). No commiteé nada, no
arreglé nada, no toqué el entregable: las dos mutaciones de R29 se aplicaron sobre una copia con
respaldo y el archivo volvió al mismo hash las dos veces.

La base de desarrollo: copia antes (`sha256 0e2a7a0f…3c58291`), cuatro cambios de nombre del producto
4, y el archivo restaurado al terminar. Verificado después: los 5 nombres de producto son los
originales, `user` volvió a 3 filas, `tag`/`option`/`option_group`/`order` sin cambios. Lo único
distinto es `page_view`, que creció a 25 filas con mi navegación: es lo que la app escribe sola cada
vez que se abre una página.

Los dos servidores que levanté (back en `127.0.0.1:5000`, front en `localhost:5173`) quedaron
apagados.

---

## 22 · Costo

Una sesión de reviewer, modelo alto, sin subagentes. Una vuelta.
