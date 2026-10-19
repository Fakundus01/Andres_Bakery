# Handback · T4-F19a + T18 · Tortas a pedido

**Fecha:** 2026-10-19 · **Rama:** `dev` · **Versión:** 0.12.0
**Features:** F19 (90%), F57, F58, F59 · **ADR nuevos:** 032 (Cloudinary), 033 (la etiqueta)
**Estado:** implementado, verde, verificado en el navegador y **revisado por dos revisores
independientes que re-ejecutaron** (R30/R31): sus hallazgos están corregidos con su test. **Sin
commitear** (R01): falta el OK humano.

---

## 1 · Lo hecho

| Qué | Dónde |
|---|---|
| El tamaño elegido se cobra; el precio sale de la base y la variante tiene que ser del producto | `services/renglon_del_pedido.py` · migración `0006` |
| Grupos de sabores globales, con unicidad normalizada y sabor único **dentro** del grupo | `services/option_service.py` · `routes/options.py` · migración `0007` |
| El renglón guarda tamaño, sabores, nota y foto **por nombre**, no por FK | `models/pedidos.py` · migración `0008` |
| La personalización solo con la etiqueta `tortas-personalizadas` | `renglon_del_pedido.py::TAG_PERSONALIZABLE` + `lib/carrito.ts` (ADR-033) |
| Las fotos van a Cloudinary o al disco, según el entorno; el back sube **firmado** | `services/almacen_de_imagenes.py` · `services/cloudinary_client.py` (ADR-032) |
| Ruta pública de subida con sus cuatro controles | `routes/uploads.py` · `upload_service.guardar_referencia` |
| Cuota total (cierra **D18**) y barrido de huérfanas (acota **D17**) | `almacen_de_imagenes.py` · modelo `StoredImage` |
| Pestaña "Gustos" en el panel, y el selector de grupos por producto | `admin/OpcionesTab.tsx` · `GrupoDeOpciones.tsx` · `SelectorDeGruposDeOpciones.tsx` |
| La ficha deja elegir, escribir y subir la foto | `pages/producto/Personalizacion.tsx` · `usePersonalizacion.ts` |
| La identidad del renglón del carrito | `lib/carrito.ts` · `contexts/CartContext.tsx` |
| Andrea ve qué le pidieron | `components/DetalleDelRenglon.tsx` · `admin/OrdersTab.tsx` |

**Refactors que entraron por R05, no por gusto:** `models.py` (396 líneas) → paquete
`models/{catalogo,pedidos,sitio,usuarios}.py`; `lib/types.ts` (333) → `lib/types/`;
`order_service.py` → `renglon_del_pedido.py`; `usePanelDeAdmin.ts` → `valoresIniciales.ts` +
`accionesDeOpciones.ts` + `accionesDeIngredientes.ts`; dos archivos de tests partidos en dos.
Ningún import cambió en ninguno de los cuatro casos.

## 2 · Tests (comando + salida)

```
$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
Ran 328 tests in 106.600s
OK                                        (base: 228 · 307 al cerrar la tanda, +21 de la revisión)

$ npm --prefix front/Andres_Bakery run test
Test Files  13 passed (13)
     Tests  135 passed (135)               (base: 90)

$ npm --prefix front/Andres_Bakery run lint
(sin salida = eslint + los dos tsconfig limpios)

$ npm --prefix front/Andres_Bakery run build
dist/assets/index-DVSPgSfs.js   402.71 kB │ gzip: 121.19 kB
dist/assets/index-DCm8meZm.css   34.33 kB │ gzip:   6.98 kB
✓ built in 3.53s                           (base: 381,91 KB)
```

**Rojo medido (R29), rompiendo los controles a propósito:**

```
FAIL: test_la_variante_de_otro_producto_no_compra_la_torta_barata
      AssertionError: ValidationError not raised     <- cobra de menos
ERROR: test_un_sabor_de_un_grupo_que_no_es_del_producto_no_entra
      KeyError en grupos[group_id]                   <- 500, no 400
Ran 17 tests · FAILED (failures=1, errors=1)
```

**Migraciones:** `0006`, `0007`, `0008` probadas para arriba sobre una copia de la base real, para
abajo hasta `0005` **con un grupo, un sabor y un renglón con tamaño/nota/opción sembrados a
propósito** (los 7 pedidos y sus 8 renglones quedaron intactos), otra vez para arriba, y desde base
vacía (8 pasos). Después sobre la base real, con respaldo en
`instance/bakery.db.respaldo-pre-0006`.

