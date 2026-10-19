# T19-F60 · El pop-up en todas las pestañas del panel

**Rama:** `dev` · **Feature:** F60 (nueva) · **ADR:** 035 · **Versión:** 0.15.0
**Estado:** implementada, **verde en los cuatro comandos**, **vista en el navegador** (1920px y
390px), **revisada** por un reviewer independiente que re-ejecutó y **con sus hallazgos
corregidos**. Lo único que falta para el `done` es el OK y el commit (R01).

> Si esta sesión se corta: el último commit es `3859f33` (D27/D28, 0.14.1) y dejó el árbol limpio.
> Todo lo de esta tarjeta está sin commitear, en `front/Andres_Bakery/src` y en `sdd/`. La base de
> desarrollo **no se tocó**: no hubo cambios de Python ni de esquema.

---

## Lo que pidió el humano

Textual, por voz: *"si vamos a usar un pop-up en algún lugar, creo que tendríamos que hacer eso
mismo en otros lugares. Porque si no queda como en este lugar sí, en este lugar no, queda medio
raro. Así que sí, vamos a tener que utilizarlo en otros sitios"*.

No hubo nada que preguntar (R04): el pedido es exactamente el "queda para después" que ADR-034 había
dejado escrito.

## Lo que apareció al abrirlo, y no estaba pedido

**"Eliminar" borraba un producto de una, y "Borrar" una etiqueta también.** Sin preguntar nada, con
el botón pegado al de editar. Los grupos y los ingredientes sí preguntaban, cada uno con su texto
escrito a mano, así que el panel confirmaba donde el daño era chico y no donde era grande.

Entró en esta tarjeta porque el pop-up es la herramienta justa: un `<dialog>` atrapa el foco, así
que el Enter siguiente cae en un botón del cartel y no en lo que había atrás. Quedó en **ADR-035**
parte 2, y es lo más importante del ciclo.

## Base medida antes de empezar

| Check | Base @ `3859f33` | Después |
|---|---|---|
| Tests del front | 166 OK (15 archivos) | **176 OK** (16) |
| Tests del back | 343 OK | **343 OK** (no se tocó Python) |
| Build | 411,39 KB | **419,67 KB** |
| Último ADR | 034 | **035** |
| Archivos > 300 líneas | ninguno | **ninguno** |

## El rojo, medido (R29)

La primera versión de `lib/borrados.ts` interpolaba el número sin mirarlo —lo mismo que ya estaba
escrito a mano en los dos componentes— y los tests la rompieron en **6 casos**: "de los 1
productos", "de los 0 productos", "de los -1 productos", la etiqueta tratada en masculino, el
singular que no existía y `Está en 0 productos`. La salida literal está en
[`handback_T19.md`](handback_T19.md).

## El navegador, medido (R07)

El humano habilitó levantar el front; se levantó para esto y **se apagó al terminar**. Y antes de
levantarlo apareció algo que conviene anotar: **había tres servidores de Vite vivos** (5173 del
turno de la mañana, que seguía respondiendo, y dos que se lanzaron ahora). Quedó uno, se usó, y al
final ninguno.

| Criterio | Medido |
|---|---|
| C1 · pop-up en computadora (1920px) | abren con sus datos: etiqueta nueva, grupo nuevo, editor del grupo, las tres secciones del perfil y el texto institucional. Escape cierra. El botón del pie manda el formulario por `form="formulario-de-etiqueta"` / `"-de-grupo"` / `"-de-producto"` |
| C2 · nada de formularios en pop-up a 390px | el de etiqueta y el de producto quedan en la página; el editor del grupo se abre **dentro** de la tarjeta (el botón pasa a "Cerrar"); el perfil muestra sus tres secciones con sus 14 campos. `dialog[open] = 0` en las cuatro pestañas |
| C3 · borrar pregunta | *"¿Borrar «Por encargo»?"* y *"¿Borrar «Cheesecake de Frutos Rojos»?"*. Se cerró con Escape y con "No, dejarlo como está": **las 4 etiquetas y los 5 productos siguen ahí** |
| C4 · la frase bien escrita | *"Si la borrás sale **del producto que la tiene** y de los filtros de la carta"* — singular y femenino, en vivo |
| C5 · el cartel sí aparece a 390px | sí, 342 px de ancho, y `scrollWidth - clientWidth = 0` |
| C7 · R05 | ningún archivo > 300 líneas |

## Y de paso, lo que el humano vio que faltaba: el grupo del bizcochuelo

No era una falta del código: **era data**. La base de desarrollo tenía un solo grupo («Relleno»).
Se cargó desde el panel nuevo, que es la mejor prueba de que funciona:

- **«Bizcocho»** (nuevo, obligatorio) con **Chocolate** y **Vainilla**.
- **«Relleno»** ganó **Crema**, y el sabor que estaba escrito `chocolate` en minúscula pasó a
  **Chocolate** probando el renombrado dentro del pop-up.
- Los dos grupos quedaron marcados en «Cheesecake de Frutos Rojos».
- **La ficha pública pide los dos**: "Falta elegir: Relleno, Bizcocho", y con *Crema* + *Vainilla*
  elegidos el botón "Agregar 1" se habilita. Los tamaños siguen en $14.200 / $19.800.

Los sabores son de ejemplo y los define la chef; lo que importa es que la pantalla los soporta.

## La revisión independiente (R30), y lo que encontró

`CHANGES_REQUESTED`, **16 hallazgos**: 1 ALTA, 7 MEDIA, 8 BAJA. El detalle está en
[`review_T19.md`](review_T19.md) y la tabla de arreglos en [`handback_T19.md`](handback_T19.md).
Lo que importa de la tanda aguantó —verificó 10 sospechas que estaban bien, entre ellas que no hay
fuga de estado entre grupos y que confirmar dos veces no borra dos veces— y lo que rompió fue de
teclado y de abandono:

- **El ALTA no era de código:** este `current.md` decía en su encabezado "sin ver en el navegador"
  mientras su cuerpo tenía la sección "El navegador, medido", y el handback lo decía tres veces.
  Documentación que manda a repetir trabajo hecho. Corregido.
- **Escape adentro del editor cerraba el pop-up entero** en vez de cancelar el renombre.
- **No había forma de abandonar un nombre tipeado**: el `onBlur` lo guardaba al cerrar y la X de
  cancelar se había perdido en el refactor.
- **Si el guardado fallaba, el pop-up se cerraba igual** y lo tipeado se perdía.
- **"Cerrar" no cancelaba** en perfil ni en historia.
- `textoDeUso` decía "No **lo** usa ningún producto" **también para las etiquetas**.

Los 7 MEDIA y 5 BAJA están corregidos, con **3 tests nuevos** (front: 176 → **179**).

## Lo que falta para el `done`

**El OK y el commit** (R01).

> Para entrar al panel se creó un admin temporal (`qa-popups@local.test`) y **se borró al
> terminar**: la cuenta y la clave de Andrea no se tocaron. Quedan como admin solo `admin@local.test`.
