# Review · T6-F20 · Ingredientes desde el panel

**Veredicto:** `CHANGES_REQUESTED` · **Hallazgos:** 13 (3 que pido arreglar, 5 menores, 5 informativos/cosméticos)
**Rol:** reviewer independiente (R30) · **Fecha:** 2026-10-18 · **Base:** `3509b01`, todo sin commitear
**Revisado:** `git diff` + los tres archivos nuevos sin trackear. No edité código ni tests.

> El trabajo está bien hecho y la pieza central —`lib/ingredientes.ts`— aguanta todo lo que le tiré.
> Los cuatro comandos dan verde y los conté yo. Lo que pido arreglar son tres caminos de falla que
> caen justo adentro de lo que la tarjeta se propuso garantizar: *no crear duplicados* y *no dejar la
> pantalla en un estado raro*. Son arreglos chicos.

---

## 1 · Re-ejecución (salida literal)

### `npm --prefix front/Andres_Bakery run test`

```text
> andres-bakery@0.0.0 test
> vitest run


 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery


 Test Files  10 passed (10)
      Tests  80 passed (80)
   Start at  22:09:14
   Duration  294ms (import 41%, transform 30%, tests 16%, worker 13%, environment 1%)
```

### `npm --prefix front/Andres_Bakery run lint`

```text
> andres-bakery@0.0.0 lint
> npm run lint:eslint && npm run typecheck


> andres-bakery@0.0.0 lint:eslint
> eslint .


> andres-bakery@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
```

(sin salida = limpio, en los dos.)

### `npm --prefix front/Andres_Bakery run build`

```text
> andres-bakery@0.0.0 build
> tsc -b && vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 1828 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.19 kB │ gzip:   0.60 kB
dist/assets/index-BnCg5Px_.css   33.99 kB │ gzip:   6.95 kB
dist/assets/index-DdRJay4F.js   376.99 kB │ gzip: 114.46 kB
✓ built in 2.54s
```

### `backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q`

```text
----------------------------------------------------------------------
Ran 213 tests in 42.505s

OK
```

(la salida trae además `ResourceWarning: unclosed database` de SQLAlchemy/werkzeug, igual que siempre;
no es de esta tarjeta.)

**Los cuatro coinciden con el handback, al byte en el caso del build** (376,99 KB JS · 33,99 KB CSS).

---

## 2 · Lo que verifiqué yo, además de correr

- **Casos borde de `normalizar`**, con una reimplementación literal en un `.mjs` **fuera de `src/`**
  (`<scratchpad>/probe.mjs`, no toca la suite). Resultados abajo, en el §4.
- **Los bytes reales del regex de la ñ** (`ingredientes.ts:21`), porque el truco solo funciona si los
  dos literales están escritos en formas Unicode distintas. **Lo están, y está bien**: el patrón es
  `n` + `U+0303` (descompuesto, lo que deja `NFD`) y el reemplazo es `U+00F1` (compuesto). Si alguien
  "arregla" ese renglón normalizando el archivo, `Piña` y `Pina` pasan a ser el mismo ingrediente y
  el test lo agarra. Vale un comentario ahí, pero no es un hallazgo.
- **El back, en la base viva**: `GET /api/ingredients` ⇒ `[{1,"Azúcar","100gr"},{2,"Test",null}]` y
  `GET /api/products` ⇒ 5 productos. **La base quedó como el handback dice**: los datos de prueba se
  limpiaron de verdad.
- **Que `GET /api/products` serialice `ingredients`** (`services/serializers.py:65-68`) — de eso
  depende A5, y es correcto.
- **Que `_apply_relations` esté guardado por `if "ingredient_ids" in data`**
  (`backend/services/product_service.py:104-106`): un PUT que no mande la clave **no** borra los
  ingredientes. A5 se sostiene por dos lados.
- **La aritmética del handback**: `ingredientes.test.ts` tiene 8 `it(`; 72 + 8 = 80. El rojo
  declarado (5 failed | 75 passed) es consistente con un stub que hace pasar los 3 tests de
  "vacío/null/sin coincidencia". No pude re-medir el rojo sin reconstruir el stub.

**Lo que NO pude re-verificar, y lo digo:** A1, A2, A3, A5 y A6 son criterios de navegador y el panel
pide login; la clave del admin es un secreto aleatorio en `.env` (ADR-015) y re-correrlos significaba
escribir sobre los datos reales de Andrea. Verifiqué el **mecanismo** de los cinco leyendo el código y
pegándole a la API. El clic sobre los sugeridos de la IA sigue sin verse correr (B7), tal como el
handback admite.

---

## 3 · Pido arreglar (3)

