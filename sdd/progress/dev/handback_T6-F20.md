# Handback · T6-F20 · Ingredientes desde el panel

**Estado:** `done` · **Rama:** `dev` · **Base:** `3509b01` · **Fecha:** 2026-10-18
**Tarjeta:** [`sdd/cards/T6-F20-ingredientes.md`](../../cards/T6-F20-ingredientes.md) · **Sin commitear todavía** (R01: falta OK humano)

## Lo que se hizo

| Pieza | Dónde |
|---|---|
| Comparar nombres sin acentos ni mayúsculas | `front/src/lib/ingredientes.ts` (nuevo) |
| El selector | `front/src/pages/admin/SelectorDeIngredientes.tsx` (nuevo) |
| Cliente de la API | `front/src/lib/api.ts` · `ingredientsApi` |
| Estado y alta sin recargar | `front/src/pages/admin/usePanelDeAdmin.ts` · `crearIngrediente` |
| Los sugeridos de la IA, con un clic | `front/src/pages/admin/FotoDelProducto.tsx` |
| Montaje y carga al editar | `ProductsTab.tsx` · `AdminPage.tsx` · `ui-types.ts` |

**El back no se tocó.** `product_service._apply_relations` ya aceptaba `ingredient_ids` desde T3.

## Evidencia (R30)

Rojo medido contra la base `3509b01`, con el stub que importa (harness.md §5), para que cada test
falle por su aserción y no por el import:

```text
 FAIL  src/lib/ingredientes.test.ts > estadoDelSugerido > distingue el que ya está marcado del que solo existe
AssertionError: expected { estado: 'nuevo', ingrediente: null } to deeply equal { estado: 'elegido', …(1) }

 Test Files  1 failed | 9 passed (10)
      Tests  5 failed | 75 passed (80)
```

Verde después de implementar:

```text
 Test Files  10 passed (10)
      Tests  80 passed (80)
```

```text
Ran 213 tests in 42.571s

OK
```

Lint (`eslint` + `tsc` sobre los dos tsconfig): limpio.
Build: verde — `376,99 KB` JS · `33,99 KB` CSS (era 366,59 · 33,92).

## Criterios, uno por uno

| # | Criterio | Resultado |
|---|---|---|
| A1 | Lista los ingredientes y marca los del producto editado | **OK** — navegador: al editar, "Azúcar" y "Manteca" vuelven `[pressed]` |
| A2 | Marcar y guardar persiste | **OK** — `GET /api/products/6` ⇒ `['Azúcar', 'Manteca']` |
| A3 | Crear uno nuevo sin perder lo escrito | **OK** — tras crear "Manteca", el form conserva nombre y descripción |
| A4 | "azucar" reusa "Azúcar" | **OK** — `ingredientes.test.ts` **y** navegador: `1` solo `POST /api/ingredients` en toda la sesión |
| A5 | Editar y guardar sin tocar ingredientes no se los lleva | **OK** — tras guardar, siguen `['Azúcar', 'Manteca']` |
| A6 | 375px y 390px sin desborde | **OK** — `scrollWidth - clientWidth = 0` en los dos |

## Lo que apareció mientras tanto

**Enter adentro del campo de ingrediente guardaba el producto.** Un `<input>` dentro de un `<form>`
manda el formulario al apretar Enter, y el formulario que lo contiene es el del producto: escribir
"Manteca" y apretar Enter creaba el producto a medio cargar. Está atajado con `preventDefault` en
`SelectorDeIngredientes`, y verificado en el navegador: `0 POST /api/products` hasta apretar el
botón de verdad.

## Lo que NO se pudo ver andando, y hay que decirlo

**El botón sobre los ingredientes que propone la IA no se ejercitó en el navegador**, porque F46
está apagada por B7 (falta `ANTHROPIC_API_KEY`). Lo que está cubierto es la decisión que toma
(`estadoDelSugerido`, con test) y que compila; lo que nadie vio correr es el clic. Queda como lo
primero a mirar el día que se prenda la IA.

## Datos de prueba

Se creó y se borró: producto `#6 "Lemon pie de prueba"` e ingrediente `"Manteca"`. La base quedó
como estaba (`Azúcar`, `Test`; 5 productos).

## Próximo paso

Reviewer independiente que **re-ejecute** (R30). Después, OK humano para commitear.
