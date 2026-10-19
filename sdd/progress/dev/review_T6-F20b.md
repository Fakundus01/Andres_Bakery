# Review · T6-F20b · La unicidad del ingrediente vive en el back

**Rol:** `reviewer` + `security-reviewer` (R27, R30) · **Fecha:** 2026-10-19 · **Rama:** `dev`
**Tarjeta:** [`sdd/cards/T6-F20b-la-unicidad-vive-en-el-back.md`](../../cards/T6-F20b-la-unicidad-vive-en-el-back.md)
**Handback revisado:** [`handback_T6-F20b.md`](handback_T6-F20b.md) · **ADR:** 030
**No implementé esta tarjeta.** No toqué código ni tests.

## Veredicto

**`CHANGES_REQUESTED`** — 9 hallazgos (1 alta, 2 media, 3 baja, 3 informativos).

La tarjeta hace lo que dice en el camino secuencial: el 200/201 funciona, los topes aguantan,
la ñ no se conflactúa, el borrado no deja filas colgadas, y los cuatro comandos dan verde con
los números que promete el handback. Pero **el título de la tarjeta no se cumple bajo
concurrencia**: dos `POST` simultáneos con el mismo nombre normalizado entran los dos (hallazgo
1), y en la variante de grafía idéntica el back contesta **500 con HTML** — exactamente la clase
de bug que `saneado.py` existe para matar. Es el criterio central de la tarjeta, no un borde.

---

## Lo que re-ejecuté (salida literal)

### Back — `backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q`

```
----------------------------------------------------------------------
Ran 224 tests in 44.964s

OK
```

(224 OK, coincide con el handback. La corrida escupe `ResourceWarning: unclosed database` de
SQLAlchemy, ruido preexistente, no falla nada.)

### Front — `npm --prefix front/Andres_Bakery run test`

```
> andres-bakery@0.0.0 test
> vitest run

 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery

 Test Files  11 passed (11)
      Tests  90 passed (90)
   Start at  01:38:32
   Duration  318ms (import 40%, transform 31%, tests 16%, worker 13%, environment 1%)
```

### Front — `npm --prefix front/Andres_Bakery run lint`

```
> andres-bakery@0.0.0 lint
> npm run lint:eslint && npm run typecheck

> andres-bakery@0.0.0 lint:eslint
> eslint .

> andres-bakery@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
```

(sin salida = limpio)

### Front — `npm --prefix front/Andres_Bakery run build`

```
> andres-bakery@0.0.0 build
> tsc -b && vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 1831 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.19 kB │ gzip:   0.60 kB
dist/assets/index-Bx_nIdSR.css   34.06 kB │ gzip:   6.96 kB
dist/assets/index-DuYngeGo.js   381.91 kB │ gzip: 115.72 kB
✓ built in 2.55s
```

**Los cuatro números del handback son ciertos:** 224 / 90 / lint limpio / 381,91 KB.

---

## Hallazgos

### 1 · La carrera entra: dos `POST` simultáneos crean las dos filas, y una variante da 500 con HTML — **ALTA**

`backend/services/ingredient_service.py:46-56` (`create`) y `backend/routes/utils.py:78-93`
(`json_endpoint`).

`create` hace *check-then-insert* sin transacción ni constraint que respalde la decisión:

```python
existente = self._buscar_por_nombre(name)      # linea 46
if existente:
    return {...}, False
ingredient = Ingredient(name=name, unit=unit or None)
db.session.add(ingredient)
db.session.commit()                            # linea 54
```

Entre la línea 46 y la 54 hay una ventana. La base tiene `unique=True` sobre `Ingredient.name`
pero eso es **unicidad exacta**, no normalizada: es justo la restricción que la tarjeta dice que
no alcanza. No hay índice ni columna del nombre normalizado.

**Reproducción A — 8 hilos, 8 grafías del mismo nombre, una barrera para soltarlos juntos**
(base SQLite temporal, `IngredientService` real):

```
4. CARRERA: dos (y ocho) POST con el mismo nombre normalizado
  filas creadas: 3  -> ['COCO rallado', 'Coco rallado', 'Coco Rallado']
  errores: ["Coco rallado: IntegrityError: (sqlite3.IntegrityError) UNIQUE constraint
            failed: ingredient.name ...]
```