### H1 · Si `POST /api/ingredients` falla, la pantalla queda en un callejón sin salida

`front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts:206-212`

```ts
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
      return null;
    }
```

**Por qué importa.** El `catch` avisa y se va, pero **no refresca `ingredientes`**. El caso que la
tarjeta misma nombra —el duplicado por carrera: otra pestaña, otro admin, o la propia Andrea que ya
lo creó y no se acuerda— llega como `ValidationError("ingredient already exists")` ⇒ **400**
(`backend/services/ingredient_service.py:19-20`, `services/exceptions.py:13-14`). Con ese 400:

- la lista local sigue sin el ingrediente ⇒ `buscarIngrediente` sigue devolviendo `null`;
- el botón vuelve a habilitarse ⇒ ella aprieta otra vez ⇒ **el mismo 400, para siempre**;
- el ingrediente existe en la base y ella no puede marcarlo sin recargar el panel entero
  (que es justo lo que ADR-020 no quiere, porque recargar le vuela el formulario).

**Cómo reproducirlo.** Abrir el panel en dos pestañas. En la A crear "Manteca". En la B (con la lista
vieja en memoria) escribir "Manteca" y apretar Agregar: 400, banner, y ningún reintento funciona.

**Sugerencia** (no la implemento, R30): en el `catch`, re-pedir `ingredientsApi.list()`, buscar el
nombre normalizado en lo que vuelve y, si está, devolverlo como si lo hubiera creado. La pantalla
converge sola y el 400 por carrera deja de ser un callejón. Si eso parece mucho, como mínimo
refrescar la lista para que el segundo intento encuentre el existente.

### H2 · El error aparece arriba de todo, lejos de donde ella está mirando

`front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts:207` + `pages/admin/AdminPage.tsx:58`

```tsx
      {panel.error ? <ErrorBanner message={panel.error} /> : null}
```

**Por qué importa.** El único feedback de un alta fallida es un banner en el tope de la página. El
campo de ingredientes vive abajo de un formulario largo; a 375px (V8) Andrea aprieta "Agregar", el
spinner gira, para, **y no pasa nada visible donde está su dedo**. El texto del banner, además, es el
del back **en inglés** (`"ingredient already exists"`, `"name is required"`), mostrado tal cual. Es el
mismo síntoma que el changelog 0.10.1 describe para el 401: "fallaba en silencio".

**Cómo reproducirlo.** El mismo escenario de H1 a 375px, con el formulario scrolleado hasta los
ingredientes. (También con la red cortada desde las devtools: mismo silencio local.)

**Sugerencia:** un error local adentro de `SelectorDeIngredientes`, abajo del input, además del banner.

### H3 · Dos sugeridos de la IA que son el mismo ingrediente **sí** pueden crear el duplicado

`front/Andres_Bakery/src/pages/admin/FotoDelProducto.tsx:46-62` (el guard es `agregando`, un string)

```tsx
    setAgregando(sugerido);
    const creado = await onCrearIngrediente(sugerido);
```

**Por qué importa.** El guard de "ocupado" es **un solo string**, así que marca ocupado **ese**
sugerido y deja el resto de los botones habilitados. Si el modelo devuelve dos grafías de lo mismo
—`["manteca", "Manteca"]`, `["azucar impalpable", "Azúcar impalpable"]`— y ella toca el segundo
mientras el `POST` del primero está en vuelo, salen **dos altas** del mismo ingrediente. Y el back no
la salva: su unicidad es **exacta** (`Ingredient.query.filter_by(name=name)`,
`ingredient_service.py:19`), así que `"manteca"` y `"Manteca"` **entran las dos**. Queda en la lista
de Andrea el duplicado que esta tarjeta existe para evitar, y nadie lo limpia.

Secuencialmente no pasa (al volver el primero, `estadoDelSugerido` normaliza y reusa). Es
estrictamente la ventana de la carrera, y la lista de la IA **no viene deduplicada**: `_lista()` en
`backend/services/ai_service.py:267-271` recorta y filtra vacíos, no deduplica.

**Cómo reproducirlo.** Hoy no se puede en el navegador (B7, IA apagada). Se ve en el código, y se
vería con un `aiApi.borradorDeReceta` que devuelva `["manteca","Manteca"]` y dos clics seguidos.

**Sugerencia:** que `agregando` sea el **nombre normalizado** y que deshabilite todos los sugeridos
que normalizan igual; o un `ref` de nombres normalizados en vuelo, que además cubre H3 y la parte de
carrera de H1 de una sola vez. Mismo patrón de un solo-en-vuelo serviría para
`SelectorDeIngredientes.tsx:29` (ahí el doble clic sí está tapado por `disabled` + el re-render de
React entre dos eventos de clic discretos — lo revisé y **no** es un problema).

