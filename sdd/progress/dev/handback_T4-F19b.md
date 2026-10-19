# Handback · T4-F19b · Variantes desde el panel

**Fecha:** 2026-10-19 · **Rama:** `dev` · **Versión:** 0.13.0 · **Feature:** F19 (cierra al 100%)
**Estado:** implementado, verde y verificado en el navegador. **Sin commitear** (R01). Falta la
revisión independiente (R30).

---

## 1 · Lo hecho

| Qué | Dónde |
|---|---|
| El editor de tamaños del formulario: agregar, renombrar, precio, reordenar, borrar | `admin/VariantesDelProducto.tsx` (nuevo) |
| La lógica que define precios, afuera de React y con tests | `lib/variantes.ts` + `variantes.test.ts` (nuevos) |
| El formulario lleva sus tamaños, con los **ids** de los que ya estaban | `lib/ui-types.ts` · `admin/valoresIniciales.ts::formularioDesdeProducto` |
| La traducción formulario → payload, aparte y testeada | `admin/payloadDelProducto.ts` + su test (nuevos) |
| Un tamaño borrado se explica distinto del ajeno (C5) | `services/renglon_del_pedido.py::_variante` |

**La corrección del back que pedía la tarjeta ya estaba**: `_build_variants` conserva los ids desde
las correcciones de la revisión de T18, con sus tests (C2 y C3).

**Refactors por R05:** `ProductsTab` (311) soltó la lista a `admin/ListaDeProductos.tsx`, y
`usePanelDeAdmin` (309) soltó los dos payloads a `payloadDelProducto.ts`.

## 2 · Tests (comando + salida)

```
$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
Ran 330 tests in 83.997s
OK                                        (base: 328)

$ npm --prefix front/Andres_Bakery run test
Test Files  15 passed (15)
     Tests  166 passed (166)               (base: 135)

$ npm --prefix front/Andres_Bakery run lint      # limpio
$ npm --prefix front/Andres_Bakery run build     # 408,41 KB JS · 34,41 KB CSS
```

**Rojo medido (R29):** C5 primero. Contra el código de hoy, el test del tamaño borrado falla
mostrando el mensaje genérico:

```
AssertionError: 'ya no está disponible' not found in 'Ese tamaño no es de «Torta de chocolate».'
```

## 3 · Navegador (C1, C3, C6, C7)

Panel → "20 porciones" a $28.000 cargado en la torta ⇒ **los ids no se movieron** (1 y 2 antes;
1, 2 y 3 después, medido por API) ⇒ comprado **sin sesión** a $28.000, con el total $42.200 ⇒ el
mensaje de WhatsApp nombra los dos tamaños ⇒ borrado desde el panel con su aviso (*"al guardar se
borra «20 porciones», y quien lo tenga en el carrito va a tener que elegir de nuevo"*) ⇒ ids 1 y 2
intactos. 375 y 390px con el editor abierto y tres filas: `scrollWidth - clientWidth = 0`.

## 4 · Lo que apareció en el navegador, y los tests no vieron

1. **El resumen del checkout cobraba el precio base.** Una torta de 20 porciones de $28.000
   aparecía en $14.200 en su renglón, con el total correcto al lado — la pantalla anterior a
   confirmar. Era el agujero de F19a en el único archivo que no se había tocado, y **ninguna de las
   dos revisiones de T18 lo vio**.
2. **Dos renglones del mismo producto compartían la key de React** en ese resumen. Lo gritó la
   consola, y recién fue posible cuando el carrito pudo tener dos tamaños de la misma torta.
3. **El editor quedaba cerrado** al apretar "Editar" sobre una torta con tamaños: el estado inicial
   se calculaba cuando el formulario estaba vacío.
4. **La portada decía un precio que no se podía comprar**; ahora dice "Disponible desde".

## 5 · Lo que el review encontró, y está corregido

El reviewer volvió `CHANGES_REQUESTED` con 3 ALTA, y las tres eran la misma cosa: **lo que el panel
avisa, el back no lo validaba**, en la tarjeta cuyo encabezado dice *"acá se verifica que no se lo
pueda esquivar desde el panel"*.

| Qué | Cómo quedó |
|---|---|
| `"NaN"` entraba y el guardado salía **500 con HTML** | `parse_decimal` exige un número **finito** |
| `"1e400"` se guardaba como `Infinity` y `GET /api/products` devolvía **JSON inválido** — la carta, la portada y la ficha en blanco **para todos los visitantes**, con un solo PUT | el mismo arreglo, más un tope de `99.999.999,99` (lo que aguanta la columna) |
| "precio mayor que cero" vivía solo en el front: el back aceptaba `0` y `-9999`, y el pedido salía con **total negativo** | `_precio_de_variante` lo exige, y `0.004` también se rechaza |
| El nombre del tamaño sin tope: entraron 4 MB en un campo que el GET público devuelve | `nombre_para_guardar` con tope 120, como el ingrediente |
| Nombres repetidos y el tope de 12, reglas de un solo lado | las dos también en el back, con comparación normalizada |
| El mismo `id` dos veces movía el id (única ruta donde ADR-029 parte 3 se rompía) | 400 explicado |
| **Los dos bugs del checkout seguían abiertos en `OrdersPage.tsx`**: key de React duplicada y el renglón sin decir el tamaño | arreglados ahí también, con `DetalleDelRenglon` |

Y dos correcciones a este mismo handback, que decía de más: los archivos de test del front son
**15**, no 16, y el build son **408,41 KB**, no 408,21. Los dos números estaban copiados en
`status.md` y en el changelog.

## 6 · Riesgos

- **El editor manda la lista entera** en cada guardado (`"variants" in data` reemplaza). Con los ids
  conservados eso no mueve nada, pero si dos personas editaran el mismo producto a la vez, el último
  gana. Con un solo admin no aplica; queda dicho.
- **El tope de 12 tamaños es del front**: el back no lo valida. Nadie puede pasarlo desde la
  pantalla, pero por API sí.
- **El precio con decimales entra** (`14200.50`), y `formatCurrency` lo muestra. Es lo que ya hacía
  el campo de precio del producto.

## 7 · Próximo paso propuesto

Revisión independiente de esto (R30) ⇒ OK ⇒ commit. Después, de la cola de `status.md`: **F41
(deploy)**, que ahora depende de cargar las credenciales de Cloudinary (B8) y de `ProxyFix` (D25).