**3 filas** donde la tarjeta promete 1, más una excepción que no es `ServiceError`.

**Reproducción B — la ventana forzada, por HTTP, con `test_client` y `DEBUG=False`** (parcheo
`_buscar_por_nombre` para que devuelva `None`, que es exactamente lo que ve el segundo request
cuando el primero todavía no commiteó):

```
--- POST normal ---
201 {'id': 1, 'name': 'Coco rallado'}
--- POST repetido (otra grafia) ---
200 {'id': 1, 'name': 'Coco rallado'}
--- Carrera simulada: el chequeo no ve la fila que ya esta ---
  (grafia distinta) -> 201 {"id":2,"name":"coco rallado"}
status: 500
content-type: text/html; charset=utf-8
body[:300]: <!doctype html> <html lang=en> <title>500 Internal Server Error</title> ...
--- GET publico sin token ---
200 [{'id': 1, 'name': 'Coco rallado', 'unit': None},
     {'id': 2, 'name': 'coco rallado', 'unit': None}]
```

Dos salidas, las dos malas:

- **grafía distinta** ⇒ `201` y la lista queda con `Coco rallado` **y** `coco rallado`. Es
  literalmente el renglón que la tarjeta pega en "Por qué, con el caso medido", intacto.
- **grafía idéntica** ⇒ el `IntegrityError` sube por `json_endpoint`, que solo atrapa
  `ServiceError` (`routes/utils.py:90`), y Flask contesta **500 `text/html`**. El front tiene un
  branch en `leerElError` justo para esto (`api.ts`: "No era JSON: una página de error del
  servidor") — o sea, el proyecto ya sabe que este 500 es feo, y `saneado.py` arranca su
  docstring con "la ruta pública de pedido contestaba **500 con HTML**".

**Alcance honesto:** hace falta credencial de admin y dos requests casi simultáneos. El panel de
Andrea sola difícilmente lo dispare; dos pestañas, un doble clic rápido con la red lenta, o el
flujo de sugeridos de la IA con dos grafías del mismo ingrediente, sí. Lo que lo hace ALTA no es
la probabilidad sino que **es el criterio que nombra la tarjeta**: "la unicidad vive en el back",
y hoy vive en un chequeo que la base no respalda.

**Qué pediría:** (a) índice único sobre el nombre normalizado (columna generada o columna
mantenida) o (b) `try/except IntegrityError` alrededor del `commit` con `rollback` + relectura y
devolución de la fila ganadora (el mismo "conseguir o crear" que ya decidió ADR-030, pero
cerrado). Mínimo imprescindible: que el `IntegrityError` no sea un 500 con HTML. `update` tiene
la misma ventana (`ingredient_service.py:62-69`).

---

### 2 · `normalizar_nombre` y `normalizar` **no** espejan: 11 casos de 56 divergen — **MEDIA**

`backend/services/saneado.py:127-146` vs `front/Andres_Bakery/src/lib/ingredientes.ts:20-34`.

Las dos docstrings dicen "Espeja a <la otra>" y ADR-030 remata: *"la comparación tiene que valer
igual de los dos lados"*. Corrí las dos implementaciones reales (la del front transpilada con el
`esbuild` del proyecto, sin reescribirla) sobre 56 entradas:

```
DIVERGENCIAS
- salto de linea      input 'Coco\nrallado'    back 'coco · rallado'  front 'coco rallado'
- CRLF                input 'Coco\r\nrallado'  back 'coco · rallado'  front 'coco rallado'
- vertical tab        input 'Coco\x0brallado'  back 'cocorallado'     front 'coco rallado'
- form feed           input 'Coco\x0crallado'  back 'cocorallado'     front 'coco rallado'
- NEL U+0085          input 'Coco\x85rallado'  back 'cocorallado'     front 'coco\x85rallado'
- sep. U+001F         input 'Coco\x1frallado'  back 'cocorallado'     front 'coco\x1frallado'
- arabe con harakat   input 'مُح'              back 'مح'              front 'مُح'
- hebreo con niqqud   input 'שָׁ'               back 'ש'               front 'שָׁ'
- combinante U+1DC0   input 'a᷀b'              back 'ab'              front 'a᷀b'
- combinante U+20D0   input 'a⃐b'              back 'ab'              front 'a⃐b'
- devanagari nukta    input 'क़'               back 'क'               front 'क़'

total divergencias: 11 / 56
```