---

## 4 · Menores (5)

### H4 · Los espacios internos se comparan colapsados, pero se guardan como vinieron

`front/Andres_Bakery/src/pages/admin/SelectorDeIngredientes.tsx:28` (`const limpio = nombre.trim();`)
y `usePanelDeAdmin.ts:200` (`const limpio = nombre.trim();`)

`normalizar` colapsa `\s+` (bien), pero lo que se manda al back es solo `.trim()`, y el back solo
hace `.strip()` (`ingredient_service.py:16`). Medido:

```text
"Dulce  de  leche" == "Dulce de leche" ?  true   (comparando)
```

…pero el nombre que queda grabado es literalmente `"Dulce  de  leche"`, con el doble espacio, para
siempre y en todas las fichas. **No genera un duplicado** (la comparación lo agarra después), es
calidad de dato. Un `.replace(/\s+/g, " ")` junto al `trim()` lo cierra.

### H5 · Caracteres invisibles pasan el filtro y sí generan un duplicado

`front/Andres_Bakery/src/lib/ingredientes.ts:13-26`. Medido con el probe:

```text
"Azúcar\u200b" == "Azúcar" ?  false      (espacio de ancho cero)
"Azú\u00adcar" == "Azúcar" ?  false      (guión suave)
```

`\s` no los incluye y no son combinantes `U+0300-036F`. Llegan copiando y pegando de una página de
recetas o de WhatsApp, que es exactamente cómo Andrea va a cargar media lista. El duplicado que
genera es **invisible en pantalla**: dos chips que dicen "Azúcar". Se tapa barriendo
`[\u00ad\u200b-\u200d\ufeff]` en `normalizar`.

Todo lo demás que probé aguanta: ñ compuesta y descompuesta, `PIÑA` en las dos formas, NBSP, tab y
newline, acento combinante suelto, `İ` turca, emoji, `ø`, y `ñ` con un segundo acento encima.
`buscarIngrediente` nunca devolvió algo que no correspondiera, y con `""`, `"   "`, `null` y
`undefined` devuelve `null` en vez del primero de la lista (bien cubierto por el test).

### H6 · Los chips no cortan palabra: riesgo real para A6, que se midió con nombres cortos

`FotoDelProducto.tsx:133-141` y `SelectorDeIngredientes.tsx:71-87`. Los chips están en un
`flex-wrap`, pero ninguno tiene `break-words`, `max-w-full` ni `min-w-0`, y no hay regla global que lo
cubra (`src/index.css` no define `overflow-wrap` ni `word-break`). Un nombre largo **de una sola
palabra** no envuelve y empuja el ancho. El back deja pasar sugeridos de hasta **120 caracteres**
(`LARGO_CORTO`, `ai_service.py:52`), escritos por un modelo. A6 se midió con "Azúcar" y "Manteca", que
nunca iban a desbordar: el `scrollWidth - clientWidth = 0` del handback es verdadero y no prueba este
caso.

### H7 · `key={sugerido}` sobre una lista que nadie deduplica

`FotoDelProducto.tsx:131`. `_lista()` del back no deduplica, así que el modelo puede devolver el mismo
string dos veces y React recibe dos hijos con la misma `key`. Warning en consola y reconciliación
rara justo en los botones que llevan estado de "ocupado". **Preexistente** (el `<li>` anterior usaba
la misma key), pero antes era texto muerto y ahora es un botón con estado.

### H8 · Los sugeridos de un producto sobreviven al cambio de producto

`FotoDelProducto.tsx:30` (`ingredientesSugeridos`). Al apretar "Editar" en otro producto
(`ProductsTab.tsx:235-250`) se reemplaza `productForm`, pero `FotoDelProducto` no se remonta ni se
resetea: las sugerencias del producto A quedan en pantalla mientras se edita el B. **Preexistente**,
pero antes eran texto para copiar y ahora **un clic las agrega al producto equivocado**. Un
`key={editingProductId ?? "nuevo"}` en `<FotoDelProducto>` lo resuelve.

---

## 5 · Cosmético e informativo (5)

### H9 · (cosmético) La lista se reordena distinto de como la ordena el back

`usePanelDeAdmin.ts:203-205` reordena con `localeCompare(…, "es")`; el back ordena con
`Ingredient.name.asc()` (SQL, `ingredient_service.py:12`). Después de crear el primer ingrediente la
lista entera salta a otro orden, y al recargar vuelve al anterior. No rompe nada.

### H10 · (cosmético) Los mensajes del back llegan en inglés a una pantalla en castellano

