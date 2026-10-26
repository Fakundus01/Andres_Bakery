# handback · D24 + D36 · implementer

**Rama:** `dev` · **base:** `6f549a4` · **fecha:** 2026-10-25
**R01 activa:** no se commiteó, no se pusheó, no se corrió `git restore`/`checkout`/`add`. El árbol
queda con los cambios sin commitear, esperando el OK humano.

---

## 0 · Las dos suites, de un vistazo

| Comando | Antes (`6f549a4`) | Después | Exit |
|---|---|---|---|
| `backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q` | **368 OK** | **376 OK** (+8) | 0 |
| `npm --prefix front/Andres_Bakery run test` | **256 OK** en 20 archivos | **267 OK** en 22 archivos (+11, +2 archivos) | 0 |
| `npm --prefix front/Andres_Bakery run lint` | limpio | limpio | 0 |
| `npm --prefix front/Andres_Bakery run build` | verde | verde | 0 |

Los exit codes se midieron **sin tubería** (`cmd > archivo; echo $?`), nunca `cmd | tail; echo $?`.

**Build:** `index-DywBBMqZ.css` **36,28 kB** — *mismo hash* que anota `status.md`, o sea el CSS no se
movió un byte. `index-DFE5XA2U.js` **428,17 kB**.

> **Ojo con el número del JS, y está medido, no deducido.** `status.md` anota 426,68 kB. La diferencia
> **no es de esta tanda**: con mis cambios del front dados vuelta a mano (sin git, con asserts, ver §6)
> el build da **428,10 kB**. O sea **lo mío cuesta 0,07 kB** y los 1,42 kB que faltan ya estaban: el
> `node_modules` de hoy tiene **vite 7.3.7** y el número viejo se midió con otro. Después de dar vuelta
> la medición, el árbol volvió al mismo `sha256` del diff (§6) y el build al mismo hash `DFE5XA2U`.

---

## 1 · El rojo, medido contra `6f549a4` con producción intacta

Al medir: `git diff --stat` **vacío** y `git status --short` con **sólo los tres archivos de test
nuevos** sin seguir. Salida literal pegada.

### 1.1 · Front

```
 ❯ src/lib/avisos.asunto.test.ts (6 tests | 1 failed) 29ms
   ❯ el dedup compara el asunto (D36) (6)
     × dos rellenos distintos del mismo tamaño dan DOS avisos 21ms
 ❯ src/lib/marca.test.ts (5 tests | 3 failed) 18ms
   ❯ la grafía de la marca (D24) (5)
     × `MARCA` es la grafía decidida, con apóstrofo recto y en caja normal 7ms
     × ningún archivo del front dice la grafía vieja 4ms
     × el `<title>` y la descripción de la pestaña dicen la marca 4ms

 FAIL  src/lib/avisos.asunto.test.ts > ... > dos rellenos distintos del mismo tamaño dan DOS avisos
AssertionError: expected [ { id: 'aviso-2', …(2) } ] to have a length of 2 but got 1
- Expected
+ Received
- 2
+ 1

 FAIL  src/lib/marca.test.ts > ... > `MARCA` es la grafía decidida, con apóstrofo recto y en caja normal
Error: Cannot find module '/src/lib/marca' imported from .../src/lib/marca.test.ts

 FAIL  src/lib/marca.test.ts > ... > ningún archivo del front dice la grafía vieja
AssertionError: expected [ 'layout/SiteFooter.tsx', …(2) ] to deeply equal []
- Expected
+ Received
- []
+ [
+   "layout/SiteFooter.tsx",
+   "layout/SiteHeader.tsx",
+   "index.html",
+ ]

 FAIL  src/lib/marca.test.ts > ... > el `<title>` y la descripción de la pestaña dicen la marca
AssertionError: expected '<!DOCTYPE html>\r\n<html lang="es" da…' to contain '<title>Andre\'s Bakery | Dulces artes…'

 Test Files  2 failed | 20 passed (22)
      Tests  4 failed | 263 passed (267)
```
`EXIT=1`.

### 1.2 · Back (`python -m unittest backend.tests.test_marca -v`)

