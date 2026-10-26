# REVIEW · D24 + D36 · reviewer independiente de R30

**Rama:** `dev` · **Commit revisado:** `5fd3816` (0.17.4) · **Base de la tanda:** `6f549a4` · **HEAD al
revisar:** `2fd3658` (B9, que sólo toca `sdd/status.md`)
**Fecha:** 2026-10-26 · **Rol:** reviewer independiente — **no implementé nada de esto y no arreglé
nada.**

**Veredicto: CHANGES_REQUESTED** — y conviene la misma primera línea que el review anterior: **no hace
falta tocar una sola línea de producción.** D24 y D36 andan, están medidos, y todo lo que el handback
declara como comportamiento **se sostuvo al re-ejecutarlo**, número por número, incluida la medición
más trabajosa de todas (el bundle). Lo que no se sostiene es **el registro alrededor de dos cosas**:
(a) lo que status.md y el changelog dicen que el barrido de fuentes cuida —tres mutantes que deberían
morir siguen vivos—, (b) **el guard del propio barrido no guarda la mitad que se le acredita**, y
(c) tres números «medidos» que no se reproducen. R30 pide evidencia honesta, no sólo código que anda.

## 0 · Estado del árbol, al empezar y al terminar

```
$ git rev-parse --abbrev-ref HEAD
dev
$ git rev-parse HEAD
2fd3658a09dd5270cbdaf9708111e7bdea627436

$ git status --short        (AL EMPEZAR)
(vacío)
$ git status --short        (AL TERMINAR)
(vacío)
```

**R01 respetada:** ni `git add`, ni `commit`, ni `push`, ni `restore`, ni `checkout`, ni `stash` en
toda la revisión. Cada archivo que toqué se copió byte a byte antes y se devolvió desde esa copia
**verificando `sha256`**, igual que hizo el implementer. Los 14 archivos de producción que di vuelta
para medir el rojo volvieron con **`OK` en los 14 hashes**; los 12 mutantes volvieron con
`restaurado_por_hash: true` en los 12. El único archivo versionado que escribo es éste.

**`backend/.env` no se abrió.** Lo único que averigüé de él es **si una clave está o no**, nunca su
valor, y acá no hay ninguno.

## 1 · Los cuatro comandos del harness, re-ejecutados

Exit medido **sin tubería** (`cmd > archivo; echo $?`), nunca `cmd | tail; echo $?`.

| Qué declara el handback | Re-ejecutado | Veredicto |
|---|---|---|
| Back **368 → 376 OK**, exit 0 | `Ran 376 tests in 102.496s` · `OK` · **EXIT=0** | **SE SOSTIENE** |
| Front **256 en 20 → 267 en 22**, exit 0 | `Test Files 22 passed (22)` · `Tests 267 passed (267)` · **EXIT=0** | **SE SOSTIENE** |
| Lint limpio (eslint + los dos `tsc`) | sin salida, **EXIT_LINT=0** | **SE SOSTIENE** |
| Build verde, **CSS en el mismo hash** | `index-DywBBMqZ.css 36.28 kB` · **EXIT_BUILD=0** | **SE SOSTIENE** |
| JS `428,17 kB` | `index-DFE5XA2U.js 428.17 kB │ gzip: 128.53 kB` | **SE SOSTIENE** |

### 1.1 · El bundle: la medición más cara del handback, re-hecha y exacta

El handback afirma que **lo nuevo cuesta 0,07 kB** y que los 1,42 kB que faltaban contra los 426,68 de
la hoja **son del `vite 7.3.7` instalado**. Lo volví a medir dando vuelta sus seis archivos de front
desde `6f549a4` y sacando los tres nuevos (`marca.ts` y los dos de test), sin `git restore`:

```
$ for f in <los 6 del front>; do git show 6f549a4:"$f" > "$f"; done   # + saco marca.ts y los 2 tests
$ npm --prefix front/Andres_Bakery run build
dist/assets/index-DywBBMqZ.css   36.28 kB │ gzip:   7.35 kB
dist/assets/index-ukpe8W5L.js   428.10 kB │ gzip: 128.49 kB      <-- SIN la tanda
EXIT=0
$ (restauro los 7 por hash: OK en los 7)  &&  npm run build
dist/assets/index-DywBBMqZ.css   36.28 kB │ gzip:   7.35 kB
dist/assets/index-DFE5XA2U.js   428.17 kB │ gzip: 128.53 kB      <-- CON la tanda
EXIT=0
```

**428,10 sin · 428,17 con · +0,07 kB. Exacto.** Y de yapa, un cruce que el handback no tenía: el
`index-ukpe8W5L.js` que me dio sin la tanda es **el mismo hash de archivo** que midió el review de
D29/D30 en `02a1872`, o sea que el front de la base es idéntico por ese lado y el build es
determinista. El CSS no se movió un byte en ninguno de los tres builds.

## 2 · El rojo contra `6f549a4` (R29), reconstruido

Mismo método que el review anterior: **producción de `6f549a4`, tests de `5fd3816`**, que es
exactamente lo que el handback describe. `git diff --stat` de los tres archivos de test: **vacío**
(son los de HEAD, byte a byte).

### 2.1 · Front — **4 rojos, exit 1**

