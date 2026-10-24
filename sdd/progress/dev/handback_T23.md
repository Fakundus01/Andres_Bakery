# HANDBACK · T23-F64 · Avisos al admin y a quien compra

**Rama:** `dev` · **Versión:** 0.17.0 · **Fecha:** 2026-10-20
**Estado:** implementado, **cuatro comandos en verde**, **medido en el navegador** a 1920px y 390px
con Playwright. **Sin commitear** (R01). **Falta el reviewer independiente** (R30) y queda **un
hueco de verificación declarado** (el panel) y **una decisión tuya pendiente** (el link del aviso
del carrito).

> **Al 2026-10-22 (T23b).** El reviewer independiente corrió: `review_T23.md`,
> **CHANGES_REQUESTED**, 12 hallazgos (3 ALTA · 3 MEDIA · 6 BAJA). Los **tres ALTA** quedaron
> atendidos, y las correcciones de este MD llevan la marca «Corregido el 2026-10-22»; el cierre está
> en `handback_T23b.md`. Lo que sigue abajo es lo que se escribió el 2026-10-20.

> Último commit: `4bb20b0` (T20-F61, 0.16.0), árbol limpio. Todo lo de esta tarjeta está sin
> commitear. La base de desarrollo **no se tocó**: el admin temporal de la verificación se borró y
> no hubo migración.

## Hecho

| Dónde | Antes | Ahora |
|---|---|---|
| Carrito | abría el drawer y nada más | **dice qué se agregó**, con el nombre del producto |
| Panel · éxito | una barra verde que se pisaba y no se iba nunca | un aviso que se apila y se va solo |
| Mecanismo | uno por pantalla, ad-hoc | **uno para los avisos flotantes** (`AvisosContext` + `RegionDeAvisos`), panel incluido |
| Tonos | solo verde | éxito, error y aviso, con los tokens que ya tenían los cuatro temas |
| Lectores de pantalla | nada | `aria-live="polite"` en la región, `role="alert"` en el error |

> **Corregido el 2026-10-22 (ADR-038, el DRIFT que R25 pedía).** Esa fila decía **«uno
> (`AvisosContext` + `RegionDeAvisos`) para todo el sitio»** y era falso: quedaron cuatro mensajes
> ad-hoc —`OpcionesTab.tsx:59`, `SaboresDelGrupo.tsx:34`, `SelectorDeIngredientes.tsx:37` y el de
> `ProductPage.tsx`, que no se tocó—, así que el sitio tiene seis mecanismos y no uno. Lo contó el
> reviewer con un `grep` de diez segundos. **No se migran**: son respuestas pegadas a un
> formulario y el razonamiento de C2b las cubre —un error de formulario va al lado del
> formulario—, pero eso es una decisión y **se tomó en silencio**, que es justo lo que R25
> prohíbe. Queda escrita en **ADR-038** y C1 quedó reescrito en la tarjeta. Lo que de verdad migró
> es el **éxito compartido del panel**, que era el que se pisaba entre pestañas y el que no se iba
> nunca.

**Archivos nuevos (4):** `lib/avisos.ts`, `lib/avisos.test.ts`, `contexts/AvisosContext.tsx`,
`components/RegionDeAvisos.tsx`.

El aviso del carrito vive **adentro de `addItem`** del `CartContext`, no en los tres lugares que lo
llaman (`HomePage`, `ShopPage`, `ProductPage`): un lugar, y no se puede olvidar en el cuarto.

## Tests · comando + salida literal

**El rojo, medido contra `4bb20b0`** (el test se escribió antes del módulo):

```
npm --prefix front/Andres_Bakery run test
 FAIL  src/lib/avisos.test.ts [ src/lib/avisos.test.ts ]
Error: Cannot find module './avisos' imported from .../src/lib/avisos.test.ts
 Test Files  1 failed | 17 passed (18)
      Tests  207 passed (207)
```

Ese rojo es de suite entera, no de cada aserción, así que **el recorte que protege al error se
rompió a propósito una vez** (R29): cambiando `acotar` para que descarte por antigüedad a secas,

```
× el tope se lleva primero un éxito viejo antes que un error viejo
AssertionError: expected [ 'ok 0', 'ok 1', 'ok 2' ] to include 'no se pudo guardar'
  ❯ src/lib/avisos.test.ts:93:38
```

**El verde:**

```
npm --prefix front/Andres_Bakery run test   →  Test Files 18 passed · Tests 224 passed (224)
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
                                            →  Ran 365 tests in 93.709s · OK
npm --prefix front/Andres_Bakery run lint   →  sin salida (eslint + tsc)
npm --prefix front/Andres_Bakery run build  →  index-Dd9W5Qf1.js 426,60 kB · index-B82F_B2b.css 36,23 kB
```

