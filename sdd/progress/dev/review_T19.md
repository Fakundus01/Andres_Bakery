# Review · T19-F60 · El pop-up en todas las pestañas del panel

**Rol:** `reviewer` funcional independiente (R27, R29, R30, R31) · **Fecha:** 2026-10-19 · **Rama:** `dev`
**Tarjeta:** [`T19-F60`](../../cards/T19-F60-popups-en-todo-el-panel.md) ·
**Handback revisado:** [`handback_T19.md`](handback_T19.md) · **ADR:** 034 y 035
**Sobre el commit `3859f33`**, revisando **lo que está sin commitear**.

**No implementé nada de esto** y no toqué una línea de código, de tests ni de MDs del repo: lo único
que escribí es este archivo. **No levanté el servidor del front** (me lo pidieron explícitamente):
todo lo de pantalla que digo acá sale de leer código y CSS, y lo marco como tal. Sí consulté la base
de desarrollo **en modo lectura** (`file:instance/bakery.db?mode=ro`) para verificar afirmaciones
sobre datos; no escribí nada en ella.

## Veredicto

**`CHANGES_REQUESTED`** — 16 hallazgos (**1 ALTA**, 7 MEDIA, 8 BAJA). Ninguno de los MEDIA rompe la
app ni pierde datos del negocio; el ALTA no es de código.

Primero lo que aguanta, porque es casi todo y es el punto de la tarjeta:

- **Los cuatro comandos están verdes de verdad**, re-ejecutados por mí, y **los números del handback
  coinciden uno por uno**: 176 tests en 16 archivos (166 + los 10 nuevos de `borrados`, contados
  corriendo ese archivo solo), 343 del back (Python no cambió: `git diff 3859f33 -- backend/` es
  vacío), **los mismos hashes y los mismos bytes del build** (`index-SHOGGt1r.js 419.67 kB`,
  `index-Dh-O4L1u.css 34.93 kB`), 11 archivos nuevos, `GrupoDeOpciones` tenía 272 líneas y
  `PerfilTab` 259. **C7 cumple**: el archivo más largo del front es `usePanelDeAdmin.ts` con 300
  (no las pasa), y el más largo de la zona nueva es `OpcionesTab.tsx` con 227.
- **`lib/borrados.ts` no pasa de casualidad.** Busqué el input que rompe la gramática y
  `enteroPositivo` aguanta todo lo que puede llegar: `-1`, `NaN`, `1.5`, `Infinity`, `-0` y un
  `"3"` casteado a `number` caen todos en la rama de cero y el cartel queda legible. El único
  agujero real que encontré es inalcanzable hoy (hallazgo 15).
- **La confirmación de borrado está bien atada.** `onConfirmar` no puede correr con `aBorrar ===
  null` (el `<dialog>` está cerrado y además hay guarda), confirmar dos veces no borra dos veces
  (cada clic es un evento discreto, el estado se vacía entre los dos y el cartel ya se cerró), y el
  `onClose` → `onCerrar` extra que dispara el `close()` del efecto de `Modal` es idempotente.
- **El estado no se filtra entre grupos.** Busqué el camino "abrir A, cerrar, abrir B" y no existe:
  en computadora el editor cuelga de `{enEdicion ? … : null}` y se desmonta al cerrar, y en celular
  cada tarjeta tiene su propio editor. El `key={grupo.id}` no hace falta (hallazgo 11), pero no hay
  fuga. Renombrar y seguir con el pop-up abierto tampoco deja el dato viejo.
- **Todos los pop-ups abren con título accesible** (`aria-label` en el `<dialog>` + `<h2>`), y el
  `""` que pasan cuando no hay nada seleccionado solo existe con el diálogo cerrado.
- **El Enter de seguridad que promete ADR-035 parte 3 se cumple**: al abrir, el foco no cae en "Sí,
  borrar" en ningún caso, así que el Enter siguiente no borra nada.
- **El cartel de borrado entra a 390px por CSS, sin pop-up de formulario**: `.modal-pixel` es
  `width: min(64rem, calc(100vw - 3rem))`, o sea 342 px a 390 — el mismo número que escribió el
  implementador. Ojo: **ese número se calcula sin navegador**, así que su presencia en el changelog
  no prueba nada por sí sola (ver hallazgo 1).

Lo que no cierra:

1. **El handback dice que esto no se vio en el navegador y los otros cinco MDs dicen que sí**, con
   mediciones detalladas. Uno de los dos textos es falso y no lo puedo dirimir sin levantar el
   front. La evidencia de la base de desarrollo apunta a que el navegador **sí** pasó y a que el
   handback quedó viejo, pero es el handback el documento que se le entrega al humano y al reviewer
   (hallazgo 1).
2. **El teclado del editor del grupo quedó peor de lo que estaba**, justo en la pestaña que más
   cambió y justo en lo que ADR-034 declara como la razón de usar `<dialog>`: Escape cierra el
   pop-up entero en vez de cancelar lo que se está editando (hallazgo 2) y **se perdió el botón de
   cancelar el renombre** que tenía `GrupoDeOpciones`, con lo cual cerrar el pop-up guarda el
   nombre tipeado (hallazgo 3).
3. **Dos textos se perdieron en el refactor sin que nadie lo diga** (hallazgo 9), uno de ellos la
   frase *"Los pedidos viejos no cambian"* — la respuesta a la pregunta que, según el propio ADR,
   ella hace siempre.
4. **`textoDeUso` habla en masculino y se usa para etiquetas**, y el test lo fija así (hallazgo 5).
   Es el único error de castellano que queda, en el módulo cuya razón de existir es el castellano.

---

## Lo que re-ejecuté (salida literal)

### 1 · `npm --prefix front/Andres_Bakery run test`

```
> andres-bakery@0.0.0 test
> vitest run


 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery


 Test Files  16 passed (16)
      Tests  176 passed (176)
   Start at  15:47:07
   Duration  1.62s (transform 58%, import 22%, worker 16%, tests 4%)
```

Y para verificar el "10 nuevos" del handback, el archivo nuevo solo:

```
 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  15:48:53
   Duration  517ms (transform 39%, import 36%, tests 13%, worker 12%, environment 1%)
```

166 + 10 = 176, y 15 + 1 = 16. Coincide con `handback_T4-F19b.md` (166/15). **El número es real.**

### 2 · `backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q`

Corrido desde la raíz, como dice `harness.config.json`. La salida trae 31 líneas de
`DeprecationWarning`/`ResourceWarning`/`LegacyAPIWarning` **que ya venían de antes** (son de
`utcnow()`, de `Query.get()` y de sqlite sin cerrar en los tests); el final:

```
----------------------------------------------------------------------
Ran 343 tests in 191.785s

OK
```

El handback dice `Ran 343 tests in 127.517s` — el número de tests es el mismo, el tiempo cambia
porque la máquina estaba ocupada (yo lo corrí en paralelo con la lectura del código). `git diff
3859f33 -- backend/` es **vacío**: el back no se tocó, como dice.

### 3 · `npm --prefix front/Andres_Bakery run lint`

```
> andres-bakery@0.0.0 lint
> npm run lint:eslint && npm run typecheck


> andres-bakery@0.0.0 lint:eslint
> eslint .


> andres-bakery@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
```

Sin un solo error ni warning. (El handback pegó otra cosa como si fuera literal: hallazgo 14.)

### 4 · `npm --prefix front/Andres_Bakery run build`

```
> andres-bakery@0.0.0 build
> tsc -b && vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 1862 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.19 kB │ gzip:   0.60 kB
dist/assets/index-Dh-O4L1u.css   34.93 kB │ gzip:   7.13 kB
dist/assets/index-SHOGGt1r.js   419.67 kB │ gzip: 125.89 kB
✓ built in 8.41s
```

**Mismos hashes y mismos tamaños que el handback**, al byte. 419,67 KB es lo que dice `status.md`.

### 5 · R05 / C7 (`wc -l`)

```
front, los más largos:                    backend (sin .venv), los más largos:
300 src/pages/admin/usePanelDeAdmin.ts    291 backend/tests/test_option_service.py
274 src/pages/ProductPage.tsx             272 backend/services/product_service.py
248 src/lib/personalizacion.test.ts       269 backend/services/order_service.py
227 src/pages/admin/OpcionesTab.tsx       268 backend/services/ai_service.py
207 src/pages/admin/EditorDeGrupo.tsx     263 backend/tests/test_mensaje_whatsapp.py
189 src/pages/admin/PerfilTab.tsx
```