```
 × dos rellenos distintos del mismo tamaño dan DOS avisos 16ms
 × `MARCA` es la grafía decidida, con apóstrofo recto y en caja normal 7ms
 × ningún archivo del front dice la grafía vieja 4ms
 × el `<title>` y la descripción de la pestaña dicen la marca 4ms

 FAIL  avisos.asunto.test.ts > dos rellenos distintos del mismo tamaño dan DOS avisos
AssertionError: expected [ { id: 'aviso-2', …(2) } ] to have a length of 2 but got 1
 FAIL  marca.test.ts > `MARCA` es la grafía decidida...
Error: Cannot find module '/src/lib/marca' imported from .../src/lib/marca.test.ts
 FAIL  marca.test.ts > ningún archivo del front dice la grafía vieja
AssertionError: expected [ 'layout/SiteFooter.tsx', …(2) ] to deeply equal []
 FAIL  marca.test.ts > el `<title>` y la descripción de la pestaña dicen la marca
AssertionError: expected '<!DOCTYPE html>\n<html lang="es" data…' to contain '<title>Andre\'s Bakery | Dulces artes…'

 Test Files  2 failed | 20 passed (22)
      Tests  4 failed | 263 passed (267)
EXIT=1
```

**Los cuatro declarados, con los mismos mensajes. SE SOSTIENE.**

### 2.2 · Back — **1 FAIL + 5 ERROR, exit 1, y los seis culpables exactos**

```
test_el_barrido_mira_archivos_de_verdad ... ok
test_el_punto_de_retiro_por_defecto_sale_de_la_constante ... ERROR
test_la_constante_es_la_grafia_decidida ... ERROR
test_nadie_escribe_la_marca_en_mayusculas_ni_con_apostrofo_tipografico ... ok
test_ningun_archivo_del_back_escribe_la_grafia_vieja ... FAIL
test_el_texto_institucional_sembrado_dice_la_marca ... ERROR
test_la_descripcion_del_envio_en_mercado_pago_dice_la_marca ... ERROR
test_los_dos_mails_del_pedido_dicen_la_marca ... ERROR

ModuleNotFoundError: No module named 'backend.marca'      (x5)

FAIL: test_ningun_archivo_del_back_escribe_la_grafia_vieja
AssertionError: Lists differ: ['config.py', 'services\\bootstrap_service[91 chars]ple'] != []
- ['config.py', 'services\\bootstrap_service.py', 'services\\notifications.py',
-  'services\\payment_service.py', 'README.md', '.env.example']

Ran 8 tests in 1.749s
FAILED (failures=1, errors=5)
EXIT=1
```

**SE SOSTIENE entero**, incluidos **los seis archivos culpables en ese orden**. Y se sostiene la
honestidad de lo que el handback declaró como *candado nacido verde*: en el rojo,
`test_nadie_escribe_la_marca_en_mayusculas_ni_con_apostrofo_tipografico` sale **`ok`**, como dice.
**HONESTO.**

## 3 · Mutación · 12 mutantes propios, y tres sobreviven donde la hoja dice que no

Cada uno: una sustitución de texto con `assert` de unicidad, suite entera, restauración desde los
bytes guardados **verificando `sha256`**. `restaurado_por_hash: true` en los doce. Cinco son los del
handback, re-ejecutados; siete son míos.

| # | Mutante | Resultado | Tests que cayeron (nombre literal de la salida) |
|---|---|---|---|
| N1 | `SiteHeader`: `{MARCA}` → el literal viejo (**=M8**) | **MUERE** 1/267 | `ningún archivo del front dice la grafía vieja` |
| N2 | `SiteFooter`: `{MARCA}` → el literal viejo (**=M9**) | **MUERE** 1/267 | `ningún archivo del front dice la grafía vieja` |
| **N3** | **`SiteHeader` deja de DIBUJAR la marca** (`alt=""` y `<p></p>`) | **🔴 SOBREVIVE · 267/267** | — |
| **N4** | **`SiteFooter` deja de DIBUJAR la marca** (`<p></p>`) | **🔴 SOBREVIVE · 267/267** | — |
| **N5** | **`SiteHeader`: `{MARCA}` → `Andrea's Bakery`** (tercera grafía) | **🔴 SOBREVIVE · 267/267** | — |
| **N6** | **`CartContext`: saco el `{ asunto: clave }` (deshace D36) (=M4)** | **🔴 SOBREVIVE · 267/267** | — |
| **N7** | **`marca.test.ts`: el glob de `.tsx` no matchea nada** | **🔴 SOBREVIVE · 267/267** | — |
| N8 | `marca.ts` desincronizado (tercera grafía) | **MUERE** 1/267 | `` `MARCA` es la grafía decidida… `` |
| N9 | `index.html` desincronizado del `<title>` | **MUERE** 1/267 | `el <title> y la descripción de la pestaña dicen la marca` |
| N10 | `marca.py` desincronizado (tercera grafía) | **MUERE** back `FAILED (failures=1)` | `test_la_constante_es_la_grafia_decidida` |
| N11 | `asuntoDelAviso`: `?? aviso.texto` → `?? aviso.id` (**=M2**) | **MUERE (3)** 3/267 | `sin asunto el dedup sigue mirando el texto: el panel no cambia` · `el mismo texto repetido no se apila dos veces: no es información nueva` · `el mismo tamaño dos veces sigue dando UN aviso: el dedup no se rompió` |
| N12 | `nuevoAviso` deja de copiar el `asunto` (**=M3**) | **MUERE** 1/267 | `dos rellenos distintos del mismo tamaño dan DOS avisos` |