```
test_el_barrido_mira_archivos_de_verdad ... ok
test_el_punto_de_retiro_por_defecto_sale_de_la_constante ... ERROR
test_la_constante_es_la_grafia_decidida ... ERROR
test_nadie_escribe_la_marca_en_mayusculas_ni_con_apostrofo_tipografico ... ok
test_ningun_archivo_del_back_escribe_la_grafia_vieja ... FAIL
test_el_texto_institucional_sembrado_dice_la_marca ... ERROR
test_la_descripcion_del_envio_en_mercado_pago_dice_la_marca ... ERROR
test_los_dos_mails_del_pedido_dicen_la_marca ... ERROR

ERROR: ... ModuleNotFoundError: No module named 'backend.marca'      (x5)

FAIL: test_ningun_archivo_del_back_escribe_la_grafia_vieja
AssertionError: Lists differ: ['config.py', 'services\\bootstrap_service[91 chars]ple'] != []
+ []
- ['config.py',
-  'services\\bootstrap_service.py',
-  'services\\notifications.py',
-  'services\\payment_service.py',
-  'README.md',
-  '.env.example']

Ran 8 tests in 1.653s
FAILED (failures=1, errors=5)
```
`EXIT=1`.

Dos `it`/`test` nacieron **verdes** y lo digo en vez de disimularlo: son **candados**, no rojos.
`nadie escribe la marca en mayúsculas ni con apóstrofo tipográfico` (los dos lados) y
`el arreglo NO alarga el cartel` fijan decisiones que hoy ya se cumplen, para que no se deshagan.

---

## 2 · D24 · el nombre de la marca

### 2.1 · Cuántos lugares tenía y cuáles — **la fila de la deuda estaba incompleta**

La fila nombra cuatro (header, `<title>`, footer, "los textos"). **Barriendo el repo entero encontré
13 lugares, en 8 archivos.** Los 13 están cambiados:

| # | Archivo | Qué es |
|---|---|---|
| 1 | `front/Andres_Bakery/index.html` | el `<meta name="description">` de la página |
| 2 | `front/Andres_Bakery/index.html` | el `<title>` de la pestaña |
| 3 | `front/.../src/layout/SiteHeader.tsx` | el `alt` del logo (lo que lee un lector de pantalla) |
| 4 | `front/.../src/layout/SiteHeader.tsx` | el nombre escrito al lado del logo |
| 5 | `front/.../src/layout/SiteFooter.tsx` | el nombre del footer |
| 6 | `backend/config.py` | el default de `PICKUP_ADDRESS` (se ve en el carrito y el checkout) |
| 7 | `backend/.env.example` | el ejemplo de `PICKUP_ADDRESS` |
| 8 | `backend/services/notifications.py` | el cuerpo del mail al cliente |
| 9 | `backend/services/notifications.py` | el asunto del mail al cliente |
| 10 | `backend/services/notifications.py` | el asunto del mail a Andrea |
| 11 | `backend/services/payment_service.py` | la descripción del envío en Mercado Pago |
| 12 | `backend/services/bootstrap_service.py` | la semilla del texto institucional (`SiteContent "about"`) |
| 13 | `backend/README.md` | el título del README del back |

Lo que la fila no nombraba y existe: la **descripción de la página**, el **`alt` del logo**, los **tres
textos de mail**, la **descripción del envío en Mercado Pago**, el **punto de retiro**, el
**`.env.example`** y el **README del back**. Nueve de trece.

**Un negativo verificado, porque la consigna lo daba por hecho:** el **mensaje de WhatsApp que arma el
servidor NO lleva el nombre de la marca**. Leí `backend/services/mensaje_whatsapp.py` entero: su saludo
es `"¡Hola Andrea! Te hago un pedido desde la web."` y el resto son renglones, importes y datos de
entrega. `git grep` no encuentra la marca ahí. **Consecuencia práctica: el apóstrofo nunca viaja por una
URL de `wa.me`**, así que ese riesgo de codificación no existe en este repo.

### 2.2 · Decisión 1 · el apóstrofo: **recto (`'`, U+0027)**

Cuatro razones medidas, no de gusto:

1. **Hoy no hay un solo U+2019 en el código propio del proyecto.** Medido:
   `grep -rln $'’' src backend --include=*.ts --include=*.tsx --include=*.py --include=*.html`
   devuelve **17 archivos y los 17 son de `backend/.venv`** (anthropic, pydantic, pygments…). Poner uno
   sería el primero.
