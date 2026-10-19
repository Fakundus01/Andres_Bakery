# Handback · T6-F20b · La unicidad del ingrediente vive en el back

**Estado:** `done` · **Rama:** `dev` · **Fecha:** 2026-10-19 · **ADR:** 030
**Tarjeta:** [`sdd/cards/T6-F20b-la-unicidad-vive-en-el-back.md`](../../cards/T6-F20b-la-unicidad-vive-en-el-back.md)
**Sin commitear** (R01).

## Evidencia (R30)

Rojo medido con la firma ya cambiada y el comportamiento viejo, para que las fallas fueran por
aserción y no por desempaque (harness.md §5): **8 fallas + 1 error**. El error era el bug: un `name`
que es dict llegaba a la base y reventaba.

Verde: back **224 OK** (eran 213) · front **90 OK** (eran 72 al abrir F20) · lint y typecheck
limpios · build 381,91 KB JS.

## Criterios

| # | Criterio | Resultado |
|---|---|---|
| D1 | "coco rallado" sobre "Coco rallado" no crea fila nueva | **OK** — test + navegador |
| D2 | Acentos: "azucar" contra "Azúcar" | **OK** — test |
| D3 | La ñ no se conflactúa: "Piña" ≠ "Pina" | **OK** — test |
| D4 | `name` > 120 ⇒ 400 explicado | **OK** — 500.000 caracteres ⇒ `400 El nombre no puede pasar de 120 caracteres.` |
| D5 | `unit` > 40 ⇒ 400; tipos raros ⇒ 400 y no 500 | **OK** — test |
| D6 | El `PUT` tiene los mismos topes | **OK** — test |
| D7 | El caso del navegador ya no duplica | **OK** — ver abajo |
| — | Renombrar y borrar desde la pantalla | **OK** — navegador |

## El caso del navegador, paso a paso

1. Panel cargado con `[Azúcar, Test]`.
2. `POST /api/ingredients {"name": "Coco rallado"}` por fuera ⇒ `201`. **El panel no se entera.**
3. En el panel, con la lista vieja, se escribe **`COCO RALLADO`** y Enter.
4. Resultado: **una sola fila** en la base, y el chip marcado dice **`Coco rallado`** — el nombre
   real, no el que se tipeó.

Después: renombrar a "Coco rallado fino" (persistió), borrar (desapareció). La base quedó como
estaba al empezar: `Azúcar`, `Test`, 5 productos, Brownies con `Test`.

375px y 390px con el modo "Corregir o borrar" abierto: `scrollWidth - clientWidth = 0` en los dos.

## Dos cosas que aparecieron probando, y que los tests no habrían encontrado

1. **El servidor estaba corriendo código viejo.** La primera corrida "falló" y el duplicado entró:
   el proceso de Flask venía de antes de los cambios y `debug` está apagado desde la review de T7,
   así que no recarga solo. La prueba no medía lo que decía medir. **Lección para el handback de
   cualquiera: después de tocar el back hay que reiniciarlo antes de creerle al navegador.**
2. **El panel mostraba un nombre que no era el guardado.** Con `200`, el front se quedaba con lo que
   ella tipeó ("coco rallado") mientras la base decía "Coco rallado". Ahora el `POST` devuelve
   `{id, name}` y el panel usa ese nombre. Con su test.
3. **«Si lo borrás sale de los 1 productos».** El aviso que se lee justo antes de algo que no se
   deshace, mal escrito. Singular y plural separados.

## Próximo paso

Reviewer independiente que re-ejecute (R30) ⇒ OK humano ⇒ commit ⇒ `T4-F19a`.

---

# Segunda vuelta · lo que devolvió la revisión (2026-10-19)

**Veredicto recibido:** `CHANGES_REQUESTED`, 9 hallazgos. Los tres de peso eran reales y están
arreglados con su test; los menores también. **El reviewer tenía razón en el título de la tarjeta:
la unicidad no vivía en el back, vivía en una mirada.**

| # | Hallazgo | Qué se hizo |
|---|---|---|
| 1 (ALTA) | `check-then-insert` sin restricción: 3 filas con 8 hilos, y 500 con HTML con grafía idéntica | Columna `normalized_name` con índice único (migración `0005`) + `IntegrityError` traducido. **El modelo deriva el normalizado al asignar el nombre**, así ningún camino puede dejar una fila inconsistente |
| 2 (MEDIA) | Las dos normalizaciones no espejaban: 11 de 56 | Las dos pasan a **propiedades Unicode** (`\p{Cf}`, `\p{White_Space}`, `\p{Cc}`, `\p{M}`) en vez de rangos a mano. El `" · "` de `saneado.texto` salía del medio |
| 3 (MEDIA) | El tope recortaba en silencio, contra lo que prometía la ADR | El tope que se le pasa a `texto` es holgado y la medición se hace sobre lo limpio |
| 4 (BAJA) | `contracts.md` en la versión anterior | Actualizado |
| 5 (BAJA) | `lib/api.ts` en 370 líneas (R05) | Partido en `api/{cliente,catalogo,pedidos,sitio}.ts` + `index.ts`. Ningún import cambió |
| 6 (BAJA) | Borrar un ingrediente dejaba su id muerto en el formulario | El id se saca del form al borrar |
| 7 (INFO) | **Corrige una premisa nuestra** | Ver abajo |
| 8, 9 (INFO) | Topes en caracteres; sin filas colgadas | Anotados, sin acción |

## Lo que tuvimos que corregir de lo que habíamos escrito

La ADR, la tarjeta y la changelog decían que una fila de 4 MB **«se la descarga cada visitante»**.
Es falso: `GET /api/ingredients` no pide auth, pero la única pantalla que lo llama es el panel
(`usePanelDeAdmin.ts:102`). Se había repetido del informe de seguridad **sin comprobarlo**.
Corregido en los tres lugares, con la nota de que estaba mal.

## Un error mío, con consecuencia sobre la base real

Probando la migración, corrí un `downgrade` pasando `SQLALCHEMY_DATABASE_URI`, pero `config.py` lee
**`DATABASE_URL`**: el comando no fue a la copia, fue a `instance/bakery.db`. La bajó de `0004` a
`0003`, lo que volvió `customer_email` a `NOT NULL` y **escribió el mail placeholder en 3 pedidos**
que lo tenían en NULL.

**Restaurado hacia adelante:** `upgrade` a `0005` y los 3 mails devueltos a NULL. Estado verificado:
versión `0005`, `customer_email` acepta NULL, 7 pedidos, 3 con mail NULL, ingredientes `Azúcar` y
`Test` con su normalizado. Hay un respaldo del estado intermedio en el scratchpad.

**La regla que queda:** la variable es `DATABASE_URL`. Un comando de migración que no la nombra
**apunta a la base real**, aunque uno crea que está probando sobre una copia.

## Evidencia final

```text
Ran 228 tests in 47.459s

OK
```

```text
 Test Files  11 passed (11)
      Tests  90 passed (90)
```

Lint y typecheck limpios. Build 382,06 KB JS. Migración `0005` probada para arriba y para abajo
sobre una copia **con dos filas que normalizan igual sembradas a propósito**: ninguna se pierde, la
segunda queda con sufijo y lo avisa por log.

## Próximo paso

Re-review de lo corregido (R30: el reviewer pidió cambios, los cambios no se autoaprueban) ⇒ OK
humano ⇒ commit ⇒ `T4-F19a`.