Los cinco re-ejecutados del handback (M8, M9, M4, M2, M3) **dan exactamente lo declarado**, y los tres
nombres de la fila M2 son los tres reales, sólo truncados en el `:`. **La tabla de mutantes del
handback es honesta.** Los mutantes del back y de la marca que no repetí (M5–M7, M10–M15) quedan
sostenidos por el rojo de §2, que es la misma afirmación medida al revés.

Lo que la tabla NO dice, y es el hallazgo A1: **N3, N4 y N5 pasan limpio.**

## 4 · Hallazgos

### ALTA

**A1 · «El barrido mata los mutantes de `SiteHeader` y `SiteFooter`» cierra una sola clase de
regresión, y la hoja lo vende como la salida barata para D37.**
La fila **D37** de `status.md` dice: *«el barrido de fuentes de D24 —un test que lee los archivos y
busca la marca— **mata los mutantes de `SiteHeader.tsx` y `SiteFooter.tsx`** sin `jsdom` y sin tocar
ADR-023 […] para lo que es presencia de algo en un archivo de React, alcanza»*. El changelog 0.17.4
repite la frase («**la salida barata**»). El handback §4 es más prudente —dice *«no prueba que el
header dibuje nada»*— pero igual escribe *«el agujero […] quedó cerrado por un test»*.
**Lo muté a mano, como pedía la consigna, y la frase es demasiado ancha.** El barrido mata **un solo**
mutante: *alguien vuelve a escribir la grafía **vieja** a mano*. Tres mutantes de esos mismos dos
archivos dejan las **267 en verde**:

```
{"mutante":"N3 SiteHeader: deja de dibujar la marca (alt y <p> vacios)","exit":0,
 "tests":"267 passed (267)","fallidos":[],"VEREDICTO":"SOBREVIVE","restaurado_por_hash":true}
{"mutante":"N4 SiteFooter: deja de dibujar la marca (<p> vacio)","exit":0,
 "tests":"267 passed (267)","fallidos":[],"VEREDICTO":"SOBREVIVE","restaurado_por_hash":true}
{"mutante":"N5 SiteHeader: {MARCA} -> \"Andrea's Bakery\" (tercera grafia)","exit":0,
 "tests":"267 passed (267)","fallidos":[],"VEREDICTO":"SOBREVIVE","restaurado_por_hash":true}
```

O sea: **se puede borrar la marca del header y del footer, y escribirla mal con cualquier grafía que
no sea la vieja exacta, sin que un test se entere.** «Presencia de algo en un archivo de React» es
justo lo que el barrido **no** cubre: cubre *ausencia de una cadena concreta*.
**Y la pregunta que importaba:** el barrido **no mata** el mutante de D37 (`CartContext` sin el
asunto). N6 deja **267/267 en verde**, igual que el M4 del handback. No hay ninguna relación entre un
barrido que busca la marca y el cableado del carrito, pero la fila D37, tal como está escrita,
termina sugiriendo que la salida barata alcanza para el hueco que la fila describe — y el hueco que la
fila describe incluye **el caso que la misma tanda acaba de agregar**.
**Qué pedir:** que la fila D37 y el changelog digan exactamente qué clase cierra el barrido —*«que
nadie vuelva a escribir la grafía vieja a mano»*— y que digan, con N3/N4/N5, que **no** cubre ni que
el header dibuje la marca ni que la escriba bien, y que **no toca** el mutante del `CartContext`. No
es código: es una deuda que quedó escrita más chica que su tamaño, otra vez.
**Reproducción:** los tres mutantes de arriba, suite entera, restauración por `sha256`.

**A2 · El guard del barrido no guarda la mitad por la que se lo elogia: rompí el glob de `.tsx` y las
267 siguen verdes.**
`marca.test.ts` abre con un `it` que existe justamente para que el barrido no dé un verde vacío:

```ts
it("el barrido mira archivos de verdad", () => {
  expect(fuentes.length).toBeGreaterThan(30);
  expect(fuentes.some(([ruta]) => ruta.endsWith("index.html"))).toBe(true);
});
```

Las fuentes salen de **tres** globs: `../**/*.ts`, `../**/*.tsx` y `../../*.html`. El guard nombra el
`index.html` (o sea cuida el glob de HTML) y pone un piso de 30 archivos — pero **`src` tiene 67
archivos `.ts` y 79 `.tsx`**, así que los `.ts` solos pasan el piso de sobra. **El glob de `.tsx` —el
único que mete `SiteHeader.tsx` y `SiteFooter.tsx` en el barrido, que es exactamente lo que A1
discute— no está guardado por nada.** R29 pide *«check/guard/hook nuevo ⇒ romperlo a propósito 1 vez
y pegar la salida»*; el handback rompió la producción, pero no rompió **este** guard. Lo rompí yo:

```
$ # marca.test.ts: import.meta.glob("../**/*.tsx") -> import.meta.glob("../**/*.tsxZ")
{"mutante":"N7 marca.test.ts: el glob de .tsx no matchea nada (rompo el guard a proposito)",
 "exit":0,"tests":"267 passed (267)","fallidos":[],"VEREDICTO":"SOBREVIVE",
 "restaurado_por_hash":true,"sha":"3888233f966c8b94292e95f6d70a5ebe5deb3cc589519fa0f5040bf3e3d1761b"}
```

