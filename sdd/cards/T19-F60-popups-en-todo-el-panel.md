# T19-F60 · El pop-up en todas las pestañas del panel

**Feature:** F60 (nueva) · **Rama:** `dev` · **Tier (R12):** MEDIO
**Depende de:** `T4-F19b` (ADR-034 dejó el `Modal` hecho y usado en una sola pestaña).
**Superficie (R27):** N1 (panel admin). No toca plata, ni rutas públicas, ni archivos. **No
reclasifica**: no hay endpoint nuevo ni campo nuevo; es la misma API con otra pantalla.

> **Implementada el 2026-10-19.**

## Por qué

Lo pidió el humano, textual: *"si vamos a usar un pop-up en algún lugar, creo que tendríamos que
hacer eso mismo en otros lugares. Porque si no queda como en este lugar sí, en este lugar no, queda
medio raro"*.

Y tiene razón de a dos. ADR-034 dejó el panel partido: la carta se editaba en un pop-up y las
etiquetas, los gustos y el perfil se editaban en la página, cada uno con su forma. Un panel donde
"editar" significa tres cosas distintas según la pestaña se aprende tres veces.

## Lo que apareció mirando el código, y es lo más importante de la tarjeta

**"Eliminar" borraba un producto de una, sin preguntar nada.** Lo mismo "Borrar" en una etiqueta.
El botón está **al lado** del de editar, y lo que se borra no vuelve. Los grupos y los ingredientes
sí preguntaban —cada uno con su propio texto escrito a mano— así que el panel tenía las dos cosas:
confirmación donde el daño era chico y borrado inmediato donde era grande.

No estaba en ningún criterio de ninguna tarjeta. Entra acá porque el pop-up es exactamente la
herramienta: un `<dialog>` atrapa el foco, así que el Enter siguiente cae en un botón del cartel y
no en lo que había atrás.

## Zona de archivos

```
front/Andres_Bakery/src/lib/borrados.ts                      (nuevo, puro, con tests)
front/Andres_Bakery/src/lib/borrados.test.ts                 (nuevo)
front/Andres_Bakery/src/components/ConfirmarBorrado.tsx      (nuevo)
front/Andres_Bakery/src/pages/admin/FormularioDeEtiqueta.tsx (nuevo)
front/Andres_Bakery/src/pages/admin/ListaDeEtiquetas.tsx     (nuevo)
front/Andres_Bakery/src/pages/admin/FormularioDeGrupo.tsx    (nuevo)
front/Andres_Bakery/src/pages/admin/EditorDeGrupo.tsx        (nuevo)
front/Andres_Bakery/src/pages/admin/TarjetaDeGrupo.tsx       (nuevo)
front/Andres_Bakery/src/pages/admin/PerfilFicha.tsx          (nuevo)
front/Andres_Bakery/src/pages/admin/PerfilRedes.tsx          (nuevo)
front/Andres_Bakery/src/pages/admin/PerfilCvForm.tsx         (nuevo)
front/Andres_Bakery/src/pages/admin/GrupoDeOpciones.tsx      (BORRADO: se partió en dos)
front/Andres_Bakery/src/pages/admin/{TagsTab,OpcionesTab,PerfilTab,StoryTab}.tsx  (orquestadores)
front/Andres_Bakery/src/pages/admin/{ProductsTab,ListaDeProductos}.tsx            (confirmación)
front/Andres_Bakery/src/pages/admin/AdministrarIngredientes.tsx                   (usa lib/borrados)
front/Andres_Bakery/src/pages/admin/AdminPage.tsx                                 (pasa productos)
```

## Criterios

| # | Criterio | Cómo se verifica |
|---|---|---|
| C1 | En computadora, **crear y editar** una etiqueta, un grupo, el perfil y la historia abren un pop-up | navegador a 1920px |
| C2 | En celular **nada abre un pop-up de formulario**: todo sigue en la página (ADR-034) | navegador a 390px |
| C3 | Borrar un producto, una etiqueta o un grupo **pregunta antes**, nombrando lo que se borra | navegador |
| C4 | El cartel dice en cuántos productos está lo que se borra, bien escrito en singular y plural | Vitest sobre `lib/borrados.ts` |
| C5 | El cartel de borrado **también** aparece en celular: no se escribe nada ahí | navegador a 390px |
| C6 | Un sabor se sigue borrando sin preguntar, **a propósito** | está escrito en el código y acá |
| C7 | Ningún archivo pasa las 300 líneas (R05) | `wc -l` |

## Lo que NO entra, dicho para no prometerlo

- **El pop-up de los ingredientes.** Se editan **adentro** del formulario del producto, que en
  computadora ya es un pop-up. Un pop-up adentro de otro es peor que lo que arregla, así que ahí la
  confirmación sigue siendo en la propia fila. Lo que sí se unificó es el texto.
- **Borrar un sabor** sigue sin preguntar: es una palabra que se vuelve a escribir en dos segundos,
  y el pop-up caería adentro del pop-up del grupo.
- **La pestaña de pedidos.** Cambiar un estado es un `<select>`, no un formulario: no hay nada que
  abrir. Si algún día hay una ficha de pedido, ahí sí.
- **El guardado del perfil sigue siendo uno solo** (un PUT con todo). Las tres secciones se editan
  por separado, pero el botón dice "Guardar mi perfil" en los tres pop-ups porque guardar uno guarda
  los tres.