Lo que **sí** coincide (y conviene dejar escrito, porque es lo que preguntaba la tarjeta): ñ
compuesta y descompuesta, ñ mayúscula de las dos formas, `Piña` ≠ `Pina`, mayúsculas con acento,
NBSP, U+202F, U+3000, ZWSP, guión suave, BOM, ZWJ, turco `İ`/`ı` (los dos llegan a `istanbul` /
`ıstanbul` igual de los dos lados), griego con y sin tonos, sigma final, eszett, emojis (incluido
el ZWJ de familia), tab, U+2028, espacios de más, cirílico breve compuesto/descompuesto,
fullwidth, ligadura `ﬃ`, número romano, vacío, solo espacios, solo invisibles, y los strings de
119 caracteres.

**Dos causas distintas:**

- **El back barre más acentos.** Python usa `unicodedata.combining(c)` (todas las marcas
  combinantes); el front usa `/[\u0300-\u036F]/g` (solo el bloque latino). Árabe, hebreo,
  devanagari, U+1DC0+, U+20D0+ quedan afuera del front. Esta dirección es **benigna**: el back
  fusiona más, así que como mucho devuelve un 200 con la fila existente donde el front esperaba
  un alta. No crea duplicados.
- **El front barre más espacio en blanco.** El back pasa por `saneado.texto`, que convierte
  `\n` en `" · "` (`saneado.py:97`) y **borra** las categorías `Cc` (`\v`, `\f`, `\x85`, `\x1f`)
  en vez de reemplazarlas por espacio; el front los colapsa todos a `" "` con `\s+`. Esta
  dirección **sí** puede dejar dos filas que el panel considera la misma: con `Coco rallado` y
  `Coco\nrallado` en la base, `buscarIngrediente` siempre devuelve la primera y la segunda queda
  inalcanzable desde la pantalla.

**Severidad MEDIA y no alta** porque el camino del panel no puede mandar un `\n`:
`limpiarNombre` ya lo colapsa antes del `POST`. Hace falta la API directa. Pero la afirmación
"espejan" es falsa y está escrita en tres lugares (las dos docstrings y ADR-030), que es
justamente lo que hace que el próximo que toque una de las dos no mire la otra.

**Qué pediría:** o se alinean (que el front use `\p{M}` con flag `u`, y que el back no meta
`" · "` en la forma de comparación — `normalizar_nombre` no debería pasar por el `una_linea` de
`texto`), o se baja el tono de la ADR y de las docstrings a "coinciden en el alfabeto latino, que
es el único que usa la carta", con el caso del `\n` nombrado.

---

### 3 · El tope de 120 no recorta en silencio... salvo cuando sí — **MEDIA**

`backend/services/ingredient_service.py:98-107` (`_nombre`).

ADR-030, punto 3: *"Topes de largo con 400 explicado, **no recorte silencioso**... cortarlo en
120 sin avisar sería renombrarle el ingrediente a sus espaldas"*, y el comentario de `_nombre`
repite la idea. El orden de operaciones lo contradice:

```python
limpio = saneado.sin_invisibles(saneado.texto(valor, "nombre", tope=TOPE_NOMBRE + 1)).strip()
```

`saneado.texto` **recorta primero** a 121 caracteres (`saneado.py:77`), y recién después se
sacan los invisibles y se mide. Si entre los primeros 121 caracteres hay invisibles, lo que queda
baja de 120 y pasa.

**Reproducción** (`IngredientService` real, base temporal):

```
  name 5000 con ZWSP cada 2        -> creado=True len(name)=61 bytes=61
```

Un `name` de **5.000 caracteres** (`"a\u200b" * 2500`) se guarda como **61 caracteres**, con
`201`, sin aviso. No es un problema de tamaño (la fila sigue acotada) sino exactamente el
"renombrar a sus espaldas" que la ADR dice evitar.