2. **Sobrevive a la línea de comando, y lo vi pasar.** Al imprimir la constante nueva desde la consola:
   `"Andre's Bakery, Villa Maip?, General San Mart?n"` — los **acentos se perdieron** en la consola y
   **el apóstrofo no**. El archivo en disco está bien (UTF-8 sin BOM, verificado por bytes: `0xfa`,
   `0xed`, apóstrofo `0x27`), pero la consola es por donde este repo mira cuando el MCP de Playwright no
   conecta y hay que hablar CDP a mano. Un carácter ASCII es el único que no depende de eso.
3. **Es el que sale del teclado de Andrea.** Ella edita el texto institucional desde el panel. Con el
   tipográfico habría dos grafías que **se ven iguales y comparan distinto**, y el `about` de la base
   quedaría discrepando del sembrado sin que nadie pueda verlo mirando la pantalla.
4. **Los lugares por donde viaja están verificados uno por uno:** `<title>` y `<meta>` (el `index.html`
   declara `charset="UTF-8"`, y el título llegó entero al navegador y al `dist/index.html`); los asuntos
   de mail (ya llevaban `Confirmación`, o sea ya iban en *encoded-word*, y el apóstrofo ASCII no agrega
   nada); el JSON de Mercado Pago (`json.dumps(...).encode("utf-8")`); y `wa.me`, que **no lo lleva**.

### 2.3 · Decisión 2 · mayúsculas: **`Andre's Bakery` en los textos**

Coincido con el criterio del leader y lo apoyo con evidencia del propio repo, no con gusto:

- **La casa ya separa grafía de estilo.** `SiteFooter.tsx` escribe `Dónde encontrarnos` en **caja
  normal** y lo agranda con `uppercase tracking-[0.2em]`. Lo mismo el `Dulces de autor` del header.
  **20 archivos del front** usan la clase `uppercase`. En este código, las mayúsculas de diseño las pone
  el CSS; el string lleva la ortografía.
- **El logo es una imagen y no cambia.** Sigue en mayúsculas, que es donde el diseño ya grita.
- Lo que no podía quedar —y era lo que había— es **la mezcla sin regla**. Ahora hay regla, y está en un
  test: `expect(MARCA).not.toBe(MARCA.toUpperCase())` más un barrido que prohíbe el literal en
  mayúsculas en todo el código. Si algún día un diseño necesita la marca gritada, va
  `className="uppercase"`, no un literal nuevo.

### 2.4 · Decisión 3 · centralizado, con el costo dicho

Estaba escrito **a mano en 13 lugares**, así que sí: centralizarlo. Dos módulos nuevos, uno por lado,
porque los dos runtimes no se pueden importar entre sí:

- `front/Andres_Bakery/src/lib/marca.ts` → `export const MARCA = "Andre's Bakery"` (1 línea de código,
  26 de por qué).
- `backend/marca.py` → `MARCA` y `PUNTO_DE_RETIRO_POR_DEFECTO = f"{MARCA}, Villa Maipú, General San
  Martín"`. Sin imports a propósito, para que `config.py` lo lea sin ciclos.

**El costo, completo:** (a) **dos** fuentes de verdad y no una, inevitable con dos runtimes; el contrato
es que los dos tests escriben la grafía a mano y tienen que coincidir. (b) **`index.html` no puede
importar nada** —es HTML estático, y poner el `<title>` desde JS lo haría parpadear—, así que ahí la
grafía **sigue escrita** y lo que la cuida es el barrido del test. (c) Dos imports nuevos en archivos de
React, que **ningún test monta** (D37): por eso el guard es un **barrido de fuentes**, no un render.
(d) **+0,07 kB** de bundle, medido (§0).

### 2.5 · Lo que NO toqué, y por qué — con un pendiente que necesita al humano

> ### ⚠ El sitio **todavía muestra la grafía vieja en un lugar, y no se puede arreglar desde el repo**
>
> `PICKUP_ADDRESS` **está puesto en `backend/.env`** (verifiqué que la clave existe; no abrí el archivo),
> así que mi cambio al *default* de `config.py` no se usa. **Medido en el navegador, a 390 px, en
> `/#/carrito`:**
>
> > «Si retirás por **Andres Bakery**, Villa Maipu, General San Martin no pagás envío.»
>
> Lo mismo en `/#/checkout` (`config?.pickup_address`). **Alguien tiene que editar `PICKUP_ADDRESS` en
> `backend/.env`** —y en el entorno de producción el día que exista— o esos dos textos siguen diciendo
> el nombre viejo. No lo hice porque la consigna lo prohíbe: ese archivo tiene un número de WhatsApp
> real y credenciales de correo.

