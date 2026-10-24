# T23-F64 · Avisos al admin y a quien compra

**Feature:** F64 (nueva) · **Rama:** `dev` · **Tier (R12):** MEDIO
**Depende de:** nada. **Se puede hacer antes, después o en paralelo** a `T21-F62` y `T22-F63`; si va
después, esas dos tandas heredan los avisos en vez de inventar los suyos.
**Superficie (R27):** N0. No hay endpoint nuevo, ni campo nuevo, ni dato nuevo: es la misma API con
otra pantalla. **No reclasifica.**

> **Propuesta, sin implementar.** Falta el OK.

## Por qué

Lo pidió el humano: *"también faltan avisos para el admin y el usuario (mensajes de se agregó al
carrito, producto subido, etc)"*.

Fui a mirar qué hay hoy, y el diagnóstico es más preciso que "faltan":

| Dónde | Qué hay hoy |
|---|---|
| Panel de admin | **un solo** `aviso` string en `usePanelDeAdmin.ts:46`, dibujado como una barra verde arriba de todo (`AdminPage.tsx:61-62`) |
| Ficha del producto | su propio aviso, pegado al botón |
| Carrito | **nada**: agregar al carrito no dice nada |
| El resto del sitio | nada |

Así que el problema no es la falta de avisos: es que **hay tres mecanismos distintos y ninguno
sirve para el caso más común**. Y el del panel tiene dos defectos concretos:

1. **Es un solo string compartido por todas las pestañas**, así que dos avisos seguidos se pisan y
   el segundo borra el primero.
2. **No se va nunca**: la barra verde queda hasta que la próxima acción la limpie con `setAviso("")`,
   así que un "se guardó" de hace diez minutos sigue en pantalla afirmando algo del pasado.

> **Corregido mientras se escribía esta tarjeta.** La primera versión decía que la barra estaba
> "pintada de verde siempre, salga bien o mal". **Es falso:** el panel manda los errores por otro
> canal (`setError` → `ErrorBanner`, `AdminPage.tsx:60`) y el verde sale solo cuando salió bien.
> Queda escrito porque un MD que afirma un defecto que no existe manda a arreglar lo que ya está
> bien, que es exactamente el ALTA que el reviewer de T19 encontró.

Es el mismo razonamiento de ADR-035 con los pop-ups, textual del humano en su momento: *"si vamos a
usar un pop-up en algún lugar, creo que tendríamos que hacer eso mismo en otros lugares"*.

## Criterios

- **C1 · Un solo mecanismo para los avisos flotantes**, panel incluido: un `AvisosContext` con su
  región de pantalla. Lo que migra es **el éxito compartido del panel**, que es el que se pisa entre
  pestañas y el que no se va nunca.
  > **Corregido el 2026-10-22 (ADR-038, DRIFT de R25).** La primera versión pedía *"un solo
  > mecanismo para todo el sitio… y los tres mecanismos de hoy migrados a él; esta tarjeta no deja
  > un cuarto"*, y se implementó otra cosa: quedaron cuatro mensajes ad-hoc
  > (`OpcionesTab.tsx:59`, `SaboresDelGrupo.tsx:34`, `SelectorDeIngredientes.tsx:37` y el de
  > `ProductPage.tsx`, que no se tocó). **La decisión de dejarlos es la correcta** —son respuestas
  > pegadas a un formulario, y es el mismo razonamiento de C2b—, pero se tomó en silencio y el
  > handback escribió «uno para todo el sitio». Lo encontró el reviewer. El criterio corregido es el
  > de arriba.
- **C2 · Tres tonos:** éxito, error y aviso, cada uno con su color y su ícono. Los cuatro temas
  estacionales ya tienen los tokens (`exito-suave`, `error-suave`, `alerta-suave`), así que no entra
  ningún color nuevo.
- **C2b · El `ErrorBanner` del panel se queda donde está, y es a propósito.** Un error de formulario
  va al lado del formulario, no flotando abajo de la pantalla: migrarlo al sistema nuevo sería
  consistencia a costa de que el error se lea peor. Lo que migra es el **éxito** del panel, que es el
  que se pisa y el que no se va nunca.
- **C3 · El éxito se va solo (~4s); el error NO.** Un error que desaparece es un error perdido: se
  cierra con su X o lo reemplaza el aviso siguiente. Esto no es simetría rota por descuido, es la
  decisión.