**Qué pediría:** medir el largo sobre el valor crudo antes de recortar, o pedirle a `saneado` un
modo sin recorte para este caso.

---

### 4 · `contracts.md` quedó describiendo la versión anterior — **BAJA**

`sdd/contracts.md:24-25`.

```
| POST | `/api/ingredients` | admin | `{id}` — el panel crea el ingrediente que falta ... |
| PUT·DELETE | `/api/ingredients/<id>` | admin | existen; el panel todavía no los usa
                                                 (se renombra y se borra por API) |
```

Los dos renglones son de T6-F20 y esta tarjeta no los tocó (`git diff sdd/contracts.md` solo
muestra el cambio de la tarjeta anterior). Hoy:

- el `POST` devuelve `{id, name}` y **200 o 201** según ADR-030 — el contrato dice `{id}` y no
  menciona el 200, o sea que contradice a la ADR que la misma tarjeta escribió;
- el panel **sí** usa `PUT` y `DELETE`: `AdministrarIngredientes.tsx` los dispara por
  `useIngredientesDelPanel.ts:77-78`.

---

### 5 · R05: `src/lib/api.ts` queda en 370 líneas — **BAJA**

R05 es FIJA: ≤300 líneas, máximo 400. Barrido completo de `backend/` + `front/src`:

```
   370 front/Andres_Bakery/src/lib/api.ts
   292 backend/services/order_service.py
   289 front/Andres_Bakery/src/lib/types.ts
   279 front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts
   274 backend/services/ai_service.py
   273 front/Andres_Bakery/src/pages/admin/ProductsTab.tsx
```

`api.ts` es **el único** archivo por encima de 300, y venía en 341 (`git show HEAD:...`): esta
tarjeta le sumó 29 líneas (`ingredientsApi`). Está bajo el máximo duro de 400, así que no bloquea,
pero el handback no lo menciona y la tarjeta empujó un archivo que ya estaba en falta. Los
archivos nuevos están todos bien: `AdministrarIngredientes.tsx` 142, `SelectorDeIngredientes.tsx`
166, `useIngredientesDelPanel.ts` 80, `altaDeIngrediente.ts` 59, `lib/ingredientes.ts` 82,
`ingredient_service.py` 117, `saneado.py` 164, `test_ingredient_service.py` 114.

**Nota a favor de la tarjeta:** los comentarios de `SelectorDeIngredientes.tsx:11-13` y
`useIngredientesDelPanel.ts:12-14` dicen explícitamente que se dividió *por* R05. El criterio se
aplicó en todos lados menos en `api.ts`.

---

### 6 · Borrar un ingrediente mientras se edita un producto deja un id fantasma en el formulario — **BAJA**

`front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts:157-166` y `:236-240`.

`borrarIngrediente` pasa por `conAviso`, que al terminar llama `recargar()`. `cargar()` refresca
`productos` y `ingredientes` pero **no toca `formProducto`**. Si Andrea está editando un producto
que lleva el ingrediente y lo borra desde "Corregir o borrar", `productForm.ingredient_ids`
conserva el id muerto; al guardar, `product_service._resolve` (`product_service.py:120-121`)
levanta `one or more ingredients do not exist` — en inglés, en el banner de arriba, sin decirle
cuál ni cómo salir salvo recargando y perdiendo lo escrito (que es justo lo que
`useIngredientesDelPanel.ts:48-50` dice querer evitar).

**Qué pediría:** sacar el id borrado de `formProducto.ingredient_ids` en `borrarIngrediente`.

---

### 7 · `_buscar_por_nombre` es O(N) por request; el techo es real pero necesita admin — **INFO**

`backend/services/ingredient_service.py:82-94`.

Medido con filas de 80 caracteres (60 emoji + 20 letras), base SQLite temporal:

```
  N=   100  _buscar_por_nombre=     3.5 ms   GET /api/ingredients =    29.792 bytes
  N=   500  _buscar_por_nombre=    16.3 ms   GET /api/ingredients =   149.392 bytes
  N=  1000  _buscar_por_nombre=    32.9 ms   GET /api/ingredients =   298.893 bytes
  N=  2000  _buscar_por_nombre=    69.4 ms   GET /api/ingredients =   598.893 bytes
  N=  5000  _buscar_por_nombre=   174.8 ms   GET /api/ingredients = 1.498.893 bytes
```