El resto son **identificadores, rutas y datos guardados**, no texto visible. Están todos acá para que no
haya que buscarlos de nuevo:

| Dónde | Qué dice | Por qué no se toca |
|---|---|---|
| `README.md:1` | `# Andres_Bakery` | es el **nombre del repo** en su forma con guion bajo, igual que la carpeta y que `package-lock.json` |
| `harness.config.json` (3 líneas) | `front/Andres_Bakery` | **ruta** de la carpeta |
| `front/.../package.json`, 2 `package-lock.json` | `andres-bakery`, `Andres_Bakery` | **nombre de paquete** |
| `SiteHeader.tsx` + `public/` | `/logo-andres-bakery.png` | **nombre de archivo** del logo |
| `CartContext.tsx` | `andres-bakery-cart-v2`, `andres-bakery-cart` | **claves de `localStorage`**: renombrarlas **vacía el carrito de todo el mundo** |
| `lib/api/cliente.ts` | `andres-bakery:sesion-vencida` | nombre de **evento** |
| `lib/sesionGuardada.ts` | `andres-bakery-auth` | clave de `localStorage` (la sesión) |
| `preferencias/PreferencesProvider.tsx` | `andres-bakery:preferencias` | clave de `localStorage` |
| `config.py` + `.env.example` | `CLOUDINARY_FOLDER=Andres_Bakery` | **carpeta remota de las fotos ya subidas** |
| `services/cloudinary_client.py` | `----andresbakery<hex>` | **borde multipart** de un HTTP, no texto |
| `services/payment_service.py` | `statement_descriptor: "ANDBAKERY"` | lo que sale en el **resumen de la tarjeta**: 13 caracteres y sin apóstrofo |
| `tests/test_profile_service.py` | `"place": "Andres Bakery"` | **fixture**: un trabajo en un CV de prueba, dato de entrada |
| `test_foto_de_referencia`, `test_subida_publica`, `test_mensaje_whatsapp` | `andres-bakery` | nombre de cloud y host de prueba |
| base de desarrollo, `SiteContent "about"` | *no dice la marca* | **ya lo reescribió una persona** desde el panel: hoy dice «Somos un emprendimiento familiar…». La semilla sólo corre en base vacía |

---

## 3 · D36 · dos rellenos distintos, dos avisos

**Respeté la salida recomendada: por el dedup, no por el texto.** No la discuto; la medí (§5).

Tres archivos de producción, y el de la regla es uno:

1. **`src/lib/avisos.ts` — acá vive la regla.** `Aviso` gana `asunto?: string` (identidad, no texto: no
   se dibuja nunca). `nuevoAviso` lo propaga. `asuntoDelAviso(aviso)` devuelve `aviso.asunto ?? aviso.texto`.
   El dedup de `agregarAviso` pasó a comparar `tono` + **asunto**:
   ```ts
   (previo) => !(previo.tono === aviso.tono && asuntoDelAviso(previo) === asuntoDelAviso(aviso))
   ```
   **Sin asunto el comportamiento es exactamente el de antes**, que es lo que necesita el panel:
   «Etiqueta guardada.» dos veces sigue siendo un cartel. Eso tiene test propio.
2. **`src/contexts/AvisosContext.tsx`** — `exito(texto, extras?)` con
   `ExtrasDelAviso = { asunto?, link? }`. Objeto y no un tercer parámetro posicional **porque el `link`
   existe desde F64 y ningún llamador lo usa** (ADR-037): con posicional, el único que manda `asunto`
   tendría que escribir un `undefined` en el medio. `exito` tiene **2 llamadores** en todo el front, y el
   otro (`usePanelDeAdmin.ts:56`, `avisos.exito(mensaje)`) **no cambia**.
3. **`src/contexts/CartContext.tsx`** — una línea: `{ asunto: clave }`, con `clave` la
   `claveDelRenglon(nuevo)` que `addItem` **ya tenía calculada** dos líneas antes. Cero cálculo nuevo.