- **C4 · Varios avisos a la vez se apilan**, no se pisan: el segundo no borra el primero.
- **C5 · Lo lee un lector de pantalla.** La región es `aria-live="polite"` para éxito y aviso, y
  `assertive` para error. Un aviso que solo existe como color no existe para quien no lo ve, y es
  gratis hacerlo bien ahora.
- **C6 · Los casos que pidió el humano, andando:** "se agregó al carrito" (con el nombre del
  producto), "la foto se subió", "el producto se guardó", "la etiqueta se guardó", y los errores de
  cada uno. **El del carrito es el que hoy no existe** y es el más usado del sitio.
- **C7 · El aviso del carrito dice QUÉ entró.** El nombre del producto, que es lo único que el
  drawer no dice: muestra el carrito entero, no el renglón que acaba de entrar.
  > **Corregido el 2026-10-22 (ADR-037).** La primera versión decía *"dice qué hacer después… el
  > aviso lleva un link"*. El link entró y el review lo midió: dibujado encima de la fila de
  > botones del carrito abierto, se llevaba el **29,7% de «Ayuda»** y el **10,4% de «Ver el carrito
  > completo»** a 390px. Y era redundante, porque `addItem` abre el drawer: cuando el aviso
  > aparece, el camino al carrito ya está en pantalla. El humano eligió sacarlo (opción A del
  > handback); `addItem` no cambia.
- **C8 · La lógica pura, con tests** (ADR-023): la cola de avisos (agregar, descartar, el tope de
  cuántos se ven juntos, el reemplazo) sale a `lib/avisos.ts` y se prueba sin pantalla. **Lo que
  R07 pide del navegador** es que se vean y que se vayan solos, que es lo que ningún test de lógica
  pura puede decir.
- **C9 · R05.** `usePanelDeAdmin.ts` está en **279 líneas** y esta tanda le **saca** el `aviso`.
  > **Corregido el 2026-10-22.** Dos cosas que no pasaron: `usePanelDeAdmin.ts` **subió** a 290
  > (el comentario de por qué el `""` ya no hace nada, que vale lo que ocupa), y `ProductPage.tsx`
  > **no se tocó**: sigue en 274 con su aviso pegado al botón, a propósito (ADR-038). Ninguno pasa
  > de 300. El más alto de la tanda después de las correcciones es `carrito.test.ts`, en 298: es el
  > próximo candidato a partirse en dos.

## Lo que esta tarjeta NO hace

- **No manda mails ni notificaciones push.** "Aviso" acá es en pantalla. Avisarle a Andrea por
  WhatsApp o por mail que entró un pedido es otra cosa, y ya existe en parte (`notifications.py`).
- **No toca los mensajes de error de la API**, que siguen mitad en inglés (D15). Esta tarjeta hace
  que el error **se vea bien**; que esté en castellano es D15 y se arregla donde nace.
- **No agrega un historial de avisos.** Se ven y se van.

## Zona de archivos

```
front/Andres_Bakery/src/lib/avisos.ts                    (nuevo, puro)
front/Andres_Bakery/src/lib/avisos.test.ts               (nuevo)
front/Andres_Bakery/src/contexts/AvisosContext.tsx       (nuevo)
front/Andres_Bakery/src/components/RegionDeAvisos.tsx    (nuevo)
front/Andres_Bakery/src/App.tsx                          (el provider)
front/Andres_Bakery/src/pages/admin/usePanelDeAdmin.ts   (279 -> le sacamos el aviso)
front/Andres_Bakery/src/pages/admin/AdminPage.tsx        (la barra verde se va)
front/Andres_Bakery/src/lib/carrito.ts                   (el texto del aviso de agregar)
front/Andres_Bakery/src/lib/carrito.test.ts              (su test)
```

## Cómo se verifica (R30)

1. **El rojo medido** contra el commit base, con su hash.
2. Las dos suites en verde, lint y build.
3. **Navegador a 1920px y 390px**: agregar al carrito y ver el aviso con el link; guardar un
   producto y verlo; **forzar un error** (guardar algo inválido) y ver que el cartel es **rojo y no
   se va solo**; disparar dos avisos seguidos y ver que **se apilan**. A 390px, que no tape el botón
   de comprar ni desborde (`scrollWidth - clientWidth = 0`).
4. Reviewer independiente que re-ejecuta.