Lineal y limpio, ~35 µs por fila (el `unicodedata.normalize` por fila, con el GIL tomado). Para
"decenas de filas", como dice el comentario, es irrelevante. Para llegar a 5.000 filas hacen
falta 5.000 `POST` con token de admin, y cada uno cuesta más que el anterior (el llenado es
cuadrático). Con admin comprometido podés dejar el `POST` en 175 ms de CPU puro por request y el
`GET` público en 1,5 MB.

**No hay rate limit en ninguna ruta de `/api/ingredients`** (ni `GET` ni `POST`): `limitar` no
aparece en `routes/ingredients.py`. Eso no lo introdujo esta tarjeta.

**Dos matices que corrigen la premisa de la tarjeta y de ADR-030**, que dicen *"el costo lo pagan
los anónimos: cada visitante se descarga esos MB"*: `ingredientsApi.list()` se llama **solo**
desde `usePanelDeAdmin.ts:102`; ninguna pantalla pública pega a `GET /api/ingredients`. El
endpoint es público y cualquiera puede pedirlo, pero *ningún visitante lo descarga solo*. Los
ingredientes que sí ve el público viajan embebidos en `GET /api/products`
(`serializers.py:63-66`). No es un defecto de esta tarjeta; es que la justificación escrita está
un escalón por encima de lo que pasa.

---

### 8 · Topes: lo que probé y aguantó (con un matiz sobre D5) — **INFO**

Probé `POST` y `PUT` con la misma batería. **Ninguna fila grande entró**:

```
2. TOPES: que se puede meter igual
  name 121 'a'                     -> 400: El nombre no puede pasar de 120 caracteres.
  name 120 'a'                     -> creado=True len(name)=120 bytes=120
  name 5000 con ZWSP cada 2        -> creado=True len(name)=61 bytes=61          <-- hallazgo 3
  name 120 emoji 4 bytes           -> creado=True len(name)=120 bytes=480
  name 500000 'a'                  -> 400: El nombre no puede pasar de 120 caracteres.
  name numero gigante (10**400)    -> 400: El nombre no puede pasar de 120 caracteres.
  name float (1.5)                 -> creado=True len(name)=3 bytes=3
  unit 41                          -> 400: La unidad no puede pasar de 40 caracteres.
  unit 40                          -> creado=True len(unit)=40
  unit 5000 emoji                  -> 400: La unidad no puede pasar de 40 caracteres.
  name 300 con newlines            -> 400: El nombre no puede pasar de 120 caracteres.

  PUT con los mismos payloads: idénticos topes (los que no chocan con el tope chocan
  con la unicidad normalizada, que es la respuesta correcta).
```

**El tope es de caracteres, no de bytes.** El peor caso real es 120 emojis de 4 bytes = **480
bytes** por `name` (+160 por `unit`). Bien acotado; lo dejo escrito porque la pregunta era
explícita y el modelo dice `String(120)`, que en Postgres sí sería 120 caracteres igual.