17 tests nuevos en el front (207 → 224). El back no se tocó en esta tarjeta; los 365 se corrieron
igual porque el `.env.example` y `config.py` cambiaron (la carpeta de Cloudinary, abajo).

## El navegador, y lo que encontró

Playwright **sí conectó** esta sesión (en T20 no, y hubo que manejar Chrome por CDP a mano).
Servidores propios: back en `127.0.0.1:5000`, front en `localhost:5173`.

### Lo que se midió, a 1920px

| Qué | Resultado |
|---|---|
| La región existe vacía | **sí** (`[aria-live="polite"]` presente sin avisos) — un `aria-live` que nace con su contenido no se anuncia |
| Agregar al carrito | `«Brownie Tentacion» se agregó al carrito`, `role="status"`, link `Ir al carrito` → `#/carrito`, 68px de alto |
| Se va solo | a los 400ms está; **a los 4.600ms ya no** |
| Dos productos distintos | **se apilan**: `[«Brownie Tentacion»…, «Cookies New York»…]` |
| El mismo repetido | **no suma un tercero**: la lista queda en 2 (el dedup reemplaza) |
| Desborde horizontal | **0** |

### El defecto que encontró, a 390px

**El aviso se comía el clic del botón de pagar.** Con el drawer del carrito abierto, el cartel se
dibuja entre 740px y 828px de alto y **encima de «Ir al checkout»**:

```
checkout → quienRecibeElClic: "DIV «Brownie Tentacion» se…"   ← el aviso, no el botón
```

O sea: en celular, agregar algo al carrito **bloqueaba el camino a pagar durante cuatro segundos**.
Las dos suites estaban en verde y ningún test de lógica pura podía verlo.

**Arreglado** sacándole `pointer-events-auto` al cartel y dejándolo **solo en el link y en la X**.
Medido después:

```
checkout            → quienRecibeElClic: "BUTTON Ir al checkout"   ✓
link del aviso      → quienRecibeElClic: "A Ir al carrito"         ✓
X del aviso         → quienRecibeElClic: "path"  (el svg del botón) ✓
desborde            → 0
aviso               → 343px de ancho, márgenes de 16px, 16px al fondo, entra en pantalla
```

**No tiene test de regresión**, y es honesto decirlo: es colisión de layout, que es justo lo que
ADR-023 dejó afuera (D7, sin tests de componente). Lo que lo protege es que el cartel ya no es
clickeable salvo en lo que tiene que serlo.

## Lo que NO se verificó (hueco declarado)

**El aviso del panel no se vio en el navegador.** Armé un admin temporal con contraseña random
(nunca la tuya) y lo borré al terminar, pero el front entró al panel y el back le devolvió **401 en
todos los endpoints de admin**, así que la app rebotó a `#/ingresar`.

> **Corregido el 2026-10-22, y este hueco ya está cerrado.** Dos cosas: (1) `admin_required`
> (`backend/routes/utils.py:65-73`) devuelve **403**, no 401 — un 401 sale de la verificación del
> JWT, así que lo que rebotó era el token y no el permiso de admin, y este párrafo manda a buscar
> en el lugar equivocado; (2) el reviewer **vio el aviso del panel**: dice «Etiqueta guardada.», se
> va a los 4,8 s y **no quedó ninguna barra verde** fuera de la región. El camino que funciona es
> montar la sesión en `localStorage` **antes** de que el provider monte (puesta después del
> montaje, rebota a `#/ingresar`), sin crear usuarios ni tocar privilegios ni la base. Es plomería de auth del
usuario de prueba, no del cambio de esta tanda, y preferí declararlo antes que seguir gastando ahí.

**Lo que sí está verificado del panel:** `lint` (eslint + tsc) pasa, y el cambio es chico —
`setAviso` pasó a llamar a `avisos.exito` y la barra verde salió de `AdminPage`. **Lo que falta
mirar** es que al guardar una etiqueta aparezca el aviso y que la barra verde ya no esté. Con que
entres una vez al panel, lo mido en dos minutos.

## Dos cosas de mis propios MDs que estaban mal

Las dos las encontré leyendo el código **después** de escribir la tarjeta, y las corregí ahí mismo
en vez de dejarlas:

1. **"La barra del panel está pintada de verde siempre, salga bien o mal."** Falso: los errores van
   por otro canal (`setError` → `ErrorBanner`, `AdminPage.tsx:60`). El defecto real es que **no se
   va nunca** y que **se pisa**.
2. **"Agregar al carrito no dice nada."** Falso: abre el `CartDrawer`, que muestra el carrito.