`"ingredient already exists"`, `"name is required"`. Ver H2.

### H11 · (informativo, R05) `lib/api.ts` quedó en 355 líneas

Por encima del tope de 300 de R05 (abajo del máximo de 400). **No lo rompió esta tarjeta**: en `HEAD`
ya estaba en 341, y acá se le sumaron 14 por `ingredientsApi`. Lo anoto porque la tarjeta lo tocó y
porque el archivo va a seguir creciendo con cada endpoint nuevo. Todo lo demás de la zona cumple:
`ingredientes.ts` 60, `ingredientes.test.ts` 80, `SelectorDeIngredientes.tsx` 120,
`FotoDelProducto.tsx` 156, `ProductsTab.tsx` 264 (239 antes: la decisión de sacar el selector a su
propio archivo fue la correcta), `usePanelDeAdmin.ts` 287, `AdminPage.tsx` 122. Ningún archivo nuevo
pasa de 300.

### H12 · (informativo) El diff trae trabajo que no es de esta tarjeta

`sdd/decisions.md` suma **ADR-029**, que es de variantes (F19), no de ingredientes. `status.md` y
`changelog.md` también mezclan las dos cosas. Es trabajo del leader, no del implementador, y los
textos son honestos — pero el commit de T6-F20 va a llevarse adentro la planificación de F19. Que lo
decida quien commitee.

### H13 · (informativo) La unicidad normalizada es una convención del front, no una garantía

`ingredient_service.py:19` compara por nombre exacto. "azucar" y "Azúcar" pueden convivir en la base
si entran por la API, por otra pestaña o por la carrera de H3; y si conviven, `buscarIngrediente`
devuelve **el primero de la lista** y lo hace en silencio. Es determinista y no es un bug de esta
tarjeta (el back no se toca, y así lo manda la tarjeta), pero conviene que esté escrito: A4 vale
mientras la lista que el front tiene en memoria esté fresca. Un índice único sobre el nombre
normalizado sería el arreglo de verdad, y es otra tarjeta.

---

## 6 · ¿Miente el handback?

**No.** Es el handback más honesto de los que leí en este repo: dice en voz alta que el clic sobre
los sugeridos de la IA **no se vio correr** (B7), y lo repite en `status.md` y en `changelog.md` en
lugar de esconderlo. Los números que pude contrastar dan:

| Lo que dice | Lo que medí |
|---|---|
| front 80 OK (eran 72) | **80 passed (80)**, y el archivo nuevo aporta 8 `it(` ⇒ 72 de base: cierra |
| back 213 OK, sin cambios | **Ran 213 tests … OK** |
| lint y typecheck limpios | limpios, los dos `tsconfig` |
| build 376,99 KB JS · 33,99 KB CSS | **idéntico**, al decimal |
| "la base quedó como estaba (Azúcar, Test; 5 productos)" | `GET /api/ingredients` y `GET /api/products`: **exacto** |

Dos matices, ninguno es una mentira:

- **A4 "OK — 1 solo `POST /api/ingredients` en toda la sesión"** es cierto para lo que se probó, pero
  la garantía tiene el agujero de H3. El criterio se cumple; la frase sugiere una certeza más ancha
  de la que el código da.
- **A6 "OK — `scrollWidth - clientWidth = 0` en los dos"** es una medición real, hecha con nombres
  cortos. No cubre H6.

El rojo medido (R29) no lo pude re-ejecutar sin reconstruir el stub; los números declarados son
internamente consistentes.

---

## 7 · Qué hace falta para que esto sea `APPROVED`

1. **H1** — que un `POST` fallido refresque la lista en vez de dejar un reintento que nunca va a andar.
2. **H2** — que el error del alta se vea donde está el botón.
3. **H3** — que el guard de "en vuelo" sea por nombre normalizado y no por string crudo.

H4 a H8 los dejo a criterio del leader: H4 y H5 son dos `replace` y evitan basura permanente en la
lista de Andrea; H6 y H8 son los que más la van a molestar el día que se prenda la IA. Lo demás es
registro.

**El resto de la tarjeta está bien.** `lib/ingredientes.ts` es la pieza correcta, está en el lugar
correcto, el manejo de la ñ es más cuidadoso de lo que pide la tarjeta, y la decisión de no recargar
al crear un ingrediente respeta ADR-020 — verifiqué que ningún camino de alta llame a `cargar()`, que
`aplicarBorrador` preserve `ingredient_ids` con el spread, y que `AdminPage` renderice el panel **al
lado** del `LoadingPanel` y no en su lugar, así que nada desmonta el formulario. **Lo que Andrea
escribe no se pierde por crear un ingrediente.**