**`avisoDeAgregado` no se tocó**, y es deliberado: su texto es el de D29, tiene siete tests y uno de
ellos compara el objeto entero (`toEqual`) justamente para ponerse rojo si alguien le agrega algo. Si
hubiera cambiado su firma, habría tenido que reescribir esos siete. El arreglo no lo necesita.

### Lo que NO toqué de D32

El BAJA de **«el dedup reordena la pila y mueve dos carteles 96 px»** sigue **abierto y sin cambios**:
el mecanismo es el mismo (el repetido se saca y el nuevo se apila al final, para que el plazo vuelva a
empezar). Mi cambio sólo altera **a quién** considera repetido, no qué hace con él — y lo hace **menos
seguido**, porque dos renglones distintos ya no se pisan. No lo arreglé ni lo empeoré.

---

## 4 · Mutación · 15 mutantes, 14 muertos, **1 vivo y es el que importa**

Restaurado **por hash**: antes de cada mutante se guarda una copia y el `sha256`; después se reescriben
los bytes guardados y se **verifica que el `sha256` vuelve a ser el mismo**. Cero `git restore`.
Al terminar los 15, el `git diff` del árbol volvió al **mismo `sha256`** que antes de empezar
(`fc5cc2c7…e77a75`).

| # | Mutante | Resultado | Test que cayó, por nombre |
|---|---|---|---|
| M1 | `avisos.ts`: el dedup vuelve a comparar el texto | **muere** | `dos rellenos distintos del mismo tamaño dan DOS avisos` |
| M2 | `asuntoDelAviso`: `?? aviso.texto` → `?? aviso.id` | **muere (3)** | `el mismo tamaño dos veces sigue dando UN aviso`, `sin asunto el dedup sigue mirando el texto`, `el mismo texto repetido no se apila dos veces` |
| M3 | `nuevoAviso` deja de copiar el `asunto` | **muere** | `dos rellenos distintos del mismo tamaño dan DOS avisos` |
| **M4** | **`CartContext`: `exito(texto, { asunto: clave })` → `exito(texto)`** | **🔴 SOBREVIVE · 267/267 verde** | — |
| M5 | `MARCA` front → la grafía vieja | **muere (2)** | `` `MARCA` es la grafía decidida ``, `ningún archivo del front dice la grafía vieja` |
| M6 | `MARCA` front → apóstrofo tipográfico | **muere (2)** | `` `MARCA` es la grafía decidida ``, `nadie escribe la marca en mayúsculas ni con apóstrofo tipográfico` |
| M7 | `index.html`: el `<title>` vuelve atrás | **muere (2)** | `ningún archivo del front dice la grafía vieja`, `el <title> y la descripción de la pestaña dicen la marca` |
| M8 | `SiteHeader.tsx`: `{MARCA}` → el literal viejo | **muere** | `ningún archivo del front dice la grafía vieja` |
| M9 | `SiteFooter.tsx`: `{MARCA}` → el literal viejo | **muere** | `ningún archivo del front dice la grafía vieja` |
| M10 | `MARCA` back → la grafía vieja | **muere (3)** | `test_la_constante_es_la_grafia_decidida`, `test_ningun_archivo_del_back_escribe_la_grafia_vieja`, `test_los_dos_mails_del_pedido_dicen_la_marca` |
| M11 | `PUNTO_DE_RETIRO_POR_DEFECTO` deja de empezar con `MARCA` | **muere** | `test_el_punto_de_retiro_por_defecto_sale_de_la_constante` |
| M12 | el asunto del mail al cliente pierde la marca | **muere** | `test_los_dos_mails_del_pedido_dicen_la_marca` |
| M13 | el cuerpo del mail al cliente pierde la marca | **muere** | `test_los_dos_mails_del_pedido_dicen_la_marca` |
| M14 | la descripción del envío en Mercado Pago pierde la marca | **muere** | `test_la_descripcion_del_envio_en_mercado_pago_dice_la_marca` |
| M15 | la semilla del texto institucional pierde la marca | **muere** | `test_el_texto_institucional_sembrado_dice_la_marca` |

**M8 y M9 son la noticia buena:** el barrido de fuentes **sí** cuida los dos archivos de React para esta
clase de regresión, sin `jsdom` y sin tocar ADR-023. No tapa D37 —no prueba que el header *dibuje*
nada— pero el agujero de «alguien vuelve a escribir el nombre a mano» quedó cerrado por un test.