Una letra en el glob y los dos archivos de React salen del barrido **en silencio**, con lo que M8/M9
—la «noticia buena» del handback— dejan de morir sin que nada se ponga rojo. El barrido del back **no
tiene este problema**: su guard nombra un archivo concreto (`self.assertIn("config.py", …)`), que sí
viene del `rglob` que importa. Es la misma red, bien puesta de un lado y corta del otro.
**Qué pedir:** que el guard del front nombre un `.tsx` de verdad, como el del back nombra `config.py`
(por ejemplo `expect(fuentes.some(([r]) => r.endsWith("layout/SiteHeader.tsx"))).toBe(true)`), y que
el registro diga que el guard se rompió a propósito y se vio caer. Es una línea de test; **yo no la
escribí**, es de quien implementa.
**Reproducción:** la mutación de arriba, y `find front/Andres_Bakery/src -name "*.ts" | wc -l` → **67**,
`-name "*.tsx"` → **79**.

### MEDIA

**M1 · «En el código propio no hay un solo apóstrofo tipográfico» es falso desde esta misma tanda.**
`status.md` (D24) y el changelog 0.17.4 lo dan como la razón medida del apóstrofo recto: *«los 17
archivos que lo tienen son del `.venv`»*. Re-medido:

```
$ grep -rln $'\u2019' front/Andres_Bakery/src backend \
      --include=*.ts --include=*.tsx --include=*.py --include=*.html | wc -l
19
$ ... | grep -v "\.venv"
front/Andres_Bakery/src/lib/marca.test.ts
backend/tests/test_marca.py
```

**19 archivos, no 17.** El 17 del `.venv` es correcto; lo que no es correcto es la frase que lo
envuelve: **dos archivos del código propio tienen U+2019, y son los dos que esta tanda creó** (la
constante `TIPOGRAFICO`, que es la aguja del pajar). Es un uso legítimo —hay que escribir el carácter
para poder buscarlo—, pero los **dos barridos se excluyen a sí mismos** (`ESTE_ARCHIVO` en el front,
`tests` en `CARPETAS_IGNORADAS` en el back), así que el invariante que el registro declara («cero
U+2019 en código propio») **ya no es cierto y nada lo nota**. La decisión del apóstrofo recto no se
toca: las otras tres razones (ASCII, la consola, el teclado de Andrea) se sostienen solas.
**Qué pedir:** *«fuera de las dos constantes `TIPOGRAFICO` de los tests, que existen para buscarlo, no
hay un solo U+2019 en el código propio; los otros 17 archivos que lo tienen son del `.venv`»*.
**Reproducción:** los dos `grep` de arriba.

**M2 · «20 archivos del front usan la clase `uppercase`» no se reproduce con ninguna convención.**
Es la segunda de las dos razones medidas de la caja normal, en `status.md`, en el changelog y en el
comentario de `marca.ts`. Conté de cuatro maneras:

```
$ grep -rl "uppercase" --include=*.ts --include=*.tsx src/ | wc -l            28
$ ...                                    sin los dos lib/marca.*             26
$ grep -rlE 'class(Name)?="[^"]*\buppercase\b' --include=*.tsx src/ | wc -l   23
$ git grep -l "uppercase" 6f549a4 -- front/Andres_Bakery/src | wc -l          26   <-- en la BASE
```

**En la base de la tanda eran 26, no 20.** (Los dos `lib/marca.*` de hoy sólo la mencionan en un
comentario.) **El argumento sale fortalecido, no debilitado** —la casa separa grafía de estilo en 26
archivos, no en 20— pero el número está mal y es uno de los dos que el registro presenta como
«medidos y no elegidos a ojo».
**Qué pedir:** poner **26** (o 23 si se quiere contar sólo la clase dentro de un `className`) y decir
con qué `grep`, porque las convenciones dan distinto.
**Reproducción:** los cuatro `grep` de arriba.

**M3 · «Hay ~10 filas `PageView` nuevas» es falso en especie: no se agrega ninguna fila, se incrementa
un contador.**
El handback §5.4 lo declara como lo que escribió en la base de desarrollo. Copié la base antes de
levantar nada, navegué, y comparé fila por fila:

```
$ sha256sum instance/bakery.db   (antes)   091ef8ba…36ef6f
  page_view: 33 | product: 5 | order: 7 | site_content: 2     (antes y después: los mismos)
$ filas ahora: 33 | filas en la copia: 33 | filas que CAMBIARON: 2
  antes: (32, '2026-10-26', '/producto', 'mouse', 9)   ahora: (32, …, 15)
  antes: (33, '2026-10-26', '/carrito',  'mouse', 1)   ahora: (33, …,  2)
```

`page_view` tiene clave `(day, path, device)` y una columna `views`: **la tabla no crece, crece el
contador del día**. El review de D29/D30 lo había dicho bien («inserta **o incrementa**»); el handback
de esta tanda lo volvió a escribir como filas nuevas, y «~66 filas de visitas» del review anterior
también sobra por el mismo motivo. Es la clase de frase que R30 existe para no dejar pasar, y ya van
dos tandas.
**Qué pedir:** *«ninguna fila nueva: se incrementa la columna `views` de la fila del día para cada
`path`»*. **Reproducción:** `pragma table_info(page_view)` y el diff de filas de arriba.
**Yo también escribí**, y lo declaro: dos contadores, `/producto` 9→15 y `/carrito` 1→2. **Restauré la
base desde la copia y verifiqué el `sha256`:** `091ef8ba…36ef6f` en los dos lados, y la fila 32 volvió
a 9.

### BAJA