**Matiz sobre D5** ("`name`/`unit` que no son texto ⇒ 400"): un número **se acepta** y se
convierte a texto — `{"name": 1.5}` crea el ingrediente `"1.5"`. Es una decisión deliberada y
documentada de `saneado.texto` (`saneado.py:58-61`: *"un teléfono escrito como número es un error
honesto"*), y `test_create_con_tipos_raros_es_400_y_no_500` solo cubre dict, lista y bool. No lo
cuento como defecto, pero D5 está marcado **OK** en el handback con una redacción más amplia que
lo que el código hace.

---

### 9 · Borrar con productos: **no** quedan filas colgadas (verificado con SQL) — **INFO**

Verificado sobre base temporal, leyendo `product_ingredients` con `sqlite3` crudo (no por el ORM,
y no sobre `instance/bakery.db`):

```
6. BORRAR un ingrediente usado: quedan filas en product_ingredients?
  antes del delete, product_ingredients = [(5, 2), (5, 1)]
  despues del delete (ORM) = [(5, 2)]
  SQL crudo product_ingredients = [(5, 2)]
  SQL crudo ingredient ids = [(2, 'Azucar')]
  foreign_keys pragma = (0,)
```

SQLAlchemy limpia la tabla intermedia al borrar el padre del `secondary`. **Criterio cumplido.**

Lo que sí anoto para después, sin pedir cambio acá: `PRAGMA foreign_keys = 0` (SQLite no las
exige por default y el proyecto no lo prende) y `product_ingredients` no declara `ondelete`
(`models.py:8-17`). Mientras todo el borrado pase por el ORM no hay problema; un `DELETE` a mano,
un script o una migración dejan huérfanos sin que la base chiste.

---

## ¿El handback exagera o miente?

Lo verifiqué renglón por renglón. **No miente en los números y no infla el verde.** Dos cosas:

| Afirmación | Veredicto |
|---|---|
| "back 224 OK · front 90 OK · lint y typecheck limpios · build 381,91 KB" | **Cierto**, re-ejecutado arriba |
| D1 "no crea fila nueva" | **Cierto en el camino secuencial**; falso bajo concurrencia (hallazgo 1) |
| D2 acentos / D3 la ñ no se conflactúa | **Cierto**, verificado con las dos implementaciones reales |
| D4 "500.000 caracteres ⇒ 400 explicado" | **Cierto**, reproducido |
| D5 "tipos raros ⇒ 400 y no 500" | **Cierto para dict/lista/bool**; un número se acepta como texto (hallazgo 8) |
| D6 "el PUT tiene los mismos topes" | **Cierto**, reproducido |
| "Las dos normalizaciones espejan" (ADR-030 y las docstrings) | **Exagerado**: 11/56 divergen (hallazgo 2) |
| "Topes con 400 explicado, no recorte silencioso" (ADR-030 pto. 3) | **Falso en un caso**: 5.000 → 61 caracteres en silencio (hallazgo 3) |
| "La base quedó como estaba: `Azúcar`, `Test`, 5 productos, Brownies con `Test`" | **Cierto**: `instance/bakery.db` tiene hoy `[(1,'Azúcar','100gr'), (2,'Test',None)]`, 5 productos y `product_ingredients = [(5,2)]` |
| "Lección: después de tocar el back hay que reiniciarlo" (handback §"Dos cosas") | **Honesto y correcto**, y vale la pena que quede en `harness.md`, no solo acá |

Nit de redacción: el título dice "**Dos** cosas que aparecieron probando" y abajo hay **tres**
ítems numerados.

**Lo que el handback no menciona y debería:** que `api.ts` quedó en 370 líneas (hallazgo 5), que
`contracts.md` no se actualizó (hallazgo 4), y que la unicidad no tiene constraint que la
respalde (hallazgo 1) — esto último es el único que, para mí, bloquea.

---

## Lo que me gustó, para que no se pierda en la lista de hallazgos

- `test_ingredient_service.py` ataca el comportamiento, no la implementación, y cada test dice
  *por qué* existe. `test_update_deja_corregir_la_grafia_del_mismo` es el caso que casi siempre se
  olvida al agregar unicidad normalizada.
- La decisión de devolver `{id, name}` y que el panel use **ese** nombre resuelve un problema real
  que los tests no habrían encontrado, y está contado en el handback sin adornos.
- `altaDeIngrediente.ts` separado del hook, con API inyectada y 7 tests, incluido "si la relectura
  también falla, el error que se cuenta es el del alta".
- `textoDeBorrado` con singular y plural separados, en el renglón que se lee justo antes de algo
  que no se deshace.
- El guard de "en vuelo" de `FotoDelProducto.tsx` compara el nombre **normalizado**, así que dos
  grafías del mismo sugerido no disparan dos altas. Está bien pensado — y es la única defensa real
  que hay hoy contra el hallazgo 1 desde el panel.

---

## Higiene

No toqué `instance/bakery.db` ni el back que corre: todo lo de arriba salió de bases SQLite
temporales en el scratchpad, borradas al terminar. Verifiqué el estado final de la base real y
está como la dejó el implementador (`Azúcar`, `Test`, 5 productos, `Brownies`→`Test`). No edité
código ni tests.