**M4 es la noticia mala, y es exactamente D37.** Deshacer D36 en producción —sacarle el `asunto` a la
llamada del `CartContext`— deja las **267 en verde**. Es el gemelo del mutante que D37 ya tiene anotado
para D29. **No lo tapé**: taparlo pide `jsdom` + Testing Library, o sea revisar ADR-023, que es una
decisión y no una tarea. Lo dejo medido.

### Qué cuida un test y qué cuida una medición fechada

| Afirmación | Quién la sostiene |
|---|---|
| El dedup compara el asunto y no el texto | **test** (`avisos.asunto.test.ts`, mutantes M1/M2/M3 mueren) |
| Sin asunto nada cambia para el panel | **test** (M2 muere) |
| La grafía es `Andre's Bakery`, recta y en caja normal | **test** en los dos lados (M5/M6/M10 mueren) |
| Ningún archivo del front o del back escribe la grafía vieja | **test** de barrido (M7/M8/M9/M10 mueren) |
| Los dos asuntos de mail, el cuerpo, la descripción de MP y la semilla dicen la marca | **test de comportamiento** (M12–M15 mueren) |
| El `CartContext` le pasa el asunto al aviso | **nadie automático (M4 vive)** + medición en el navegador del **2026-10-25** |
| El header y el footer **dibujan** la marca | **nadie automático** + medición en el navegador del **2026-10-25** |
| La geometría no se movió | **medición en el navegador del 2026-10-25**, punto por punto (§5) |

---

## 5 · R07 · el navegador

El MCP de Playwright **conectó** (tercera vez seguida). Chromium real, back en `127.0.0.1:5000` y vite
en `localhost:5173`. `HashRouter`, como avisa `status.md`.

### 5.1 · El nombre, a 390 px y a 1280 px

| Qué | 390 px | 1280 px |
|---|---|---|
| `document.title` | `Andre's Bakery \| Dulces artesanales & recetas` | ídem |
| `<meta name="description">` | `Andre's Bakery: ecommerce de dulces artesanales…` | ídem |
| `alt` del logo | `Andre's Bakery` | ídem |
| nombre del header | `Andre's Bakery` — **no se dibuja**: el `<div>` es `hidden sm:block`, diseño de antes | `Andre's Bakery`, 131×23 en (119, 16) |
| nombre del footer | `Andre's Bakery`, 343×32 | `Andre's Bakery`, 379×32 en (32, 2872) |
| `Andres Bakery` en el `innerText` | **0** | **0** |
| `Andre's Bakery` en el `innerText` | 1 (footer) | 2 (header + footer) |
| U+2019 en el `innerText` | **0** | **0** |
| `scrollWidth - clientWidth` | — | **0** |

En el `dist/` del build: `<title>Andre's Bakery | …`, **una** aparición de `Andre's Bakery` en el bundle
(la constante, minificada) y **cero** de la vieja. Y **cero** fuga de `?raw` al bundle (los barridos de
los tests no entran en producción: `grep -c "GRAFIA\|import.meta.glob\|TIPOGRAFICO"` sobre el `.js` da 0).

### 5.2 · D36, el caso exacto del reviewer

A 390 px, `/#/producto/cheesecake-de-frutos-rojos`, carrito arrancando vacío. Dos veces: 12 porciones →
relleno → Bizcocho: Vainilla → Agregar → cerrar el drawer. Primero **Chocolate (+$800)**, después
**Dulce de leche**.

- **2 carteles en pantalla al mismo tiempo** (`aviso-1` y `aviso-3`), con el **mismo texto**:
  `«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito`.
- **2 renglones en el carrito**: `$ 20.600 por 12 porciones · Relleno: Chocolate · Bizcocho: Vainilla` y
  `$ 19.800 por 12 porciones · Relleno: Dulce de leche · Bizcocho: Vainilla`.
- **Subtotal `$ 40.400`** — el número exacto que midió el reviewer.
- Alto de los dos carteles: **64 px cada uno** (y=692 y y=764), o sea **el mismo alto de antes**: el
  texto no creció un carácter.