**B1 · `status.md` §1 pega el tamaño nuevo al hash viejo del bundle.** La fila «Build del front» dice
`index-DFNjbxcP.js` **428,17 kB**. El tamaño es correcto; el hash es el de T24. El build de hoy da
**`index-DFE5XA2U.js`**, que es lo que el handback escribió bien y la fila no copió. Es el mismo
renglón que el review anterior corrigió por el tamaño (su B1): se arregló el número y quedó el hash.

**B2 · El párrafo de R05 del handback nombra un archivo que no está en el diff.** Dice *«El más grande
que toqué es `carrito.ts` con 260»*; `carrito.ts` **no aparece** en `git diff --name-status
6f549a4 5fd3816`. **R05 se cumple igual, y lo medí sobre el diff de verdad:**

```
$ wc -l <los 17 archivos del diff>
 231 CartContext.tsx   <-- el más grande de la tanda
 202 payment_service.py   193 avisos.ts   162 AvisosContext.tsx   147 test_marca.py
 146 bootstrap_service.py 118 notifications.py 114 config.py  109 SiteHeader.tsx
  98 avisos.asunto.test.ts  98 marca.test.ts  76 .env.example  64 SiteFooter.tsx
  55 README.md  30 marca.py  29 index.html  27 marca.ts
```

**Ninguno pasa de 300.** El tope de R05 no está ni cerca; la frase sí está mal.

**B3 · `statement_descriptor` tiene 9 caracteres, no 13.** La tabla de §2.5 del handback dice
*«`ANDBAKERY`: lo que sale en el resumen de la tarjeta: 13 caracteres y sin apóstrofo»*. Son **9**
(`A-N-D-B-A-K-E-R-Y`). La conclusión —que ahí no viaja el apóstrofo— es correcta.

**B4 · De los dos asuntos de mail, sólo uno es *encoded-word*; el otro viaja con el `'` crudo.** Ver
§5.1: no hay daño, pero la razón que da el handback cubre un asunto de los dos.

**B5 · Lo que `elementFromPoint` no puede ver, y la hoja no distingue: el cartel de abajo TAPA
«Ver carrito» entero aunque le robe el 4,68 %.** Medido a 375 px con **un** cartel (y vale igual con
dos, es el mismo slot de abajo):

```
verCarrito: {x:203, y:598, w:132, h:44}      cartel: {x:16, y:587, w:328, h:64}
areaTapadaPct: 100        fondoDelCartel: "rgb(221, 240, 220)"   (opaco)
pointerEventsDelCartel: "none"
quienSePintaEncimaDelCentroDeVerCarrito: "Ver carrito"   <-- el clic SÍ llega
```

O sea: el botón **se puede apretar** (lo verifiqué con un clic real, §5.4) pero **no se ve** mientras
el cartel está en pantalla. Todo el registro de geometría de este repo —el 4,41 %, el 4,68 %, el «cae
a 0 %» del review anterior— está hecho con `elementFromPoint`, que mide *si el clic llega*, no *si se
ve a dónde apuntar*. **No lo trae esta tanda** (un solo cartel ya lo hace, y viene de F64/T23), y por
eso es BAJA, pero conviene que la casa sepa que su método no contesta esa pregunta antes de volver a
leer un «0 %» como «el botón está bien».

## 5 · Las preguntas que nadie se había hecho

### 5.1 · ¿El apóstrofo viaja por algún lado donde moleste?

Busqué **todos** los lugares por los que sale la marca del back y los medí uno por uno.

```
$ grep -rn "MARCA" backend --include=*.py  (sin .venv, sin tests)
config.py:7                     from .marca import PUNTO_DE_RETIRO_POR_DEFECTO
marca.py:25,30                  MARCA / PUNTO_DE_RETIRO_POR_DEFECTO
services/bootstrap_service.py:74  la semilla del texto institucional
services/notifications.py:52      el cuerpo del mail al cliente
services/notifications.py:78,88   los DOS asuntos de mail
services/payment_service.py:54    "description": f"Logística local de {MARCA}"
```

**Asunto de mail (RFC 2047) — medido con el `Message` real de `flask_mail`:**

```
Subject: =?utf-8?q?Andre=27s_Bakery_=7C_Confirmaci=C3=B3n_de_pedido_=237?=
  apostrofo CRUDO en el header Subject?: False
  Subject decodificado: "Andre's Bakery | Confirmación de pedido #7"
  round-trip identico: True

Subject: Andre's Bakery | Nuevo pedido #7            <-- el de Andrea, SIN acento
  decodificado: "Andre's Bakery | Nuevo pedido #7"
```

El del cliente lleva acento, así que va en *encoded-word* Q y el `'` sale como `=27`: **round-trip
idéntico**. El de Andrea es **ASCII puro**, así que **no** es encoded-word y el apóstrofo viaja crudo
— perfectamente legal en un campo *unstructured* de RFC 5322, y sin consecuencia. **El razonamiento
del handback («ya iban en encoded-word») vale para uno de los dos** (B4). **Veredicto: no hay riesgo.**

**Mercado Pago.** El `statement_descriptor` es un literal fijo `"ANDBAKERY"` y **no lleva la marca**
(es el campo con límite duro, 22 caracteres en MP). La marca viaja sólo en
`"description": "Logística local de Andre's Bakery"` (33 caracteres, contra un tope de 256), dentro
de `json.dumps(payload).encode("utf-8")` (`payment_service.py:76`): en JSON el `'` **no se escapa ni
necesita escaparse**. **Veredicto: no hay riesgo.**