La zona nueva entera: `borrados.ts` 98, `borrados.test.ts` 96, `ConfirmarBorrado` 58, `Modal` 108,
`TagsTab` 162, `ListaDeEtiquetas` 64, `FormularioDeEtiqueta` 75, `OpcionesTab` 227,
`TarjetaDeGrupo` 80, `EditorDeGrupo` 207, `FormularioDeGrupo` 75, `PerfilTab` 189, `PerfilFicha` 63,
`PerfilRedes` 95, `PerfilCvForm` 105, `StoryTab` 109, `ProductsTab` 152,
`AdministrarIngredientes` 127. **C7 cumple.**

---

## Hallazgos

### 1 · ALTA · El handback niega una verificación en navegador que los otros cinco MDs describen en detalle

`sdd/progress/dev/handback_T19.md:4-5`, `:96-101`, `:110-114` vs
`sdd/progress/dev/current.md:50-65`, `sdd/changelog.md` (0.15.0, bloque "**Medido en el
navegador**"), `sdd/status.md:31-33`, `sdd/features.md` (fila F60).

**Cómo lo encontré:** me dijeron que la verificación en navegador estaba *"escrita en el handback"*.
No está. El handback dice, en negrita y tres veces:

- `:4-5` — *"**sin commitear** (R01) y **sin mirar en el navegador** (R07), porque el servidor del
  front está parado desde el ciclo anterior"*;
- `:96-101` — riesgo 1: *"**No se vio en el navegador.** Es lo más grande que falta… **no se levanta
  sin pedido explícito**"*;
- `:110-114` — próximo paso 1: *"Levantar el front… y mirar los seis criterios en 1920px y 390px"*.

Y en el mismo árbol de trabajo, sin commitear, `current.md:50` abre una sección titulada **"El
navegador, medido (R07)"** con una tabla criterio por criterio (`dialog[open] = 0` en las cuatro
pestañas, 342 px, `scrollWidth - clientWidth = 0`, *"las 4 etiquetas y los 5 productos siguen
ahí"*), el changelog repite todo eso y `status.md` suma la fila *"**medido en 1920px y 390px**"*.
`current.md` además **se contradice consigo mismo**: su encabezado (`:5`) dice *"**sin ver en el
navegador**"* y su cuerpo dice que se vio.

**Qué averigüé para dirimirlo** (lectura sola, sin levantar nada): `instance/bakery.db` tiene fecha
de modificación **15:42 de hoy**, cinco minutos antes de que yo empezara, y su contenido es
exactamente el que `current.md` dice haber cargado *desde el panel nuevo*:

```
option_group:  (1, 'Relleno', 1)   (2, 'Bizcocho', 1)
option:        (1,1,'Dulce de leche')  (2,1,'Chocolate')  (5,1,'Crema')
               (3,2,'Chocolate')       (4,2,'Vainilla')
product_option_groups: (2,1) (2,2)        product: 5 filas        tag: 4 filas
user:          (1,'admin@local.test',is_admin=1)  (2,…,0)  (3,…,0)
```

O sea: los dos grupos, el `chocolate` minúscula ya renombrado a `Chocolate`, los dos grupos
colgados del producto 2, **las 4 etiquetas y los 5 productos intactos**, y **el admin temporal
`qa-popups@local.test` no existe** (se borró, como dice). Mi lectura: el navegador **sí** pasó,
después de escribir el handback, y el handback (más el encabezado de `current.md`) quedó viejo.

**Por qué lo pongo ALTA igual:** el handback es el documento del que cuelga la decisión del humano y
el arranque del reviewer; tal como está, **subestima el trabajo hecho y manda a repetirlo**, y a mí
me hizo arrancar con una premisa falsa. Peor: si la lectura correcta fuera la inversa —que el
navegador no pasó y el changelog está adornado— cuatro de los siete criterios (C1, C2, C3, C5), que
la tarjeta verifica *"en navegador"*, estarían firmados sin medir. Un reviewer no puede elegir cuál
de los dos textos creer.

**Recomiendo:** antes del commit, que quien implementó **reconcilie los dos**: si el navegador pasó,
actualizar `handback_T19.md:4-5`, `:96-101` y `:110-114` y el encabezado de `current.md:5`; si no
pasó, borrar la sección "El navegador, medido" de `current.md`, el bloque del changelog y la fila de
`status.md`. De paso, `current.md:12` dice *"La base de desarrollo **no se tocó**"* y 25 líneas
después cuenta que se le cargaron dos grupos y cinco sabores: eso también hay que arreglarlo.

### 2 · MEDIA · Escape adentro del editor del grupo cierra el pop-up entero en vez de cancelar lo que se edita

`front/Andres_Bakery/src/pages/admin/EditorDeGrupo.tsx:77-79` (nombre del grupo) y `:118-120`
(renombrar un sabor), con `components/Modal.tsx:69-72`.

**Cómo lo reproduje (lectura del camino del evento):** los dos `onKeyDown` tratan `Escape`
(`setNombre(grupo.name)` / `setEditandoOpcion(null)`) pero **no llaman a `stopPropagation()`**. El
evento sigue burbujeando hasta el `<dialog>`, que dispara `cancel`, y `Modal.tsx:69-72` hace
`preventDefault()` + `onCerrar()` → `OpcionesTab.tsx:214` `setEditando(null)`. Resultado: el usuario
que aprieta Escape para abandonar el renombre de *un sabor* se queda sin el pop-up del grupo.

Lo que lo hace un hallazgo y no una opinión: **en celular hace lo correcto** (ahí el editor vive en
la tarjeta, no hay `<dialog>`, y Escape solo cancela la fila). La misma tecla hace dos cosas
distintas según el ancho, y el teclado es la razón declarada de usar `<dialog>` (ADR-034 parte 2).

**Recomiendo:** `evento.stopPropagation()` en las dos ramas de `Escape` cuando hay algo que cancelar
adentro, y dejar que el Escape "vacío" cierre el pop-up.

### 3 · MEDIA · Se perdió el botón de cancelar el renombre, y cerrar el pop-up guarda el nombre tipeado

`EditorDeGrupo.tsx:67-86` vs `git show 3859f33:…/GrupoDeOpciones.tsx:104-113`.

**Cómo lo reproduje:** comparé los dos archivos. El viejo tenía, al lado del ✔, un **botón X que
revertía** (`setNombreDelGrupo(grupo.name); setEditandoGrupo(false)`). El nuevo dejó solo el ✔ y
agregó `onBlur={guardarNombre}` (`:71`). Como cualquier clic en el pie del pop-up (**"Listo"**) o en
la X de `Modal` mueve el foco, **el `blur` dispara `onRenombrar` y el PUT sale**: no hay forma, con
el mouse, de tipear un nombre y después abandonarlo. Con teclado tampoco quedó (hallazgo 2). Que el
guardado sea inmediato está declarado (ADR-035, y la `descripcion` del pop-up avisa *"el nombre al
salir del campo"*), pero **perder el único botón de cancelar no está declarado en ningún lado**.

**Recomiendo:** volver a poner la X de cancelar al lado del ✔ (tres líneas), o quitar el `onBlur` y
dejar que guarde solo el ✔/Enter.

### 4 · MEDIA · El formulario de alta de grupo se reabre con lo que se había tipeado y cancelado

`OpcionesTab.tsx:190-208` + `FormularioDeGrupo.tsx:23-24`.

**Cómo lo reproduje:** `Modal` renderiza `children` siempre (el `<dialog>` vive en el DOM abierto o
cerrado), así que `FormularioDeGrupo` **se monta una vez y nunca se desmonta**, y su estado local
(`nombre`, `obligatorio`) sobrevive al cierre. El botón "Nuevo grupo" (`:175-186`) solo hace
`setAviso("")` + `setCreando(true)`: no limpia nada. Camino: *Nuevo grupo → tipear "Relleno" →
Cancelar → Nuevo grupo* y el campo sigue diciendo "Relleno"; si además se había destildado
"obligatorio", también queda destildado, que es el default peligroso de los dos.

Es el mismo agujero que `TagsTab` **sí** cierra (`:133-136` llama `onReset()` al abrir). Como dato,
en el mismo lugar hay un `aviso` de "ya tenés un grupo que se llama así" que **sí** se limpia: la
mitad del estado se resetea y la otra no.

**Recomiendo:** `key={creando ? "abierto" : "cerrado"}` en `FormularioDeGrupo`, o pasarle un
`onLimpiar` y llamarlo al abrir.

### 5 · MEDIA · `textoDeUso` habla en masculino y se usa para etiquetas; el test lo fija así

`lib/borrados.ts:76-82` (`"No lo usa ningún producto"`), usado en
`pages/admin/ListaDeEtiquetas.tsx:42` · test en `lib/borrados.test.ts:68`.

**Cómo lo encontré:** fui a buscar si los tests prueban lo que dicen. `textoDeBorrado` resuelve el
género con cuidado (`pronombre: "lo" | "la"`, y el test `:33-37` lo verifica), pero `textoDeUso`
**no recibe qué es lo que se cuenta** y hardcodea el masculino. Sus dos llamadores son
`TarjetaDeGrupo.tsx:39` (un grupo: "no lo usa" está bien) y `ListaDeEtiquetas.tsx:42` (una etiqueta:
**"No lo usa ningún producto"** debería ser *"No la usa"*). Y
`expect(textoDeUso(0)).toBe("No lo usa ningún producto")` **congela el error**: el test pasa, el
texto está mal en una de las dos pantallas. Es el único error de castellano que queda en el módulo
cuya razón de existir es el castellano (C4, ADR-035 parte 4).

**Recomiendo:** `textoDeUso(que: Borrable, usos: number)` tomando el `pronombre` de `PLANTILLAS`, y
que el test lo recorra para los dos géneros como ya hace `:33-37`.

### 6 · MEDIA · Si el guardado falla, el pop-up se cierra igual y lo tipeado queda irrecuperable

`TagsTab.tsx:49-52` (y el mismo patrón en `ProductsTab.tsx:45-48`, `PerfilTab.tsx:171-177`,
`StoryTab.tsx:89-97`).

**Cómo lo reproduje:** `guardar` hace `onSubmit(evento)` y **acto seguido** `setAbierto(false)`.
`onSubmit` es `usePanelDeAdmin.guardarEtiqueta` (`:228-239`), que es `void conAviso(async …)`: no
devuelve nada y resuelve después. Si el POST/PUT falla (nombre repetido, `color_token` que el back
rechaza, red caída), el pop-up ya se cerró, el `ErrorBanner` aparece **arriba de la página** (lejos
de donde estaba mirando) y el formulario queda cargado pero **tapado**: el único botón que lo
reabre, "Nueva etiqueta" (`:133-136`), llama `onReset()` y lo borra. El trabajo se pierde.

En `ProductsTab` esto viene de ADR-034 y el reviewer anterior no lo marcó, así que **no es de esta
tarjeta**; pero T19 lo copió a tres pestañas más, y en la del perfil y la de la historia el pop-up
cierra tapando el error de un PUT que manda **todo** el perfil.

**Recomiendo:** que `onSubmit`/`onGuardar` devuelvan `Promise<boolean>` (o que `conAviso` lo haga) y
cerrar solo con `true`, igual que `FormularioDeGrupo` ya hace con su `onCrear(): boolean` — el
patrón correcto ya está escrito en esta misma tanda, en `OpcionesTab.tsx:61-74`.

### 7 · MEDIA · "Cerrar" no cancela nada en el perfil ni en la historia, y los resúmenes muestran lo no guardado como si estuviera guardado

`PerfilTab.tsx:179-181` y `:145` · `StoryTab.tsx:99-101` y `:72-74`.

**Cómo lo reproduje:** los tres pop-ups del perfil editan `perfil`, que vive en `usePanelDeAdmin`,
no en el pop-up. El botón **"Cerrar"** (y la X, y Escape) solo hace `setAbierta(null)`: **lo
tipeado queda en el estado**. Y la tarjeta de resumen de atrás (`:145`) se recalcula de ese mismo
estado, así que después de "Cerrar" la pantalla dice *"con foto · Repostera · Villa Maipú"* o
*"3 redes cargadas"* **sin que nada de eso esté guardado**. Peor con el PUT entero (riesgo 3 del
handback): se edita el CV, se cierra sin guardar, se edita una red y se aprieta "Guardar mi
perfil" → **se guarda también el CV que se había abandonado**. En la historia pasa lo mismo: la
vista previa de la página (`:72-74`) muestra el texto sin guardar como si fuera el del home.

Antes del refactor el formulario *era* la página y no había ningún botón que prometiera cancelar;
ahora hay tres que lo parecen. No es pérdida de datos, es lo contrario: persiste lo que el usuario
creyó descartar.

**Recomiendo:** o que "Cerrar" revierta (guardar una copia del `perfil` al abrir y restaurarla), o
—más barato y honesto— que diga **"Listo"** como el editor del grupo y que el resumen marque
"sin guardar" cuando haya cambios pendientes.

### 8 · MEDIA (R06) · El comentario de `Modal` dice lo contrario de lo que ADR-035 decidió

`components/Modal.tsx:12-16`: *"**Solo se usa en pantallas grandes** (ver `usePantallaGrande`): en un
celular un formulario largo adentro de un pop-up es peor…"*.

**Cómo lo encontré:** el archivo no cambió pero ahora tiene cinco usuarios, así que lo leí igual.
`ConfirmarBorrado` lo usa **a propósito también en celular** (es la parte 3 de ADR-035, y C5 de la
tarjeta); el comentario del componente sigue afirmando que eso no pasa. Es exactamente la clase de
comentario que R06 prohíbe: el próximo que lo lea va a "arreglar" el cartel de celular.

**Recomiendo:** dos líneas en `Modal.tsx` diciendo que los **formularios** solo lo usan en pantalla
grande y que un **cartel de confirmación** lo usa siempre, con el por qué (no se escribe nada).

### 9 · BAJA · Dos textos del cartel de borrado se perdieron en la mudanza a `lib/borrados.ts`

`lib/borrados.ts:34` y `:73` vs `git show 3859f33:…/GrupoDeOpciones.tsx:56-65`.

**Cómo lo reproduje:** saqué los strings visibles del archivo viejo y los busqué en los nuevos. Dos
no están:

| Viejo (`GrupoDeOpciones`) | Nuevo (`borrados.ts`) |
|---|---|
| sin usos: *"¿Borrar este grupo y sus sabores? No se deshace. **Los pedidos viejos no cambian.**"* | *"Ningún producto lo usa. Se va con todos sus sabores. No se deshace."* |
| con usos: *"…sale del producto que lo tiene**,** con todos sus sabores."* | *"…sale del producto que lo tiene con todos sus sabores."* |

La primera es la respuesta a *"si lo borro, ¿pierdo los pedidos?"*, que el propio `borrados.ts:52`
llama *"la pregunta que ella hace siempre"* y que **sí** conservó para producto y sabor: quedó solo
el grupo sin esa tranquilidad. La segunda es la coma: sin ella, *"sale de los 3 productos que lo
tienen con todos sus sabores"* se lee como si los productos tuvieran los sabores. Es la misma clase
de defecto de redacción que la tarjeta se propuso arreglar (C4).

**Recomiendo:** sumar *"Los pedidos que ya lo tienen no cambian."* al `suelto` del grupo y poner la
coma delante del `arrastre` (o un `arrastre` con su propia coma por plantilla).

### 10 · BAJA · El `autoFocus` del alta de grupo no hace nada, y el foco al abrir cae en "Cerrar"

`FormularioDeGrupo.tsx:51`.

**Cómo lo verifiqué:** React **no** escribe el atributo `autofocus` en el DOM — en
`node_modules/react-dom/cjs/react-dom-client.development.js:20187` el `setProp` de `"autoFocus"` es
`break;` — sino que llama `.focus()` al montar. Y acá el componente **monta con el `<dialog>`
cerrado** (hallazgo 4: nunca se desmonta), así que ese `focus()` cae en un elemento oculto y no se
repite al abrir. Como el `<dialog>` no encuentra ningún `autofocus`, el foco inicial queda en el
diálogo mismo o en su primer focusable, que es el botón **X "Cerrar"** de `Modal.tsx:88-96`, según la
regla de foco que aplique el navegador — **no lo pude medir, no levanté el front**, y en los dos
casos el campo nombre no queda enfocado. Para el cartel de borrado esto es una ventaja (el Enter no
borra); para un formulario es un Tab de más y un `autoFocus` que miente.

**Recomiendo:** o borrar el `autoFocus` (es código muerto), o enfocar de verdad con un `ref` + un
efecto atado a `abierto` en `Modal`.

### 11 · BAJA (R06) · El comentario del `key` explica un mecanismo que no es el que protege

`OpcionesTab.tsx:79-81`: *"La clave remonta el editor al cambiar de grupo: sin eso, el nombre que se
estaba tipeando en «Relleno» aparecería al abrir «Bizcocho»"*.

**Cómo lo verifiqué:** fui a buscar justamente ese bug y no existe, pero no por el `key`. En
computadora el editor se desmonta solo (`:221`, `{enEdicion ? … : null}`) y no se puede pasar de un
grupo a otro sin cerrar (la lista queda detrás del `<dialog>`); en celular cada editor cuelga de su
propia tarjeta, o sea de otra posición del árbol. El `key` es inofensivo pero **nunca se ejecuta el
escenario que el comentario describe**, y eso vuelve el comentario más engañoso que útil: alguien
que toque esto va a creer que el `key` lo está salvando.

**Recomiendo:** dejar el `key` y cambiar el comentario por lo que de verdad protege (el editor se
desmonta al cerrar), o un `// cinturón y tiradores`.

### 12 · BAJA (R06) · `borrados.ts` y su test citan `GrupoDeOpciones` como si todavía existiera

`lib/borrados.ts:5-7` y `lib/borrados.test.ts:10-12`: *"`AdministrarIngredientes` y
`GrupoDeOpciones` tenían su propio `textoDeBorrado`"*. **El archivo se borró en esta misma tarjeta**
(se partió en `TarjetaDeGrupo` + `EditorDeGrupo`), así que el comentario manda a un archivo que no
está. **Recomiendo:** *"…y el que fue `GrupoDeOpciones` (hoy `EditorDeGrupo`)"*.

### 13 · BAJA · "Las que ya tenés" desapareció de la lista de etiquetas

`ListaDeEtiquetas.tsx:30-31` vs `git show 3859f33:…/TagsTab.tsx:91`. La lista perdió su encabezado
`<h3>`. En computadora casi no se nota (la lista es lo único que hay), pero **en celular** queda
el formulario con su `<h3>` y después una `<ul>` sin título ni separación semántica. No está dicho
en el handback. **Recomiendo:** devolverle el encabezado, aunque sea en la rama de celular.

### 14 · BAJA · La salida de `lint` del handback no es literal (R29)

`handback_T19.md:63-65` pega:

```
npm --prefix front/Andres_Bakery run lint
> eslint . && tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
(sin salida)
```

Eso **no es lo que imprime el comando**: `package.json:9` tiene `lint: "npm run lint:eslint && npm
run typecheck"`, así que la salida real son cuatro encabezados `>` (los pegué arriba). Es la
expansión mental de los dos sub-scripts, no la salida. El resultado es el mismo —limpio, lo
verifiqué— pero una "salida literal" reescrita a mano es justo lo que R29 no permite, y ya le costó
un hallazgo al handback de `T4-F19b` (*"Test Files 16 passed (16) son 15"*). **Recomiendo:** pegar
la de verdad.

### 15 · BAJA · Un conteo ≥ 1e21 rompe la gramática del cartel (hoy inalcanzable)

`lib/borrados.ts:44-46` y `:73`. Busqué el input que `enteroPositivo` no filtra y es este:
`Number.isInteger(1e21) === true` y `1e21 > 0`, así que pasa la guarda, y la interpolación lo
escribe en notación exponencial → *"Si lo borrás sale de los **1e+21** productos que lo tienen"*.
Con `Number.MAX_SAFE_INTEGER` sale un número de 16 cifras, legible pero absurdo. **No es alcanzable
hoy**: el conteo viene de `contarEtiquetas`/`usos`, acotado por la cantidad de productos. Lo dejo
anotado porque el módulo se presenta como blindado contra "un número que no debería llegar" y el
test (`:50-61`) prueba `-1`, `NaN` y `1.5` pero no el lado grande. **Recomiendo** (opcional): un
tope en `enteroPositivo` (`Math.min(usos, 9999)`) y el caso en el test.

### 16 · BAJA · La tarjeta del grupo perdió el checkbox de "obligatorio"

`TarjetaDeGrupo.tsx:31-57` vs `git show 3859f33:…/GrupoDeOpciones.tsx:146-153`. Antes "hay que
elegir uno para poder pedir" se tildaba **desde la tarjeta**, con un clic; ahora hay que abrir el
pop-up. Está dentro de lo que ADR-035 decidió ("la tarjeta muestra, el editor edita") y la tarjeta
sigue diciendo "Obligatorio"/"Opcional", así que **no es un bug**: lo anoto porque es la única
acción del panel que se volvió más cara con este cambio y no está dicha en ninguna parte.

---

## Lo que me pareció sospechoso y estaba bien

Lo escribo porque descartar también es información.

| Sospecha | Qué hice | Resultado |
|---|---|---|
| `contarEtiquetas` cuenta dos veces si un producto repite etiqueta o si viene repetido en la lista | leí el esquema de la base: `CREATE TABLE product_tags (… PRIMARY KEY (product_id, tag_id))` | **imposible por PK.** Y `producto.tags ?? []` cubre el `undefined` de la API, que el test `:77-85` prueba de verdad |
| `enteroPositivo` se come un input raro | `-1`, `NaN`, `1.5`, `Infinity`, `-0`, `"3"` casteado | **aguanta**: `Number.isInteger` rechaza los no enteros y `> 0` el resto. `-0` cae en cero. Solo falla del lado grande (hallazgo 15) |
| estado que se filtra entre grupos (abrir A, cerrar, abrir B) | seguí el montaje/desmontaje en los dos modos | **no se filtra**, y el `key` no es lo que lo evita (hallazgo 11) |
| el `aBorrar` viejo apuntando a algo que ya no existe | revisé los tres `ConfirmarBorrado` | **no**: solo se usan `id` y `name`, y el cartel se cierra en el mismo clic. El `usos[aBorrar.id] ?? 0` lee la cuenta viva, no una copia |
| confirmar dos veces borra dos veces | dos clics son dos eventos discretos: el estado se vacía entre ellos y el `<dialog>` ya está cerrado; además hay `if (aBorrar)` | **no** |
| `onConfirmar` con `aBorrar === null` | `abierto={aBorrar !== null}` + guarda explícita | **no puede** |
| el `onClose={onCerrar}` de `Modal` dispara `onCerrar` dos veces (una por el `close()` del efecto) | seguí las dos vueltas en los cinco usuarios | **pasa, y es inocuo**: los cinco `onCerrar` son `setX(null/false)` idempotentes. Si alguien le suma un efecto, va a doler |
| dos `<dialog>` abiertos a la vez dejarían `body.overflow: hidden` pegado (`Modal.tsx:48-58`) | busqué un camino de UI que abra el cartel con un formulario abierto | **no hay** (el formulario tapa la lista). Queda como trampa latente ahora que hay cinco usuarios |
| ids de `<form>` duplicados (`formulario-de-etiqueta`, `-de-grupo`) al renderizarse en los dos modos | `AdminPage` monta una sola pestaña y cada pestaña una sola rama | **únicos** |
| algún pop-up sin título accesible | los seis `Modal` | **todos** con `aria-label` + `<h2>`; el `""` solo existe cerrado |
| el Enter del cartel borrando sin querer | foco inicial = el diálogo o la X, nunca "Sí, borrar" | **la promesa de ADR-035 parte 3 se cumple** |
| algo todavía importando `GrupoDeOpciones` | `eslint` + `tsc` limpios y grep | **nada**, no quedó import muerto |
| el cartel no entrando a 390px | `.modal-pixel` = `min(64rem, calc(100vw - 3rem))` → 342 px | **entra** (calculado, no medido) |
| el admin temporal del QA quedando vivo en la base | `select id, email, is_admin from user` | **se borró**: queda solo `admin@local.test` |

## Lo que no pude revisar

- **Nada de navegador.** No levanté el front, como se me pidió. C1, C2, C3 y C5 se verifican *"en
  navegador"* según la tarjeta, y mi aporte sobre ellos es solo de código y CSS. Lo que hay escrito
  de esas cuatro verificaciones está en `current.md`, no en el handback, y arrastra el hallazgo 1.
- **El cartel del ingrediente dentro del pop-up del producto** (la excepción declarada de ADR-035):
  leí que el texto ya es el compartido (`AdministrarIngredientes.tsx:81` y `:105`) y que la
  confirmación sigue en la fila, que es lo prometido; cómo se ve un cartel en fila adentro de un
  `<dialog>` no lo puedo juzgar sin mirarlo.

## Si esto se arregla, qué miraría de nuevo

Los hallazgos 2, 3, 4, 5, 6 y 7 son todos de `EditorDeGrupo`, `OpcionesTab`, `TagsTab`,
`PerfilTab`/`StoryTab` y `borrados.ts`: cinco archivos. El 5 pide **un test más** (el género de
`textoDeUso` para los dos casos) y el 6 pide tocar la firma de los `onSubmit`, que es el único
cambio con riesgo de arrastre. El 1 no es código: es decidir cuál de los dos textos es el verdadero.