Una cosa que aprendí peleándola y que le sirve a quien repita esto: los botones de tamaño y de sabor son
**toggles**, así que volver a clickear el que ya está puesto lo **apaga**. Dos intentos míos quedaron con
«Falta elegir: Bizcocho» por eso. Hay que mirar `aria-pressed` antes de clickear.

### 5.3 · La geometría, punto por punto, y por qué **no hubo que barrer los seis anchos**

`document.elementFromPoint` en **cada punto entero** del botón, no uno por botón, con el **drawer
cerrado** (que es el único estado: con el drawer abierto «Ver carrito» ni se monta).

| Estado | «Ver carrito» (132×44 = 5.808 pts) | «Ayuda» (4.312 pts) | Carteles |
|---|---|---|---|
| 0 carteles | **0 / 5.808 · 0,00 %** | 0 / 4.312 · 0,00 % | — |
| **1 cartel** | **272 / 5.808 · 4,68 %** (lo roba `aviso-1`) | 0 / 4.312 · 0,00 % | y=764, h=64 |
| **2 carteles** | **272 / 5.808 · 4,68 %** (lo roba `aviso-3`) | 0 / 4.312 · 0,00 % | y=692 h=64, y=764 h=64 |

**El segundo cartel no roba ni un punto más.** El número es **idéntico** con uno y con dos, y «Ayuda»
sigue en 0 %. Eso es lo que contesta la pregunta del leader mejor que «no toqué el alto»: **D36 no mueve
la geometría**, porque (a) el texto no cambió de largo, los dos carteles siguen en 64 px; (b) la pila de
**dos** carteles de 64 px **ya era alcanzable antes de esta tanda** —D29 la produce con 8 y 12 porciones
del mismo Cheesecake, y `TOPE_VISIBLES` es 3 desde F64—, así que D36 agrega **otro camino al mismo
estado**, no un estado nuevo; y (c) el slot de abajo, el único que toca «Ver carrito», está ocupado por
**un** cartel en los dos casos. No hay alto nuevo que barrer en seis anchos.

> **Un número que no cierra con `status.md` y no es mío.** La fila D32 anota el robo en
> **4,41 % · 256 de 5.808**; hoy, con el código de esta tanda, mido **4,68 % · 272 de 5.808**. Los 16
> puntos de diferencia **no los trae D36**: el valor es **el mismo con un cartel que con dos**, y 256 es
> exactamente la intersección de la X (16×16) con el botón, o sea mi barrido está contando 16 puntos más
> que el de ayer (muy probablemente por dónde cae el muestreo: yo uso `Math.ceil(borde)` y el centro del
> píxel, `+0.5`). **No lo perseguí**: queda como dato para quien escriba `status.md`, con el método a la
> vista para que se pueda repetir.

### 5.4 · Lo que escribí en la base de desarrollo, declarado

Levantar el sitio hace que **cada carga de página haga un `POST /api/metrics/view`**, que inserta una
fila `PageView`. Navegué unas diez veces (portada, ficha, carrito), así que **hay ~10 filas `PageView`
nuevas** en la base de desarrollo. Es inevitable si se cumple R07 y no es un error. **Nada más**: ni
productos, ni pedidos, ni migraciones, ni un `SiteContent` tocado. Sí borré **mi** carrito del
`localStorage` del Chromium de prueba entre intentos, que no es la base.

### 5.5 · Servidores apagados y verificado

Los bajé **por PID** (el hijo de `npm run dev` sobrevive al padre: la cadena era
`nohup → python 36636 → python 17336` y `cmd 47208 → node 16736`).

```
matado 17336 / ya no estaba 36636 / matado 16736 / matado 47208
curl  5000 -> 000
curl  5173 -> 000
netstat -ano | grep LISTENING | grep -E ":5000|:5173"   -> (vacío)
Get-CimInstance Win32_Process | ... -match 'backend.app|vite|npm run dev'  -> ningún hijo vivo
```

---

## 6 · Cómo medí el bundle sin tocar git

`git stash`/`restore`/`checkout` están prohibidos, así que di vuelta **mis propios cambios del front** con
un script en el scratchpad que hace reemplazo de texto **con un `assert` de unicidad por cada par**,
buildeé, y los volví a aplicar. Verificación de que no quedó nada a medias: el `sha256` del
`git diff` del árbol es **`fc5cc2c742628860e3b8c90c5123bb4fcdab1d47a9fb407be8dc76f9d9e77a75`** antes de
la medición, después de la medición, y después de los 15 mutantes. El build volvió al mismo hash de
archivo (`index-DFE5XA2U.js`), o sea el build es determinista.