**`<title>` → slug de URL.** No existe ese camino: los únicos `slugify` del repo trabajan sobre
`product.name` (`services/slug.py` y la migración `0002`), nunca sobre la marca. El `<title>` es
estático (`grep -rn "document.title" src/` → **vacío**), no hay `og:`, `twitter:` ni `canonical` en el
`index.html`, y el `wa.me` ya estaba verificado: `mensaje_whatsapp.py` saluda `"¡Hola Andrea! …"` y
**no nombra la marca**. **El apóstrofo no entra en ninguna URL. El negativo del handback se sostiene.**

### 5.2 · D36 y el dedup: el caso del MISMO renglón dos veces

El handback midió el caso de dos rellenos; **el otro no**. Lo medí en el navegador, a 375 px, con los
dos clics disparados dentro de la página para que entren en los 4 s:

```
tras 1 Agregar                          avisos: 1  subtotal $ 99.800
tras 2 Agregar, MISMO renglon, sin cerrar nada
                                        avisos: 1  subtotal $ 119.600
  ["«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito"]
```

**Un cartel, y los dos agregados entraron** (el subtotal sube). Es lo correcto: mismo renglón ⇒ misma
`claveDelRenglon` ⇒ mismo asunto ⇒ el dedup lo reemplaza y el plazo vuelve a empezar. Tiene test
propio (`el mismo renglón dos veces sigue dando UN aviso, con el plazo de nuevo`) y **muere con N11**.
**D36 no rompió el dedup del caso normal.**

### 5.3 · El panel de admin: ¿idéntico o parecido?

```
$ grep -rn "useAvisos|avisos.exito" --include=*.ts* src/ | grep -v test
components/RegionDeAvisos.tsx:34    (el que dibuja)
contexts/CartContext.tsx:136        avisos.exito(…texto, { asunto: clave })
pages/admin/usePanelDeAdmin.ts:56   avisos.exito(mensaje)          <-- sin extras
```

**Hay exactamente dos productores y el del panel no pasa asunto.** Y el camino sin asunto es idéntico
**por construcción, no por parecido**: `avisar` hace `nuevoAviso({ tono, texto, ...extras })` con
`extras === undefined`, y `{...undefined}` es `{}`; `nuevoAviso` agrega la clave con
`...(datos.asunto ? { asunto } : {})`, así que **no queda ni un `asunto: undefined` en el objeto** —
el `Aviso` del panel tiene las mismas claves que antes de la tanda; y `asuntoDelAviso(a) === a.texto`
cuando no hay asunto, con lo que el filtro del dedup se reduce **literalmente** a
`previo.tono === aviso.tono && previo.texto === aviso.texto`, que es la línea de `6f549a4`.
Lo sostienen dos tests (`sin asunto el dedup sigue mirando el texto: el panel no cambia` y `sin
asunto, dos textos distintos se apilan como siempre`) y **los dos mueren con N11**. **Verificado: el
panel no cambia.** (El panel en sí no lo pude abrir: pide login y las credenciales están en
`backend/.env` — ver §7.)

### 5.4 · R07 · el navegador, a ancho de celular

MCP de Playwright, Chromium real, back en `127.0.0.1:5000` y vite en `5173`, `HashRouter`.
**Cero errores y cero warnings de consola** en todo el pase.
Foto: `C:\Users\Facundo\Estudio_Trabajo\Cerebro\.playwright-mcp\review-D24-D36-dos-carteles-375px.png`
(carpeta gitignoreada).

**D24 a 375 px y a 1280 px:**

| Qué | 375 px | 1280 px |
|---|---|---|
| `document.title` | `Andre's Bakery \| Dulces artesanales & recetas` | ídem |
| `<meta description>` | `Andre's Bakery: ecommerce de dulces artesanales…` | ídem |
| `alt` del logo | `Andre's Bakery` | ídem |
| nombre del header | existe pero **no se dibuja** (`hidden sm:block`) | **131×23 en (119, 16)**, visible |
| nombre del footer | **328×32**, visible | **379×32 en (32, 1569)**, visible |
| `Andres Bakery` en el `innerText` | **0** | **0** |
| U+2019 en el `innerText` | **0** | **0** |
| `scrollWidth - clientWidth` | **0** | **0** |

**Los dos números del handback a 1280 (131×23 y 379×32) se reproducen exactos.** Y como N3/N4
sobreviven, **esta medición es la única evidencia que hay de que el header y el footer dibujan la
marca**: el handback lo dice y tiene razón en decirlo así.

**Lo que el handback dejaba abierto y hoy está cerrado (B9 + D39):**

```
$ curl -s http://127.0.0.1:5000/api/site/delivery
  "pickup_address": "Andre's Bakery, Villa Maipú, General San Martín"
en /#/carrito:  «Si retirás por Andre's Bakery, Villa Maipú, General San Martín no pagás envío.»
  diceLaGrafiaVieja: false
```

Y sin abrir el `.env`, por el lado del código:

```
$ python -c "from backend.config import Config; from backend.marca import PUNTO_DE_RETIRO_POR_DEFECTO; …"
PICKUP_ADDRESS en os.environ?: False
Config.PICKUP_ADDRESS       = "Andre's Bakery, Villa Maip?, General San Mart?n"
PUNTO_DE_RETIRO_POR_DEFECTO = "Andre's Bakery, Villa Maip?, General San Mart?n"
COINCIDEN: True
```

