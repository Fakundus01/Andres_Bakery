# T6-F20 · Ingredientes desde el panel

**Feature:** F20 (70% → 100%) · **Rama:** `dev` · **Tier (R12):** MEDIO · **Depende de:** nada
**Superficie (R27):** N1 (panel admin, ya autenticado). No toca plata ni datos de terceros. Sin niveles nuevos.

## Por qué

El m2m `Product.ingredients` y el CRUD de `/api/ingredients` existen **desde T3 y nadie los usa**
(`design.md` §"Dos conceptos que se pisan", `contracts.md` líneas 23-24). El back ya acepta
`ingredient_ids` en POST y PUT (`product_service._apply_relations`). Falta solamente la pantalla.

Hoy el asistente de IA propone ingredientes y `FotoDelProducto.tsx:107` dice, textual, *"quedan a la
vista para que los copies: cargar ingredientes desde el panel todavía no está"*. Esta tarjeta es la
que borra esa frase.

## Zona de archivos

```
front/Andres_Bakery/src/lib/ingredientes.ts          (nuevo, lógica pura)
front/Andres_Bakery/src/lib/ingredientes.test.ts     (nuevo)
front/Andres_Bakery/src/lib/api.ts                   (+ ingredientsApi)
front/Andres_Bakery/src/lib/ui-types.ts              (+ ProductForm.ingredient_ids)
front/Andres_Bakery/src/pages/admin/SelectorDeIngredientes.tsx   (nuevo)
front/Andres_Bakery/src/pages/admin/ProductsTab.tsx  (lo monta + carga ids al editar)
front/Andres_Bakery/src/pages/admin/FotoDelProducto.tsx          (el botón en los sugeridos)
front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts           (estado + carga)
```

`ProductsTab.tsx` está en 239 líneas: el selector va en archivo aparte o se pasa de 300 (R05).
**El back no se toca.**

## Decisiones ya tomadas

- **El ingrediente es global.** `Ingredient.name` ya es único en la base: "Chocolate semiamargo" se
  escribe una vez y lo reusan todos los productos. No hay ingredientes "de un producto".
- **Buscar antes de crear, sin acentos y sin mayúsculas.** La IA escribe "chocolate" y en la base
  está "Chocolate": crear el duplicado sería ensuciarle la lista a Andrea para siempre. La
  comparación normalizada vive en `lib/ingredientes.ts`, que es lo que se testea.
- **Crear un ingrediente no guarda el producto.** El formulario sigue como está; solo se agrega una
  opción marcada. Perder lo escrito por apretar un botón ya fue el error que ADR-020 evitó.

## Criterios de aceptación

| # | Criterio | Lo demuestra |
|---|---|---|
| A1 | El panel lista todos los ingredientes y marca los del producto que se está editando | navegador |
| A2 | Marcar/desmarcar y guardar persiste: `GET /api/products/<id>` devuelve los ingredientes nuevos | navegador + red |
| A3 | Se crea un ingrediente desde el formulario, queda marcado, y **lo tipeado no se pierde** | navegador |
| A4 | Un sugerido por la IA que ya existe con otra grafía ("chocolate" vs "Chocolate") **reusa** el existente, no crea uno nuevo | `ingredientes.test.ts` |
| A5 | Editar un producto y guardar **sin tocar** ingredientes no se los lleva puestos | navegador + test del back que ya existe |
| A6 | A 375px (V8) y a 390px, sin scroll horizontal, medido con `scrollWidth` vs `clientWidth` | navegador |

> **Ojo con V8 vs D21:** `spec.md` V8 dice **375px** y D21 dice que el piso que nos pusimos es **390**.
> Se mide en los dos y se reporta; la contradicción entre los dos MD se resuelve aparte.

## Verificación (R30)

```
npm --prefix front/Andres_Bakery run test     # Vitest, base: 72 OK
npm --prefix front/Andres_Bakery run lint
npm --prefix front/Andres_Bakery run build
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q   # base: 213 OK, no debe bajar
```

Rojo medido (R29): `ingredientes.test.ts` contra la base, antes de que exista `buscarIngrediente`,
se mide contra un stub que importa (harness.md §5), no contra el `ImportError`.
