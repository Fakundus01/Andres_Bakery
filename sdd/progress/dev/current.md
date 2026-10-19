# T4/T6 · Terminar el panel (F19, F20) — tarjeta 1 revisada, y creció a 4

**Rama:** `dev` · **Features:** F19, F20 · **ADR:** 029 · **Versión:** 0.11.0
**Estado:** T6-F20 implementado, revisado por dos revisores y **corregido**; sin commitear (R01).
**F20 NO está Complete**: la revisión destapó que la unicidad del ingrediente vive en el lugar
equivocado, y eso es `T6-F20b`. Faltan además las dos de F19.

> Si esta sesión se corta: F20 está implementado, verde y con su handback
> ([`handback_T6-F20.md`](handback_T6-F20.md)), **sin commitear**. Las dos tarjetas de F19 no tienen
> una línea de código escrita.

---

## Lo que apareció al planificar

Leyendo el código en vez de la spec, F19 resultó más grande de lo que decía: el selector de tamaño de
la ficha es **decorativo**. Cambia el precio en pantalla y el pedido se cobra al precio base. Se
levantó como DRIFT (R25) con tres opciones; el humano eligió **A: completarla de punta a punta**.
Queda en ADR-029.

El resto fue al revés, y para bien: **el back ya sabe todo**. `product_service._apply_relations`
acepta `ingredient_ids` y `variants` desde T3, y `/api/ingredients` tiene el CRUD completo y sin usar
(`contracts.md` líneas 23-24). F20 es pantalla y nada más.

## Las tres tarjetas, en este orden

| # | Tarjeta | Qué cierra | Por qué en este lugar |
|---|---|---|---|
| 1 | [`T6-F20-ingredientes`](../../cards/T6-F20-ingredientes.md) ✅ **revisada y corregida** | F20 → 90% | No dependía de nada y borró el "copiá esto" de la IA |
| 1b | [`T6-F20b-la-unicidad-vive-en-el-back`](../../cards/T6-F20b-la-unicidad-vive-en-el-back.md) ⬅ **nueva** | F20 → 100% | Salió de la revisión. Tiene una decisión pendiente para el humano (200 vs 400) |
| 2 | [`T4-F19a-la-variante-se-cobra`](../../cards/T4-F19a-la-variante-se-cobra.md) | el agujero de plata | **Va antes que la 3.** Al revés hay una ventana donde el panel carga tortas que se cobran de menos |
| 3 | [`T4-F19b-variantes-desde-el-panel`](../../cards/T4-F19b-variantes-desde-el-panel.md) | F19 → 100% | Necesita que el servidor ya sepa cobrar |

## Base medida antes de empezar

| Check | Base |
|---|---|
| Tests del back | 213 OK (sin cambios: F20 no tocó el back) |
| Tests del front | 72 OK → **80 OK** tras F20 |
| Migración | `0004` (la próxima es `0005`) |
| Último ADR | 029 |

## Lo que dejó la tarjeta 1

**Implementando:** Enter en el campo de ingrediente guardaba el producto a medio cargar (un
`<input>` dentro de un `<form>` manda el formulario). Atajado y medido.

**La revisión funcional (CHANGES_REQUESTED, 13 hallazgos):** los 3 bloqueantes arreglados con su
test — el alta fallida que no refrescaba la lista, el aviso de error lejos y en inglés, y el candado
de "en vuelo" sobre el texto crudo. Más los invisibles (ZWSP, guión suave) y el espacio interno que
se guardaba sin colapsar.

**La revisión de seguridad (APPROVED, 1 MEDIA):** sin XSS, autorización correcta. El MEDIA —4 MB en
un `name` que el `GET` público devuelve— se va a `T6-F20b` porque toca el back, fuera de la zona de
la tarjeta.

**Y lo que apareció probando el arreglo en el navegador**, que es lo que corre a F20 de "Complete":
la unicidad del back es por **nombre exacto** y la del front es **normalizada**, así que con la lista
local vieja el duplicado entra igual. El front solo puede evitar los duplicados que ve.

Deuda honesta que sigue: el botón sobre los ingredientes que propone la IA **no se vio correr**,
porque F46 está apagada por B7. Probada está la decisión que toma, no el clic.

## Base medida después de la corrección

front **88 OK** (eran 72) · back **213 OK** · lint limpio · build 377,83 KB · R05: el archivo más
largo del panel quedó en 287 líneas.

## T6-F20b · implementado el 2026-10-19

Las tres decisiones las tomó el humano: **200 con la fila existente**, **borrar/renombrar entra en
la tarjeta**, y **F20b antes que F19**. Quedan en ADR-030.

| Pieza | Dónde |
|---|---|
| Unicidad normalizada, espejo del front | `services/saneado.py` · `normalizar_nombre`, `sin_invisibles` |
| Get-or-create + topes de largo | `services/ingredient_service.py` (reescrito) |
| 201 si creó, 200 si ya existía | `routes/ingredients.py` |
| Tests, que no existían | `tests/test_ingredient_service.py` · **11 nuevos** |
| Renombrar y borrar desde la pantalla | `admin/AdministrarIngredientes.tsx` (nuevo) |
| Todo lo de ingredientes, junto | `admin/useIngredientesDelPanel.ts` (nuevo, R05) |

**Verde:** back **224 OK** (eran 213) · front **88 OK** · lint limpio · build 381,81 KB.
**Rojo medido** contra la base con la firma ya cambiada, para que las 8 fallas fueran por aserción y
no por desempaque (harness.md §5). El error número 9 era el bug: un `name` que es dict llegaba a la
base y reventaba.

### Lo que FALTA de F20b, y no es menor

**La verificación en navegador (D7 y la pantalla de renombrar/borrar) no se hizo.** El navegador
estaba siendo usado por el humano al mismo tiempo —clicks `isTrusted` en Configuración— y seguir
hubiera sido pelearle el control. **Nada de la pantalla nueva se vio correr.** Lo que está probado
es el back, con sus 11 tests.

## Verificación en navegador de F20b — hecha el 2026-10-19

Panel cargado con la lista vieja ⇒ `Coco rallado` creado por fuera ⇒ se escribe `COCO RALLADO` en el
panel ⇒ **una sola fila**, y el chip muestra el nombre real. Después: renombrar, borrar, cancelar un
borrado, y 375/390px con `scrollWidth - clientWidth = 0`. La base quedó como estaba.

Tres cosas salieron de ahí y están arregladas: el **servidor corriendo código viejo** (Flask no
recarga solo; quedó como lección en `testing.md` §6), el **panel mostrando un nombre distinto del
guardado**, y el aviso que decía **«sale de los 1 productos»**.

## Tanda nueva planificada: T18 · Tortas a pedido

Pedido del humano el 2026-10-19, por dictado. Las cuatro ambigüedades se preguntaron antes de
escribir nada (R04) y quedaron en **ADR-031**. Tres tarjetas escritas, ninguna implementada:
[`T18-F57`](../../cards/T18-F57-grupos-de-opciones.md),
[`T18-F58`](../../cards/T18-F58-el-cliente-arma-su-torta.md),
[`T18-F59`](../../cards/T18-F59-foto-de-referencia.md).

**F58 depende de `T4-F19a`**, que es quien cambia la identidad del renglón del carrito.
**F59 reclasifica N5** a escritura pública de archivos (`security.md` §1b).

## PRÓXIMO PASO

Reviewer de F20b (corriendo) ⇒ OK humano ⇒ commit ⇒ **`T4-F19a`**, el agujero de plata, que además
deja el carrito listo para F58.