**`Config.PICKUP_ADDRESS` es exactamente `PUNTO_DE_RETIRO_POR_DEFECTO`.** El riesgo 1 del handback
(«el sitio todavía muestra la grafía vieja en un lugar») **ya no existe**. De paso, esa misma salida
es la cuarta vez que este repo ve la razón 2 del apóstrofo funcionando: **los acentos se perdieron en
la consola y el apóstrofo no.**

**D36 en el navegador, a 375 px, carrito arrancando vacío:**

```
7. AVISOS EN PANTALLA: 2 ->
  [{"id":"aviso-1","texto":"«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito",
    "x":16,"y":515,"w":328,"h":64},
   {"id":"aviso-3","texto":"«Cheesecake de Frutos Rojos» (12 porciones) se agregó al carrito",
    "x":16,"y":587,"w":328,"h":64}]
10. subtotal: ["Subtotal\n$ 40.400"]
```

**Dos carteles a la vez, con el mismo texto, los dos de 64 px, subtotal $40.400.** El número exacto
del handback y del review anterior, ahora a **375** y no a 390. **El texto no creció un carácter.**

**La geometría, punto por punto, a 375 px, drawer CERRADO** (`elementFromPoint` sobre cada píxel
entero, `ceil(borde)` y centro `+0.5`, sobre **todo** lo tocable de la pantalla):

| Estado | «Ver carrito» (132×44 = 5.808) | «Ayuda» (4.268) | Única víctima | Ladrón |
|---|---|---|---|---|
| **1 cartel** | **272 · 4,68 %** | 0 · 0,00 % | «Ver carrito» | `la X de aviso-5`: 272 |
| **2 carteles** | **272 · 4,68 %** | 0 · 0,00 % | «Ver carrito» | `la X de aviso-3`: 272 |

**Idéntico con uno y con dos: el segundo cartel no roba ni un punto.** Y el **cuerpo** de los dos
carteles roba **0**: `pointerEvents: "none"` medido en los dos (`pointer-events-none` de ADR-037,
intacto). El 4,68 % del handback **se reproduce a 375 px**, y la diferencia con el 4,41 % de D32 es la
convención de muestreo que el propio handback sospechó: la X de 16×16 cae en 17 columnas con
`ceil`+`0.5` (272 = 17×16) y en 16 con la otra (256). **Las dos miden la misma geometría.**

**Teclado y alcance, con Tab de verdad:**

```
(foco en la X de aviso-1)  → page.keyboard.press('Tab') →
  avisosEnPantalla: 2   focoEn: "Cerrar el aviso ««Cheesecake de Frutos Rojos» (12 porciones)…"
  avisoDelFoco: "aviso-3"   anilloDeFoco: "auto 1px"
  tabbable: aviso-1 true · aviso-3 true
```

**Se llega a los dos avisos con Tab**, el anillo de foco se ve, y pasar de un cartel al otro **no
suelta la retención** (los dos siguen en pantalla), que es el `relatedTarget` de D30 funcionando.

**Y clickeable de verdad, con dos carteles encima:**

```
await page.mouse.click(240, 620)       <-- punto de «Ver carrito» fuera del 4,68 %
  urlAntes == urlDespues (HashRouter)
  drawerAbierto: true   hayVerCarrito: false   avisos: 2
```

**El clic real abrió el drawer con los dos carteles en pantalla.** No hay superposición que impida
nada: lo único que tapa es *visual* (B5).

### 5.5 · Las tres fuentes de verdad, y si el barrido caza la desincronización

`src/lib/marca.ts`, `backend/marca.py` y el `<title>`/`<meta>` del `index.html` dicen **exactamente lo
mismo**, verificado a mano y en el navegador. Y el barrido **sí** cae si una se desincroniza — lo
probé con una **tercera** grafía, para que no pudiera confundirse con «la vieja»:

| Desincronizo | Resultado | Test que cae |
|---|---|---|
| `marca.ts` (N8) | **MUERE** | `` `MARCA` es la grafía decidida… `` |
| `index.html` (N9) | **MUERE** | `el <title> y la descripción de la pestaña dicen la marca` |
| `marca.py` (N10) | **MUERE** | `test_la_constante_es_la_grafia_decidida` |

**No es un verde vacío: el contrato de las dos constantes escritas a mano en los dos tests funciona.**
La única grieta está en A2 (si el glob de `.tsx` se rompe, lo que deja de cuidarse son los dos
archivos de React, no estas tres fuentes: el `index.html` viene del glob de HTML, que **sí** está
guardado).

## 6 · Lo que se sostiene, dicho con la salida que lo prueba

- **D24 anda y está completa**: las 13 grafías cambiadas, verificadas en el navegador a dos anchos,
  cero apariciones de la vieja en el `innerText`, y el punto de retiro ya corregido por B9+D39 (§5.4).
- **D36 anda**: dos renglones ⇒ **dos carteles**, mismo texto, 64 px cada uno, subtotal **$40.400**;
  y el mismo renglón dos veces sigue dando **uno** (§5.2).
- **El texto no creció**: el candado (`el arreglo NO alarga el cartel`) existe y la geometría lo
  confirma — **4,68 % con uno y con dos carteles, 0 % a «Ayuda», cuerpo del cartel 0**.
- **El panel no cambia**, y no por parecido sino por construcción (§5.3).
- **El rojo es el declarado**, los dos lados, con los seis culpables del back en el mismo orden.
- **La tabla de 15 mutantes es honesta** en los cinco que repetí, con los nombres literales.
- **El bundle: +0,07 kB, exacto**, y los 1,42 kB son del `vite 7.3.7`, no de la tanda (§1.1).
- **El `statement_descriptor` no lleva la marca**, el JSON de MP no tiene problema con el `'`, el
  `<title>` no alimenta ningún slug y `wa.me` no nombra la marca (§5.1).