**Navegador** (back reiniciado antes, `testing.md` §6): panel → grupo "Relleno" con dos sabores ·
`CHOCOLATE` sobre `chocolate` **no duplicó** · etiqueta creada con el botón y puesta en la torta ⇒
la ficha ofrece tamaño, relleno, textarea y foto, el **box no ofrece nada** · foto subida **sin
sesión** · pedido con `12 porciones` a **$19.800** (no $14.200) con su relleno, su nota y su foto ·
el mensaje de WhatsApp los nombra · `stored_image.provisional = 0` después del pedido · 375 y 390px
con `scrollWidth - clientWidth = 0` en la ficha, el carrito, la carta y el panel.

## 3 · MDs al día

`decisions.md` (ADR-032, ADR-033) · `contracts.md` §5 + `option_groups` en el producto (v0.4.0) ·
`security.md` §1b reescrito con lo medido + §2-N5b nuevo (v0.5.0) · `features.md` (F57/F58/F59
Complete, F19 al 90%) · `status.md` (v0.12.0) · `changelog.md` (0.12.0) · `testing.md` (v0.4.0, dos
lecciones nuevas) · `costs.md` (Cloudinary y el costo que decide un anónimo) · `.env.example` con
las siete variables nuevas.

## 4 · Git

Nada commiteado de esto. El commit anterior del día es `ddaf6f0` (T6-F20, 0.11.2). Lo de hoy son
~45 archivos entre modificados y nuevos; el diff no tiene secretos (se revisó, R17) y
`backend/.env` sigue fuera de git.

## 5 · Costo (R12)

Un solo agente de implementación (esta sesión, modelo alto) y **dos revisores** en paralelo, también
altos, porque R31 los pide cuando R27 activa N1+ y acá se movieron N3 y N5. Sin costo de API de
producto: Cloudinary y la IA siguen apagadas por falta de credenciales.

## 6 · Riesgos, dicho sin maquillaje

1. **Cloudinary nunca se vio andar** (B8): no hay credenciales. Probados están la firma, la decisión
   de destino y la validación de URL; la llamada HTTP real no se ejercita nunca — la misma deuda que
   **D20** tiene con Anthropic.
2. **El espejo de la etiqueta es un string en los dos lados** (**D27**). Si alguien renombra la
   etiqueta desde el panel, el slug cambia y la personalización deja de ofrecerse **sin un error en
   los logs**. Mitigado a medias en el panel; la salida de verdad es exponer el slug en
   `/api/site/delivery`.
3. **Borrar un pedido a mano deja su foto marcada como usada para siempre** y el barrido no la
   levanta. Hoy no hay forma de borrar un pedido desde la app.
4. **El barrido se dispara al subir**, no por reloj: lo provisorio de un mes sin subidas espera. Lo
   acota la cuota.
5. **La cuota cuenta de menos** lo que ya estaba en disco antes del registro `stored_image`.
6. **`D25` pesa más que ayer:** el tope por IP vive en memoria y detrás de un proxy `remote_addr` es
   el proxy. Antes eso afectaba pedidos; ahora también la escritura pública de archivos.

## 7 · La revisión, y qué dejó

Los dos informes están en `review_T18.md` y `security_review_T18.md`. **Ninguno encontró nada
CRÍTICA ni ALTA de seguridad**, y los dos confirmaron los cinco números de arriba. Lo que rompieron
—la cuota que se pasaba 5,7×, los ids de variante que se movían (con un carrito de $14.000 que salió
como pedido de 12 porciones), dos 500 con HTML, y el contador de la nota que prometía de más— está
corregido con su test; el detalle está en `current.md`.

Lo que quedó anotado sin corregir, con su razón: los bytes arbitrarios dentro de un PNG válido
(hace falta `Pillow`, D16/D19), `tag_service` sin normalizar nombres (**D28**), y el criterio B3 de
la tarjeta, que pedía 400 para `variant_id: "8"` y se acepta a propósito.

## 8 · Próximo paso propuesto

Pedir el OK y commitear. Después **`T4-F19b`**, que cierra F19 al 100% y es la que necesitaba
ADR-029 parte 3, ahora sí implementada.