**Un detalle de higiene que corregí y conviene saber:** la primera escritura de `backend/.env.example`,
`backend/README.md` y `backend/config.py` les **cambió los fines de línea de CRLF a LF**. `git diff` no
lo mostraba (`core.autocrlf=true` normaliza) pero el archivo en disco había cambiado de verdad, y el
resto del árbol es CRLF. Se los devolví a CRLF a mano, sin git. Los cinco archivos nuevos también quedaron
en CRLF, como el resto.

---

## 7 · Archivos

**Producción, 12 modificados (3 + 9):**
```
backend/.env.example                           | 2 +-
backend/README.md                              | 2 +-
backend/config.py                              | 3 ++-
backend/services/bootstrap_service.py          | 3 ++-
backend/services/notifications.py              | 7 ++++---
backend/services/payment_service.py            | 3 ++-
front/Andres_Bakery/index.html                 | 8 ++++++--
front/Andres_Bakery/src/contexts/AvisosContext.tsx
front/Andres_Bakery/src/contexts/CartContext.tsx
front/Andres_Bakery/src/layout/SiteFooter.tsx  | 3 ++-
front/Andres_Bakery/src/layout/SiteHeader.tsx  | 5 +++--
front/Andres_Bakery/src/lib/avisos.ts
```
**Nuevos, 5:**
```
backend/marca.py                                       (30 líneas)
backend/tests/test_marca.py                            (147)
front/Andres_Bakery/src/lib/marca.ts                   (27)
front/Andres_Bakery/src/lib/marca.test.ts              (98)
front/Andres_Bakery/src/lib/avisos.asunto.test.ts      (98)
```
**R05:** ninguno pasa de 300 líneas. El más grande que toqué es `carrito.ts` con **260**, y no creció
porque `avisoDeAgregado` quedó igual. `avisos.ts` pasó de 168 a **193**. Los dos archivos de test nuevos
son nuevos justamente por R05: `avisos.test.ts` está en 245 y `carrito.aviso.test.ts` ya nació partido
por el mismo motivo.

**No escribí** `sdd/status.md`, `spec.md`, `decisions.md`, `features.md`, `testing.md` ni `changelog.md`.
Este archivo es el único MD que escribí.

---

## 8 · Lo que queda abierto

1. **🔴 `PICKUP_ADDRESS` en `backend/.env` sigue con la grafía vieja, y se ve en el sitio** (carrito y
   checkout, medido). **Lo tiene que editar una persona**; yo no puedo abrir ese archivo. Es la única
   parte de D24 que queda sin hacer, y es visible.
2. **🔴 M4 sobrevive: nada automático cuida el cableado del `CartContext`.** Sacarle el `asunto` deshace
   D36 con las 267 en verde. Es D37 tal cual está escrita; taparlo pide revisar ADR-023.
3. **El header y el footer no tienen test de render.** Lo que hay es un barrido de fuentes (que mata M8 y
   M9) más la medición fechada de §5.1. No es lo mismo y no lo declaro como si lo fuera.
4. **Los dos BAJA de D32 siguen abiertos** y sin cambios: el `aria-label` de la X, y el reordenamiento de
   la pila del dedup. Mi cambio **no los toca**.
5. **Dos números de `status.md` que la medición de hoy contradice**, los dos para quien escriba los MDs:
   el bundle JS (426,68 kB anotado vs **428,10 kB** medido **sin** mis cambios, con vite 7.3.7) y el robo
   de «Ver carrito» (4,41 % · 256/5.808 anotado vs **4,68 % · 272/5.808** medido hoy, el mismo valor con
   uno y con dos carteles). **Ninguno de los dos lo trae esta tanda.**
6. **Decisión que no es mía:** si la marca es `Andre's Bakery`, ¿el `statement_descriptor` de la tarjeta
   (`ANDBAKERY`, 13 caracteres sin apóstrofo) y el `# Andres_Bakery` del README raíz se dejan así para
   siempre? Yo los dejé por la regla 3, y para mí está bien, pero conviene que quede escrito.
7. **R30:** falta el reviewer independiente que **re-ejecute**. No fui yo quien lo puede hacer.