Esto importa más que el detalle: es el ALTA que el reviewer de T19 encontró —MDs que mandan a
arreglar lo que ya está bien— apareciendo otra vez, y esta vez en algo que escribí hoy.

## La decisión que te queda (R25)

**El link «Ir al carrito» del aviso es redundante**, y lo dice la medición: `addItem` **abre el
drawer**, así que cuando el aviso aparece, el carrito ya está en pantalla. El link manda a `#/carrito`
—una tercera puerta al mismo lugar— y es lo que estaba por encima del botón de pagar.

| Opción | Qué implica |
|---|---|
| **A · Sacar el link** (recomiendo) | El aviso dice **qué** se agregó, que es lo que el drawer no dice; ir al carrito ya lo ofrece el drawer. Es sacar tres líneas |
| B · Dejarlo como está | Quedan tres caminos al carrito. Ya no bloquea nada, pero sigue siendo ruido arriba del checkout |
| C · Que `addItem` no abra el drawer | El aviso pasa a ser **la** confirmación y el link se justifica. Es la mejor UX a mi gusto y **un cambio de comportamiento que no pediste**, así que no lo hice |

> **Decidido el 2026-10-22: opción A.** El link salió y `addItem` **no cambió**. El review midió
> por qué: el link se llevaba el **29,7% de «Ayuda»** y el **10,4% de «Ver el carrito completo»** a
> 390 px. Después de sacarlo, los dos quedaron en **0**. Está escrito en **ADR-037** e implementado
> en `handback_T23b.md`; C7 quedó reescrito en la tarjeta.

## Lo que quedó a medias de la tarjeta

**C6 pedía "y los errores de cada uno", y el tono `error` no tiene todavía ningún productor real.**
Está construido y testeado (se ve rojo, no se va solo, el tope no se lo lleva), pero en la app nadie
lo dispara: el carrito no puede fallar, y los errores del panel se quedan en `ErrorBanner` **a
propósito** (C2b: un error de formulario va al lado del formulario). Así que el error flotante
existe sin usarse.

No lo forcé para poder tachar el criterio. Las candidatas honestas son las acciones **sin formulario
en pantalla** —borrar, pausar un producto— que hoy también van al `ErrorBanner`. Decime si querés
que las mueva, o lo dejamos para cuando aparezca el caso.

## Lo de Cloudinary, que entró en el mismo diff

- `config.py:94` y `.env.example`: la carpeta por defecto pasó de `andres-bakery` a **`Andres_Bakery`**,
  como pediste. Las 41 pruebas de subida siguen OK (eran fixtures con valor fijo, no leían el default).
- **Las credenciales siguen sin aparecer.** `backend/.env` tiene las tres líneas vacías que agregué,
  no hay ningún valor `CLOUDINARY_*` en ningún archivo del repo (grep completo), y las variables de
  Windows no están definidas en proceso, usuario ni máquina. **B8 sigue abierto.**

## MDs

- `features.md`: F62, F63 y F64 nuevas, con lo que decidiste antes de escribir código y lo que no entra.
- `status.md`: §5 reordenada (T23 en curso, después T21 y T22) y la línea vieja de T19 corregida.
- `sdd/cards/`: T21-F62, T22-F63 y T23-F64 nuevas. La de "ofertas" que escribí antes del descuento
  se borró: quedó vieja entera.
- **Pendiente al cerrar:** `changelog.md` (0.17.0), `testing.md` y la tabla de salud de `status.md`.

## Git

Nada commiteado (R01). 8 archivos modificados y 7 nuevos.

## Costo

Una sesión, modelo alto, sin subagentes. El reviewer independiente que R30 pide **todavía no corrió**.

## Riesgos

1. **El panel sin mirar** (arriba). Es el riesgo real de esta tanda.
2. **Sin tests de componente** (D7): ni el defecto de los `pointer-events` ni el "se va solo" tienen
   red automática. Lo que hay es la medición de hoy, que no se repite sola.
3. **El dedup compara texto exacto.** Dos productos con el mismo nombre darían un solo aviso. Con la
   carta de hoy no pasa, y los nombres son únicos de hecho, no por regla.
4. **`usePanelDeAdmin.ts` quedó en 290 líneas** (era 279): el comentario de por qué el `""` ya no
   hace nada vale lo que ocupa, pero el archivo está a 10 del tope de R05.

## Próximo paso propuesto

1. **El OK y el commit** (R01), y **tu decisión sobre el link** (A, B o C).
2. **Entrar al panel una vez** para que cierre la verificación del aviso de admin.
3. **El reviewer independiente** (R30), que todavía no corrió.
4. Después, **T21-F62** (el descuento en la etiqueta), que es la que toca plata.