- **R05 se cumple** sobre el diff real: máximo **231** líneas (§B2).
- **Los cuatro comandos del harness, verdes**, exit medido sin tubería, mismo hash de CSS.
- **Cero errores y cero warnings de consola** en todo el pase de navegador.

## 7 · Lo que NO pude verificar, y por qué

1. **El panel de admin en el navegador.** Pide login y las credenciales viven en `backend/.env`, que
   la consigna me prohíbe abrir. Lo reemplacé por §5.3, que es el mismo argumento por el código y por
   los tests, no por la pantalla.
2. **Los mutantes M5–M7 y M10–M15 del handback, uno por uno.** Los cubre el rojo de §2, que es la
   misma afirmación medida al revés, pero no son re-ejecuciones literales de esas quince filas.
3. **El `sha256` del diff del árbol en el momento exacto de la tanda** (`fc5cc2c7…e77a75`): es
   irrecuperable después del commit. Lo reemplacé por restaurar **cada** archivo desde su copia byte a
   byte verificando hash, y por `git status --short` vacío al terminar.
4. **Un teléfono de verdad y un dedo de verdad.** Todo es Chromium a anchos CSS con
   `elementFromPoint`: comparable con T23, T24, D35 y D29/D30, pero no es lo mismo — y B5 muestra
   justo dónde ese método se queda corto.
5. **Anchos distintos de 375 y 1280.** El handback argumenta por qué no hay alto nuevo que barrer en
   seis anchos (el texto no cambió y la pila de dos ya era alcanzable desde D29) y **ese argumento se
   sostiene**; pero conviene recordar el hallazgo A2 del review anterior: a **320 px** el cartel con
   variante mide **84** y no 64, así que cualquier número de geometría de esta tanda vale **de 360 a
   430**, no «a cualquier ancho».

## 8 · Servidores, base y limpieza

```
$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/products   000
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/               000
$ netstat -ano | grep LISTENING | grep -E ":5000|:5173"   (ningun LISTENING en 5000/5173)
  PID 38196 -> python.exe   matado
  PID 49956 -> node.exe     hijo 31512 -> esbuild.exe, los dos matados
```

- **Los dos servidores, apagados y verificado.** El hijo de `npm run dev` sobrevive al padre: hay que
  bajarlo por PID, como ya avisó el review anterior.
- **Base de desarrollo: copia antes, restaurada después.** `sha256` de `instance/bakery.db`
  **`091ef8ba…36ef6f`** antes y después; la única escritura fue el contador de visitas (ver M3), y la
  base quedó byte a byte como estaba.
- **`backend/.env` no se abrió.** De él sólo se sabe, por `os.environ`, que **`PICKUP_ADDRESS` ya no
  está puesta**. Ninguna credencial en este informe.
- **Nada versionado tocado** salvo este archivo. Lo temporal (scripts de mutación, salidas, la copia de
  la base) vivió en el scratchpad de la sesión; la foto está en `.playwright-mcp/`, gitignoreada. **No
  creé ninguna carpeta en `C:\Users\Facundo\Estudio_Trabajo\`.**
- **Suite final, después de las doce mutaciones y de los tres builds:** front
  `Test Files 22 passed (22) · Tests 267 passed (267)` **EXIT=0**; back `Ran 376 tests … OK`
  **EXIT=0**; `git status --short` **vacío**; build de vuelta en `index-DFE5XA2U.js` 428.17 kB.

## 9 · Qué haría falta para pasar a APPROVED

De producción, **nada**. Una línea de test y cinco correcciones de registro:

1. **La fila D37 y el changelog**: que digan qué clase cierra el barrido —*la grafía vieja escrita a
   mano*— y que **N3, N4 y N5 pasan en verde** (borrar la marca del header o del footer, o escribirla
   con otra grafía), y que **no toca** el mutante del `CartContext`. **(A1)**
2. **El guard de `marca.test.ts`**: que nombre un `.tsx` concreto, como el del back nombra `config.py`,
   y que se lo rompa una vez y se pegue la salida, que es lo que pide R29 para un check nuevo. **(A2)**
3. **Las dos razones «medidas» de D24**: **19** archivos con U+2019 (17 del `.venv` **y los 2 tests de
   esta tanda**), y **26** archivos con `uppercase` en la base, no 20. **(M1, M2)**
4. **La frase de la base de datos**: `PageView` **no agrega filas**, incrementa un contador por día y
   `path`. **(M3)**
5. **`status.md` §1, fila «Build del front»**: el hash es `index-DFE5XA2U.js`, no `DFNjbxcP`. **(B1)**
6. **Tres precisiones chicas**: `carrito.ts` no está en el diff (el más grande es `CartContext.tsx`,
   231), `ANDBAKERY` tiene 9 caracteres, y de los dos asuntos de mail sólo uno es *encoded-word*.
   **(B2, B3, B4)** Y, si se quiere, una línea sobre B5 donde vive el método de geometría.

Con eso, el registro dice lo que las mediciones dicen, que es todo lo que R30 pide. **El código de D24
y de D36 lo apruebo sin reservas: se re-ejecutó entero —las dos suites, el rojo de los dos lados, los
tres builds, doce mutantes y un pase de navegador a 375 y a 1280— y aguantó.**
