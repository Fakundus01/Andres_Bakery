# changelog.md · Andres Bakery

Semver `MAJOR.MINOR.PATCH` (R13). No se borra nada: lo viejo queda.

---

## [0.14.1] · 2026-10-19 · La etiqueta que habilita deja de ser un string copiado

Dos deudas que dejaron las revisiones, las dos de la misma cosa: la etiqueta
«tortas personalizadas», que es lo que habilita elegir sabores y mandar una foto (ADR-033). Juntas
cerraban el peor síntoma posible — *"le puse la etiqueta y no pasa nada"*, sin un error en ningún
log.

**D27 · El slug lo dice el back.** Estaba escrito en los dos lados (`renglon_del_pedido.py` y
`lib/carrito.ts`): cambiarlo de uno dejaba de ofrecer la personalización en silencio. Ahora
`GET /api/site/delivery` devuelve `personalization_tag` y el front lo pregunta; la constante del
front queda como **red** para mientras la config no cargó, no como fuente de verdad.

**D28 · Las etiquetas comparan normalizado.** `tag_service` comparaba el nombre **exacto**, así que
"Tortas Personalizadas" sobre "tortas personalizadas" entraba como una segunda etiqueta que se ve
igual en la lista — y solo una habilita, porque lo que manda es el slug y `unique_slug` desempata
con sufijo (`tortas-personalizadas-2`). Era el único de los tres catálogos sin normalizar: los
ingredientes lo cerraron en ADR-030 y los grupos de opciones lo heredaron en F57. Ahora la etiqueta
también, con su tope de largo.

**Lo que esto NO cierra, y queda dicho:** la unicidad de la etiqueta se decide con un barrido en
Python, no con una columna normalizada e índice único como los ingredientes. Son diez etiquetas y no
se nota, pero **no aguanta concurrencia**: dos altas simultáneas con la misma grafía pasan las dos.
El día que sean cientos, es la migración de ADR-030 otra vez.

- Tests: back **343 OK** (eran 339; 4 nuevos de la etiqueta), front 166 OK. Lint y build limpios.
- Medido contra la app: `personalization_tag = "tortas-personalizadas"` en la config, y el alta de
  «Tortas Personalizadas» sobre la que existe devuelve **400** con el nombre de la que ya está.
- **Sin verificar en el navegador**: el servidor del front lo paró el sistema por falta de memoria
  mientras esperaba, y no lo levanté de nuevo por mi cuenta. Lo que falta mirar es la ficha y el
  panel tomando el slug de la config, que es un cambio de dos líneas y está cubierto por tipos.

---

## [0.14.0] · 2026-10-19 · El panel edita en pop-up y usa toda la pantalla

**Pedido del humano, por dictado:** que editar desde el panel *"sea muy fácil y que no se quede
ahí"*, con pop-ups en vistas de computadora —*"obviamente en celular podemos dejarlo así"*— y que
la app *"use la pantalla completa, porque vi que no la utiliza y queda un poco raro"*. Queda en
**ADR-034**.

**El formulario del producto se edita en un pop-up, solo en pantallas grandes.** En celular se
queda en la página: un formulario largo adentro de un pop-up, con el teclado virtual tapando media
pantalla, es peor que sin pop-up. Lo decide un hook que **escucha** los cambios de tamaño, así que
acomodar la ventana cambia la estructura en el momento y no recién al recargar.

**Es un `<dialog>` nativo, no un `<div>` flotante.** El navegador ya sabe atrapar el foco adentro,
cerrar con Escape, hacer inerte el resto de la página y devolver el foco al botón que lo abrió:
escribir eso a mano es lo que funciona con el mouse y deja afuera a quien usa teclado o lector de
pantalla. Los botones de guardar viven en un **pie fijo**, fuera del área que scrollea, y mandan el
formulario con `button[form=...]` — HTML de siempre, sin duplicar estado.

**El ancho.** El panel pasa a usar **todo** el ancho, porque es un espacio de trabajo: una grilla de
productos, gráficos, un formulario largo. El sitio público sigue acotado pero más holgado
(1280 → 1408 → 1664 según la pantalla), y **no se le saca el tope a propósito**: una línea de texto
de 2000 px no se lee, y la carta es para leer. Medido en 1920: el sitio pasó de 1280 a 1664, el
panel a 1905.

**Lo que esto obligó a mover:** `ProductsTab` pasaba las 300 líneas con el pop-up adentro (R05), así
que el formulario salió a `FormularioDeProducto.tsx` y la pestaña quedó como orquestador. **El mismo
componente se renderiza en los dos lugares**, que es lo que evita que la versión de celular y la de
computadora se vayan separando con el tiempo.

### Lo que el review de `T4-F19b` rompió, y entró en este mismo ciclo

El reviewer volvió `CHANGES_REQUESTED` con 3 ALTA, y las tres eran lo mismo: **lo que el panel
avisa, el back no lo validaba** — en la tarjeta cuyo encabezado dice *"acá se verifica que no se lo
pueda esquivar desde el panel"*.

- **`"1e400"` dejaba la web en blanco para todos.** Entraba como precio, el serializer lo pasaba a
  `float` —`inf`— y `GET /api/products` devolvía `"price":Infinity`, que **no es JSON válido**: la
  carta, la portada y la ficha quedaban vacías para cualquier visitante, con un solo guardado del
  panel y sin un error en los logs. `"NaN"` era la otra cara: 500 con HTML.
- **"El precio tiene que ser mayor que cero" vivía solo en la pantalla.** Por API entraba `-9999` y
  el pedido salía con **total negativo**; `0.004` pasaba el filtro del front, que mostraba "$ 0".
- **El nombre del tamaño no tenía tope**: 4 MB en un campo que el `GET` público devuelve, el mismo
  agujero que ADR-030 cerró para los ingredientes.

Ahora `parse_decimal` exige un número **finito** y dentro de lo que aguanta la columna, el precio de
un tamaño tiene que ser mayor que cero, el nombre tiene tope, y los nombres repetidos, el tope de 12
y el mismo id dos veces también los frena el back. **Y los dos bugs del checkout seguían abiertos en
"mis pedidos"** —la key de React duplicada y el renglón que no decía el tamaño—: arreglados ahí
también.

### Verificación

- Tests: back **339 OK**, front **166 OK**. Lint limpio. Build 411,39 KB JS · 34,97 KB CSS.
- **Navegador, 1920px:** el panel usa 1905 y el sitio 1664 (antes 1280) · "Nuevo producto" abre el
  pop-up · Escape lo cierra · "Editar" lo abre **con los datos cargados**, tamaños incluidos ·
  guardar desde el pie funciona, cierra el pop-up, avisa, y **los ids de los tamaños no se mueven** ·
  el scroll del fondo se bloquea y se devuelve al cerrar.
- **390px:** sin pop-up, formulario en la página, cero desborde. Es lo que se pidió.
- La base de desarrollo quedó como estaba (el aviso de preparación que toqué para probar, restaurado).

---

## [0.13.0] · 2026-10-19 · Los tamaños se cargan desde el panel, y F19 cierra

**Lo último que le faltaba a F19 desde T3.** El modelo, la API y el selector de la ficha estaban
desde el primer día; los tamaños se cargaban por API o a mano en la base. Ahora Andrea los carga,
los renombra, les cambia el precio, los reordena y los borra desde el formulario del producto.

**El editor viene cerrado hasta que se pida**, porque la mayoría de la carta se vende por unidad: el
formulario no crece para los veinte productos por culpa de los dos que tienen tamaños.

**Y dice lo que va a pasar antes de que pase**, que es la mitad del trabajo:

- *"Con tamaños cargados, el precio que se cobra sale del tamaño elegido y no del precio de
  arriba"* — porque el campo "Precio de una unidad" sigue ahí arriba con su número, y nada lo decía.
- *"Al guardar se borra «20 porciones», y quien lo tenga en el carrito va a tener que elegir de
  nuevo"* — con el nombre del tamaño que se va.
- Y si se borran todos: *"vuelve a venderse al precio de arriba"*.

**Un tamaño borrado ahora se explica distinto** (C5): el carrito de quien lo tenía recibe *"ese
tamaño ya no está disponible, abrí el producto y elegí uno de los que hay"* en vez del genérico
"no es de este producto". Los dos casos son 400, pero uno es un carrito viejo y el otro un ataque,
y el mensaje ya no los confunde. Los ids de variante son públicos —`GET /api/products` los
devuelve—, así que distinguirlos no cuenta nada que no se sepa.

### Dos bugs que salieron de mirar el navegador, y los dos importan

- **El resumen del checkout cobraba el precio base.** Una torta de 20 porciones de $28.000 aparecía
  en $14.200 en el renglón, con el total correcto al lado: la pantalla anterior a confirmar el
  pedido, mostrando dos números que no cierran. Era el mismo agujero de F19a en el único archivo
  que no se había tocado (`ResumenDelPedido.tsx`), y ninguna de las dos revisiones lo había visto.
- **Dos renglones del mismo producto compartían la key de React** en ese resumen, con su error en
  la consola: con keys repetidas React puede duplicar u omitir filas. Apareció recién cuando el
  carrito tuvo dos tamaños de la misma torta, que es lo que esta tanda hace posible.

Y uno más chico, también del navegador: **el editor quedaba cerrado al apretar "Editar"** sobre una
torta que ya tenía tamaños, porque su estado inicial se calculaba cuando el formulario estaba vacío.

**La portada también decía un precio que no se podía comprar**: ahora dice "Disponible desde".

### Verificación

- Tests: back **330 OK**, front **166 OK** (eran 328 y 135). Lint y build limpios (411,39 KB JS).
- **Navegador, de punta a punta:** tamaño nuevo cargado desde el panel ⇒ **los ids de los que ya
  estaban no se movieron** (1 y 2 antes, 1, 2 y 3 después) ⇒ comprado sin sesión a **$28.000** ⇒ el
  pedido y el mensaje de WhatsApp lo nombran ⇒ borrado desde el panel, con su aviso, y los ids
  siguen intactos. 375px y 390px con el editor abierto y tres filas: `scrollWidth - clientWidth = 0`.
- La base de desarrollo quedó como estaba: 7 pedidos, la torta con sus dos tamaños originales.

---

## [0.12.0] · 2026-10-19 · Tortas a pedido: la chef pone los gustos, el cliente arma la suya

**El selector de tamaño dejó de ser decorativo.** Cambiaba el número en pantalla y el pedido se
cobraba al precio base: el cliente veía $19.800 y Andrea cobraba $14.200. Era plata que ella perdía
en cada torta grande vendida. Ahora el renglón manda `variant_id`, **el precio sale de la base** y
el servidor verifica que la variante sea de ese producto —si no, mandar el `variant_id` del alfajor
compraría la torta grande a ese precio—. El pedido guarda el **nombre** del tamaño, no una FK:
`Product.variants` tiene `delete-orphan` y guardar el producto desde el panel borra las filas
viejas (ADR-029). Cierra el DRIFT que se levantó al abrir T4.

**La chef define los gustos y el cliente elige de esa lista.** Pestaña nueva en el panel: grupos
("Bizcocho", "Relleno") con sus sabores, globales y reusables como las etiquetas y los ingredientes,
y en cada producto se marca cuáles aplican. El cliente elige, escribe cómo la quiere en un texto
libre y puede subir una foto de referencia. **Los sabores se eligen, no se escriben**: si se
pudieran escribir, el pedido sería una carta de deseos y ella no podría cumplirlo (ADR-031).

**Solo para las tortas, y eso lo decide una etiqueta.** Lo pidió el humano a mitad del ciclo: una
docena de cookies no se personaliza. La puerta es la etiqueta `tortas personalizadas` y **no** la
presencia de grupos, porque si fuera por los grupos, asignarle "Relleno" por error a las cookies las
sacaría de la venta (ADR-033). El panel dice qué etiqueta hace falta, la crea con un botón y avisa
en el formulario del producto cuando falta.

**Las fotos se van a Cloudinary, y el back es el único que escribe ahí** (ADR-032). Una capa de
almacenamiento con dos destinos: con las credenciales en el `.env` sube a Cloudinary, sin ellas al
disco local, que es lo que pasa hoy en desarrollo. El navegador **nunca** habla con Cloudinary: un
preset `unsigned` habría sido más simple y es una puerta pública de escritura a su cuenta. Sin
dependencia nueva: `urllib` y un SHA-1, el mismo camino que ya usa Mercado Pago.

### Lo que esto obligó a pagar, y es la mitad del trabajo

**F59 convierte N5 en escritura pública de archivos** (`security.md` §1b), y los cuatro controles
entraron completos: ruta separada de la de admin (no el `@admin_required` sacado), tope por IP
(4/min, 15/hora con `Retry-After`), tamaño más chico que el del panel —y que **nunca** puede quedar
más permisivo que él—, y cuota total, que **cierra D18** con un 507 explicado.

**D17 se cierra para estas fotos.** El cliente sube la foto **antes** de que el pedido exista: si
abandona el carrito —lo más común en una tienda— esa foto quedaba para siempre, subida por un
anónimo. Ahora nace provisoria, se vuelve del pedido cuando un pedido la usa, y lo provisorio
vencido se borra del destino y del registro. **Lo usado no se toca nunca**: hay un test de cada
cosa.

**La URL de la foto que acepta el pedido es solo una que emitimos nosotros**: la forma de nuestros
nombres, la fila en el registro y, en disco, el archivo existiendo. Una URL externa, un `../`, otra
extensión o un hex inventado son 400. Sin eso, el renglón del pedido es un lugar donde pegar un link
a cualquier cosa y el panel de Andrea lo muestra con su firma.

### Lo que apareció construyendo

- **El rojo se midió rompiendo los dos controles a propósito** (R29): sin la verificación de la
  variante, el test que compra con el `variant_id` ajeno pasa y **cobra de menos**; sin la de las
  opciones, el pedido con el sabor de otro producto **revienta con un 500**, que es la clase de bug
  con la que arranca `saneado.py`. Los dos quedaron en verde con el control puesto.
- **`models.py` pasó las 300 líneas** al entrar los grupos (R05) y se partió en paquete
  —`catalogo`, `pedidos`, `sitio`, `usuarios`— con un `__init__` que mantiene la puerta: ningún
  import del back cambió. Lo mismo con `lib/types.ts` en el front, y `order_service.py` dejó el
  armado del renglón en `renglon_del_pedido.py`.
- **La tarjeta de un producto que se arma ya no dice "Agregar"**, dice "Elegir y pedir" y lleva a la
  ficha: agregarlo desde la tarjeta mandaría un pedido que el servidor rechaza, y con razón.
- **El asistente de IA iba a romperse con Cloudinary prendido.** Leía la foto del disco a mano, así
  que una foto en Cloudinary le habría hecho decir "primero subí la foto" sobre una foto que estaba
  subida. Ahora la lee el almacén, que es el único que sabe dónde vive cada cosa.
- **`normalizar_nombre` se usa en tres lugares** y el nombre que se guarda salió a `saneado`: los
  grupos y los sabores tienen la misma unicidad normalizada que los ingredientes (ADR-030), así que
  "CHOCOLATE" sobre "chocolate" devuelve el que estaba en vez de duplicar. Medido en el navegador.

### Lo que encontraron las dos revisiones, y se corrigió antes del commit

Dos revisores que **re-ejecutaron** (R30): el funcional y el de seguridad + pentester. Ninguno
encontró nada CRÍTICA ni ALTA del lado de seguridad —22 formas de `variant_id` y ninguna pagó de
menos; 33 payloads contra la URL de la foto y solo entraron las nuestras—, pero entre los dos
rompieron tres cosas de fondo:

- **La cuota se pasaba 5,7×.** Medía la suma y después escribía: seis subidas simultáneas por la
  ruta **pública** veían las seis la misma suma vieja y entraban las seis. Era, en otro archivo, el
  mismo `check-then-insert` que ADR-030 ya había tenido que cerrar para la unicidad del ingrediente.
  Ahora la fila se reserva primero y la suma se verifica después, con un candado que lo hace exacto
  en un proceso; hay test con hilos y barrera. Y **cada puerta tiene su techo**: el anónimo ya no
  puede llenar el lugar de las fotos de la carta y dejar a Andrea con un 507.
- **Los ids de las variantes se movían en cada guardado.** ADR-029 parte 3 estaba escrita como
  decisión tomada y no estaba en el código: guardar un producto reemplazaba la lista entera, los
  ids cambiaban, y el carrito de quien estaba comprando recibía un 400 en el checkout. Peor: SQLite
  reusa los rowid, así que un id viejo podía caer sobre **otra** variante y cobrar un tamaño por
  otro —un carrito que decía $14.000 salió como pedido de 12 porciones—. Ahora las filas se
  actualizan en lugar de reemplazarse, y el carrito manda además el **nombre** del tamaño como
  testigo: si no coincide, el servidor lo corta y pide elegir de nuevo en vez de cobrar otra cosa.
- **Dos 500 con HTML en una API JSON**, que es la clase de bug con la que arranca `saneado.py`: un
  nombre cuyo normalizado quedaba vacío (marcas combinantes sueltas) rompía el rescate del
  `IntegrityError` en los grupos **y en los ingredientes**, y un body que no es objeto (`[1,2,3]`,
  `"x"`, `5`) reventaba en la ruta pública de pedido —este venía de antes de esta tanda—.

Y una que salió del test del arreglo: `normalizar_nombre` no recortaba las puntas, así que un
nombre hecho de dos marcas y un espacio normalizaba a `" "` en vez de a vacío. **Era otra
divergencia con el front**, que hace `trim()`: el espejo que ADR-030 dice sostener. Lo mismo con un
texto de solo espacios y saltos, que se guardaba como `"·"` y el panel mostraba `Nota: ·`.

Lo demás que corrigieron: el contador de la nota ahora cuenta lo que el servidor va a medir (cada
salto viaja como `" · "` y ocupaba tres, así que se perdían hasta 198 caracteres sin aviso), la
tarjeta de la carta dice **"desde $X"** cuando el producto solo se vende por tamaños, el carrito
ofrece **"Cambiar lo elegido"** para salir de los tres callejones sin salida que encontró el
reviewer (la foto barrida a las 24 h es el probable), el 413 de la ruta pública nombra **su** tope y
no el de la otra, el panel **nombra la etiqueta parecida** cuando hay una que se llama igual pero no
habilita, y se fue un `SAWarning` de autoflush que entraba en cada pedido.

Lo que las revisiones dejaron **anotado y no corregido**, con su razón: un anónimo puede guardar
bytes arbitrarios dentro de un PNG válido (la salida es reencodear los píxeles, que es el precio de
no tener `Pillow`, D16/D19), `tag_service` sigue comparando el nombre exacto y no el normalizado
(**D28**), y el criterio B3 de la tarjeta pedía 400 para `variant_id: "8"` — se acepta a propósito,
porque un `"8"` que llega de un `<select>` es un error honesto del front y no un ataque.

### Verificación

- Tests: back **328 OK** (eran 228 al abrir el día; 307 al cerrar la tanda y 21 más de las correcciones de la revisión), front **135 OK** (eran 90). Lint y build limpios (402,71 KB JS).
- Migraciones **`0006`, `0007` y `0008`**: probadas para arriba sobre una copia de la base real,
  para abajo hasta `0005` con datos sembrados a propósito (un grupo, un sabor, un renglón con
  tamaño, nota y opción) —los 7 pedidos y sus 8 renglones quedaron intactos—, otra vez para arriba,
  y desde una base vacía. Después, sobre la base real, con respaldo previo.
- **Navegador, sin sesión:** grupo "Relleno" creado desde el panel con dos sabores, `CHOCOLATE`
  sobre `chocolate` **no duplicó**, la etiqueta creada con el botón, puesta en la torta ⇒ la ficha
  ofrece tamaño, relleno, texto y foto; el box **no ofrece nada**; la foto subió sin sesión; el
  pedido llegó con `12 porciones` a **$19.800** (no $14.200), su relleno, su nota y su foto, y el
  mensaje de WhatsApp los nombra. 375px y 390px con `scrollWidth - clientWidth = 0` en la ficha, el
  carrito, la carta y el panel.
- La base de desarrollo quedó como estaba: los dos pedidos de prueba y la foto de prueba se
  borraron. Quedan a propósito el grupo "Relleno", sus sabores y la etiqueta, que son datos útiles.

---

## [0.11.2] · 2026-10-19 · Lo que el reviewer rompió, y lo que me hizo corregir

La revisión de `T6-F20b` volvió **CHANGES_REQUESTED** con nueve hallazgos. Tres eran de fondo.

**La unicidad no vivía en el back: vivía en una mirada.** El título de la tarjeta anterior era mentira. Era un `check-then-insert` sin ninguna restricción que lo respaldara, porque el `unique` de la base es por nombre **exacto** — la que justamente no alcanza. El reviewer lo rompió con 8 hilos y una barrera: **3 filas** (`COCO rallado`, `Coco rallado`, `Coco Rallado`). Y con la grafía idéntica, un **500 con HTML** en una API JSON, porque `json_endpoint` solo atrapa `ServiceError`. Ahora hay una columna `normalized_name` con índice único (migración `0005`) y el servicio traduce el `IntegrityError` a la misma respuesta que si lo hubiera visto venir. **El modelo deriva el normalizado solo**, al asignar el nombre: así ningún camino —un test, una migración, un arreglo a mano— puede dejar una fila inconsistente.

**El tope sí recortaba en silencio**, contra lo que la ADR prometía. `saneado.texto` recorta **antes** de que midiéramos: 5.000 caracteres con invisibles entraban como una fila de 61, con un 201 y sin aviso.

**Las dos normalizaciones no espejaban:** 11 divergencias de 56 casos medidos (saltos de línea, ``, ``, ``, y las marcas combinantes del árabe, el hebreo y el devanagari). Decía que espejaban en tres lugares distintos. Ahora las dos usan **propiedades Unicode** en vez de rangos escritos a mano, y el espejo se sostiene.

### Y una corrección a algo que habíamos escrito mal

La ADR, la tarjeta y esta changelog decían que una fila de 4 MB **"se la descarga cada visitante"**. **No es cierto**: el endpoint no pide auth, pero la única pantalla que lo llama es el panel. Se había repetido del informe de seguridad sin comprobarlo.

### Lo demás

- Borrar un ingrediente mientras se editaba un producto dejaba su id muerto en el formulario: al guardar salía `one or more ingredients do not exist`, en inglés.
- `contracts.md` seguía describiendo la versión anterior del endpoint.
- **`lib/api.ts` pasó las 300 líneas** (R05) y se partió en `api/{cliente,catalogo,pedidos,sitio}.ts` con un `index.ts` que mantiene la puerta: ningún import cambió.

- Tests: back **228 OK** (eran 213 al abrir la tanda), front **90 OK**. Lint y build limpios.
- Migración `0005` probada para arriba y para abajo sobre una copia de la base real, **con dos filas que normalizan igual sembradas a propósito**: ninguna se pierde, la segunda queda con sufijo y avisa por log.

---

## [0.11.1] · 2026-10-19 · La unicidad se muda a donde está la restricción

**El duplicado ya no entra.** El panel comparaba nombres normalizados y el back, exactos: con la lista del panel vieja, "coco rallado" sobre "Coco rallado" creaba la segunda fila. Ahora lo decide `ingredient_service`, y **pedir uno que ya existe devuelve 200 con el que estaba**, no un error: desde el panel, agregar uno que ya está es la misma intención que marcarlo (ADR-030). El nombre que gana es el que ella escribió primero.

**`ingredient_service` tiene tests por primera vez: 11.** No tenía ninguno desde T3.

**Se puede corregir un tipeo y borrar lo que sobra.** Antes el panel sabía crear ingredientes globales y nada más: un "Chocolte" quedaba publicado en la ficha y en el dorso de la tarjeta para siempre. El `PUT` y el `DELETE` existían en el back desde T3, sin usar. Antes de borrar, la pantalla dice en cuántos productos está, porque borrarlo lo saca de todos.

**Y los 4 MB.** `create` y `update` no limitaban el largo de nada, y SQLite no hace cumplir el `String(120)` del modelo: entraron 4.000.000 de caracteres en un `name`. Ahora es un **400 explicado**, no un recorte en silencio: el nombre es lo que ella lee en la lista, y cortarlo sin avisar sería renombrarle el ingrediente a sus espaldas.

### Lo que apareció probando en el navegador, y los tests no habrían visto

- **El panel mostraba un nombre que no era el guardado.** Con el 200, el front se quedaba con lo tipeado ("coco rallado") mientras la base decía "Coco rallado", hasta que alguien recargara. El `POST` ahora devuelve `{id, name}`.
- **«Si lo borrás sale de los 1 productos».** El renglón que se lee justo antes de algo que no se deshace, mal escrito.
- **El servidor estaba corriendo código viejo** y la primera prueba no medía lo que decía medir: Flask no recarga solo desde que `debug` se apagó en la review de T7. Queda anotado en `testing.md`.

- Tests: back **224 OK** (eran 213), front **90 OK**. Lint y typecheck limpios.
- Build: 381,91 KB JS · 33,99 KB CSS.
- Sin migración.

---

## [0.11.0] · 2026-10-18 · Los ingredientes dejan de ser para copiar

> **F20 cierra con `T6-F20b`** (abajo, 2026-10-19). Esta entrada llegó a decir que cerraba sola: las dos revisiones y una prueba en el navegador mostraron que la promesa central —que no entren duplicados— no se cumplía con la lista del panel vieja.

**La pantalla que faltaba desde T3.** El m2m `Product.ingredients` y el CRUD de `/api/ingredients` existían **desde T3 y nadie los usaba**: el back aceptaba `ingredient_ids` desde el primer día y lo único que faltaba era la pantalla. Ahora el panel lista los ingredientes, los marca por producto y crea el que falta sin salir del formulario.

**Los que propone la IA pasan de "copiá esto" a un clic.** La frase que decía *"cargar ingredientes desde el panel todavía no está terminado"* se borró. Con una salvedad que conviene no tapar: **ese clic no se vio correr**, porque F46 está apagada por B7 (falta la llave). Lo que está probado es la decisión que toma, no el clic.

**Escribir `azucar` no crea un duplicado de «Azúcar».** La comparación ignora acentos y mayúsculas, **pero conserva la ñ**: barrerla junto con los acentos haría que "Piña" y "Pina" fueran el mismo ingrediente y uno de los dos nombres desaparecería de su lista sin que nadie lo haya decidido. Medido en el navegador: un solo `POST /api/ingredients` en toda la sesión de prueba.

### Lo que encontraron las dos revisiones

**El duplicado entra igual, y la culpa es del reparto.** El panel compara nombres **normalizados**; el back, **exactos**. Con la lista local al día no se nota; con la lista vieja, "coco rallado" sobre "Coco rallado" crea la segunda fila. Reproducido en el navegador, no deducido. El front solo puede evitar los duplicados que **ve**: la unicidad tiene que estar donde está la restricción. Queda en `T6-F20b` junto con lo de abajo.

**`ingredient_service` no limita el largo de nada.** SQLite no hace cumplir el `String(120)` del modelo: el security-reviewer metió **4.000.000 de caracteres** en un `name` y el `GET /api/ingredients` —público— se los devolvió enteros. Necesita credencial de admin, pero el costo lo pagan los anónimos. Es la misma clase de bug que parió `saneado.py` en T7, en un módulo al que ese arreglo nunca llegó. Y ese servicio **nunca tuvo tests**.

**Tres caminos de falla que el panel no manejaba**, los tres arreglados con su test:

- Un alta fallida no refrescaba la lista local, así que el reintento fallaba igual **para siempre**: la única salida era recargar el panel y perder lo escrito. Ahora relee del servidor antes de rendirse, y si el ingrediente ya estaba, lo rescata en vez de mostrar un error.
- El único aviso era un banner arriba de todo y **en inglés**: a 375px el alta fallaba en silencio justo donde ella está mirando. Ahora el aviso va pegado al campo y en castellano.
- El candado de "en vuelo" comparaba el texto crudo, no el normalizado: dos sugerencias de la IA con distinta grafía, clickeadas juntas, creaban las dos filas — justo el duplicado que la feature existe para evitar.

**Y dos invisibles:** un espacio de ancho cero o un guión suave esquivaban la comparación y creaban un duplicado que **nadie puede distinguir mirando**. Ahora se barren antes de comparar y antes de guardar, y el nombre se guarda sin el espacio de más (`limpiarNombre`), porque "Harina   0000" quedaba escrito así para siempre.

### Lo que apareció mientras tanto

**Enter guardaba el producto a medio cargar.** Un `<input>` dentro de un `<form>` manda el formulario al apretar Enter, y el que lo contiene es el del producto: escribir "Manteca", apretar Enter, y quedaba un producto sin precio en la carta. Verificado después del arreglo: `0 POST /api/products` hasta apretar el botón de verdad.

### Y lo que se encontró planificando, que todavía no se arregló

**El selector de tamaño de la ficha es decorativo.** Cambia el precio en pantalla y el pedido se cobra al **precio base**: el cliente ve $14.000, Andrea cobra $6.000, y la diferencia la paga ella. Apareció leyendo el código y no la spec, que daba F19 al 80% *"falta cargarlas desde el panel"*. Queda en **ADR-029** con el plan de las tres partes, y en dos tarjetas aprobadas. **No está arreglado todavía**: es lo primero del próximo ciclo, y va antes que el editor del panel para que no exista una ventana en la que ella cargue tamaños que se cobran de menos.

- Tests: front **88 OK** (eran 72), back **213 OK** (sin cambios: el back no se tocó). Lint y typecheck limpios.
- Build: 377,83 KB JS · 33,99 KB CSS (eran 366,59 · 33,92).
- Sin migración: F20 no tocó el esquema.

---

## [0.10.1] · 2026-10-18 · Lo que encontraron las dos revisiones

Dos revisores independientes re-ejecutaron T7: uno funcional y uno de seguridad (R30, R31). Entre los dos encontraron **doce cosas reales**. Esto es lo que se arregló.

### Lo que rompía la compra

**La ruta pública contestaba 500 con HTML** ante cualquier campo que no fuera del tipo esperado: un `customer` que es texto, una dirección que es número, unas notas que son un objeto. Once vectores, todos sin cuenta. Y como el front espera JSON, a la persona le aparecía el HTML crudo del error de Werkzeug adentro del checkout. Ahora todo eso entra por `services/saneado.py` y sale como **400 explicado en castellano**.

**Tres errores de formulario dejaban a la vecina sin poder comprar por un minuto.** El tope por IP contaba los 400 igual que los pedidos: cambiaba el barrio, se equivocaba tres veces, y al cuarto intento —el bueno— la web le decía que mandara menos pedidos. Ahora el tope estricto cuenta **solo lo que sale bien**, y los intentos fallidos tienen su propio tope laxo para que un script tampoco use los 400 de barra libre. En el login es al revés y queda como estaba: ahí el intento fallido es exactamente lo que hay que contar.

**El tope de 1500 caracteres no acotaba nada.** Recortaba solo los renglones de productos y después agregaba el total y los datos de entrega: con una dedicatoria larga el mensaje se iba a 5000 caracteres y el link de WhatsApp quedaba inservible, justo en el paso que le falta a quien ya hizo el pedido. Ahora la cabecera y el pie se miden primero.

### Plata

**`delivery.method` era texto libre.** `"Delivery"` con mayúscula no entraba por la comparación exacta: se salteaba la validación de dirección y de zona, el envío quedaba en **$0**, y el panel decía "envío" mientras el WhatsApp decía "paso a retirar". Los dos canales que lee Andrea diciendo cosas distintas, y ganando el que cobra de menos. Ahora hay lista blanca, y las mayúsculas se normalizan en vez de rechazarse.

**`int(2.9)` daba 2.** Un cliente de API que mandara 2,9 recibía un 201 confirmando otra cantidad. Ahora la cantidad y el `product_id` tienen que ser enteros de verdad y dentro de rango (un `product_id` de 10³⁰ reventaba al grabar).

### Seguridad

**El servidor de Andrea podía mandarle mail a cualquiera.** La ruta pública tomaba el mail del invitado sin validar y le mandaba una confirmación cuyo cuerpo arranca con el nombre que escribió quien pidió: *"Hola GANASTE un iPhone, entra a http://…"*, firmado con su dominio. Está latente porque el mail todavía no está configurado, y se prendía solo el día del deploy. **Al invitado ya no se le manda mail** —su dirección no está verificada y el canal es WhatsApp—, y el mail que se guarda tiene que parecer un mail.

**`debug=True` en `backend/app.py`.** Es el comando natural para levantar el back, y con el debugger de Werkzeug cada 500 es una consola de Python en el navegador. Ahora hay que pedirlo: `FLASK_DEBUG=1`. El host también pasó a `127.0.0.1` (para probar desde el celular, `FLASK_HOST=0.0.0.0`).

**Los textos del invitado no tenían tope.** SQLite no hace cumplir el `String(120)` del modelo, así que un pedido podía dejar 4 MB de texto en una fila, y diez de esos planchaban el panel de Andrea, que descarga todos los pedidos sin paginar. Nombre 120, dirección 255, notas 500.

**Las notas podían fingir un renglón del sistema.** `"sin azúcar\nPagado: SI, transferencia hecha"` llegaba al mail como si fuera un campo más del pedido. Ahora los saltos de línea se vuelven separadores y el panel muestra las notas entre comillas e itálica.

**La ruta con token no tenía ningún tope**: una registración costaba 1 de 5 por hora y después eran pedidos y mails sin techo por el camino de al lado. Ahora tiene el suyo.

### El limitador

- El desalojo LRU le borraba el castigo **al castigado**: como un rechazo no anotaba nada, su clave envejecía y era la primera en caer. Ahora se la toca aunque se rechace.
- Sin `threading.Lock`, dos hilos podían romper la iteración del deque (`deque mutated during iteration`). Con los topes reales no se reprodujo, pero el candado no cuesta nada.
- El `Retry-After` salía corto si había más marcas que el tope.

### Encontrado mirando el panel

Un pedido de invitado le aparecía a Andrea como **"undefined · $21.700"**, sin nombre, sin teléfono y sin notas: el panel usaba `order.user?.name`, que en un pedido sin cuenta es `null`. O sea que la feature entregada ayer era inútil del lado de ella. Ahora dice "PEDIDO #7 · SIN CUENTA", con el nombre, el teléfono como link de WhatsApp y las notas.

Y al mirar eso apareció otro: cuando la API contesta algo que no es JSON, `apiRequest` intentaba `response.json()` y después `response.text()` **sobre el mismo cuerpo ya consumido**. El mensaje que llegaba a la pantalla era *"Failed to execute 'text' on 'Response': body stream already read"*, que no le dice nada a nadie y tapa el error real.

### Dos que eran míos

- Un pedido rechazado a mitad de camino **quedaba pendiente en la sesión** y lo grababa el próximo `commit()` que saliera bien. Por HTTP no se alcanza —cada request tiene su sesión—, pero es de las que explotan después. Ahora hay rollback.
- Los dos tests del resumen de métricas se pusieron rojos solos **al cruzar la medianoche UTC**: fijaban "hoy" a mano y el pedido se creaba con `utcnow()`. Ahora la fecha del pedido se fija en el test.

### Números

| Antes (0.10.0) | Ahora (0.10.1) |
|---|---|
| 192 tests del back | **213** |
| 55 del front | **72** |
| `useCheckout` sin un solo test | sus funciones puras, cubiertas |
| 4644 bases de prueba acumuladas en `tests/.tmp` | se borran al terminar cada test |

**Rojo medido** (R29): los 18 tests nuevos del pedido hostil, corridos contra `5446f6b` en un worktree aparte, dan **21 fallas y 13 errores**. Dos muestras: `AssertionError: 6176 not less than 2000` (el tope del mensaje) y `AssertionError: Lists differ: [False] != [True]` (el mail al invitado).

---

## [0.10.0] · 2026-10-17 · El invitado ya puede comprar

### Lo que estaba roto desde el principio (F23, F31, ADR-025)

Alguien entraba, elegía dos cosas, llegaba al checkout y leía: *"Necesitás iniciar sesión para completar la compra"*, con el botón apagado. Para una repostería de barrio donde el pedido se cierra charlando por WhatsApp, pedir registro **antes** de poder hablar es la venta perdida. Era el agujero más viejo del flujo y estaba anotado como tal desde el primer día.

Ahora hay `POST /api/orders/whatsapp`, **pública**: guarda el pedido y devuelve el mensaje ya escrito. Sin cuenta. Con cuenta, el pedido queda además en "mis pedidos".

**El texto lo arma el servidor** con los importes de la base:

```
¡Hola Andrea! Te hago un pedido desde la web.

Pedido #6
- 12 x Cookies New York: $19.200
Envío: $2.500
Total: $21.700

Nombre: Vecina del barrio
Teléfono: 11 4455 6677
Entrega: envío a Jose Hernandez 1234, Villa Maipú
```

Si ese texto lo armara el navegador, cualquiera le edita el total antes de mandarlo y a ella le llega un WhatsApp que dice $2.000 por algo de $12.000, con cara de pedido legítimo.

**El mail pasó a opcional** (migración `0004`): quien pide por WhatsApp deja nombre y teléfono, que es el canal. Sin mail, el aviso a Andrea sale igual —es el que mueve el pedido— y el de confirmación al cliente no.

**Un token vencido ya no arruina una compra:** si el navegador manda uno roto, se ignora y el pedido es de invitado, en vez de contestar 401.

### Un agujero de plata que esta feature agrandaba

`_resolve_shipping_amount` aceptaba el `shipping_amount` que mandara el cliente. Con token era discutible; en una ruta pública es **envío gratis a pedido**, y con un negativo el total queda por debajo del subtotal. Apareció escribiendo el test: lo iba a dejar anotado como deuda y es de los que se arreglan, no se anotan. El envío sale de `DELIVERY_FEE` y el request no opina. El test lo prueba con `0`, `-5000` y basura.

### Topes por IP, que cierran D2 (ADR-026)

Esta es la primera ruta sin login que **escribe** y que dispara un mail por request. Entró un limitador de ventana deslizante, y de paso cubre lo que estaba expuesto desde el día uno:

| Ruta | Tope |
|---|---|
| `POST /api/orders/whatsapp` | 3 por minuto, 10 por hora |
| `POST /api/auth/login` | 10 cada 5 minutos |
| `POST /api/auth/register` | 5 por hora |
| `POST /api/contact` | 5 por hora |

Contesta `429` con `Retry-After`. **Vive en la memoria del proceso**: no sobrevive un reinicio y con varios workers el tope real se multiplica; detrás de un proxy hace falta `ProxyFix` o todo el tráfico cuenta como una IP sola. Queda escrito como **D25** en vez de vendido como más de lo que es.

`/api/metrics/view` quedó **afuera a propósito**: cuenta visitas, y limitarlo por IP sesgaría el número que ella mira.

### Encontrado usando la página

El cajón del carrito tapaba la pantalla entera si cambiabas de ruta por un link: su propio botón de "Ir al checkout" lo cerraba, pero cualquier otro camino lo dejaba abierto encima de la página nueva. Salió probando el pedido de invitado en el navegador, no de un test. Ahora se cierra al cambiar de ruta.

### Qué se partió para que entrara

`CheckoutPage.tsx` tenía 278 líneas y esto la pasaba de 300 (R05). Quedó en 227, con la lógica en `useCheckout.ts`, el resumen en `ResumenDelPedido.tsx` y la pantalla de salida en `PedidoListo.tsx`.

### Dos tests que estaban mal

Ninguno era un bug del código. El de la ventana deslizante registraba dos intentos con el reloj congelado y esperaba que se liberara **un** lugar: se liberaban los dos. El del recorte del mensaje usaba un tope de 60 caracteres cuando el aviso de "y N productos más" ocupa 57, así que no entraba ni el primer renglón. Los dos quedaron anotados en `testing.md` §6.

### Números

| Antes (0.9.0) | Ahora (0.10.0) |
|---|---|
| 151 tests del back | **192** |
| 55 del front | **55** (6 nuevos de `linkWhatsApp`, 49 de antes) |
| El invitado no podía comprar | **compra**, probado en el navegador sin sesión |
| D2 abierta desde el 2026-10-16 | **cerrada** |

**Rojo medido** (R29): sacarle el decorador del tope a la ruta deja el test en `AssertionError: 429 != 201`.

---

## [0.9.0] · 2026-10-17 · Las dependencias al dia, el logo de Andrea, y sus datos de verdad

### Seguridad de dependencias (ADR-024, R19, con OK del humano)

Primera auditoria del repo, siete meses despues de la ultima actividad.

| | antes | despues |
|---|---|---|
| Front (`npm audit`) | 16 avisos, 12 altos | **0** |
| Back (`pip-audit`) | 57 avisos en 6 paquetes | **0** |

El back estaba peor y nadie lo sabia: **PyJWT** —lo que valida el token del panel— y **Werkzeug** —que procesa cada request— eran los mas atrasados. No son dependencias de build que se quedan en la maquina: son la puerta y la cerradura.

Front sin `--force` (solo saltos compatibles): `react-router-dom` 7.13.0 -> 7.18.4, `vite` 7.3.1 -> 7.3.7, y por arrastre postcss, nanoid, rollup, source-map-js y browserslist. **El arreglo tocaba solo el lockfile**: los rangos ya permitian las versiones sanas y lo que nos tenia clavados en las vulnerables era el `package-lock.json`. Por eso se subieron tambien los minimos declarados — el piso de seguridad es una decision escrita y no el resultado de cuando se corrio el ultimo install.

Back: flask 3.0.2 -> 3.1.3, werkzeug 3.0.1 -> 3.1.9, PyJWT 2.10.1 -> 2.15.1, requests 2.34.2, urllib3 2.8.0, pip 26.2.1. Se desinstalo **stripe**, que estaba en el venv sin que nadie lo importara desde T0. Entro `requirements-dev.txt` con `pip-audit`, para que la auditoria sea repetible y no dependa de acordarse del comando.

De yapa, PyJWT 2.15 avisa si la clave HMAC tiene menos de 32 bytes: la de los tests tenia 11 (la real del `.env` tiene 64).

### El logo (F54)

Andrea mando el suyo. Venia en JPEG con fondo negro de WhatsApp: se le devolvio la transparencia —umbral de 24 por canal, porque el contorno mas oscuro del dibujo suma 63, asi que no se come nada del trazo—, se recorto el aire y quedo en 640x375. Va en el header, y recortado a la carita, de favicon: el logo entero no se lee a 32px. **El original queda intacto** en `material-cliente/logo/`.

### Sus datos de verdad (F36, F43)

La etiqueta de producto que mando es un PDF vectorial sin texto extraible. Se rasterizo con `pymupdf` a 900 dpi y ahi estaban, impresos en cada sticker que ella pega:

- Instagram **@andresbakery.ar**
- Telefono **11-7059-5319**

Cargados donde corresponde y **no en el codigo**: el telefono en `backend/.env` como `WHATSAPP_PHONE=5491170595319` (formato `wa.me` de celular argentino: 54 + 9 + area + numero), que esta en `.gitignore`; las redes en el perfil, que vive en la base. El repo es publico y estos son datos de contacto de una persona: que sean publicos en su etiqueta no es razon para versionarlos.

Esto destraba **B2** (F23/F36 ya tienen numero) y le pone contenido real a F43.

### Lo que marco el reviewer (25 mutaciones, 20 mutantes muertos)

- **El aviso de sesion vencida no decia de que token hablaba**, asi que un 401 lento de la sesion vieja cerraba la nueva. El reviewer lo reprodujo demorando una respuesta 9 segundos. Ahora el evento lleva el token y se compara.
- **`ticksDelEje(NaN)` devolvia `[0, NaN]`** y dejaba el grafico en blanco sin error. Alcanzable con que a un punto de la serie le falte el `value`.
- **La subida de fotos no disparaba el aviso** (no pasa por `apiRequest`): dejaba el panel fingiendo que anda.
- **`acomodarCantidad` redondeaba al mas cercano**: en un producto de a 6, pedir 9 terminaba en 12. Ahora redondea para abajo. Entre darle de menos y cobrarle de mas a alguien, de menos.
- El carrito aceptaba un `quantity` que no fuera numero y propagaba `NaN` hasta el total.
- El comentario decia *"y la pagina lo dice"* y la pagina no decia nada: ahora la pantalla de ingreso avisa que la sesion vencio.
- `apiRequest` solo leia `data.error`; los errores de token vienen en `msg`, asi que todo quedaba en un "Error 401" pelado.
- `formatoCorto` mezclaba `$ 0` con `$5K` en el mismo eje.
- Tests endurecidos donde sobrevivieron mutantes: iniciales en minuscula, el rango 1..200 del eje (el unico entero que delataba el multiplo 2.5 era el **9**, y no estaba en la lista de doce), `undefined` en la regla de cantidades, `NaN` e `Infinity`.

### Numeros

| Antes (0.8.0) | Ahora (0.9.0) |
|---|---|
| 48 tests de front | **49** |
| 151 del back | 151 |
| 16 + 57 avisos de seguridad | **0 + 0** |

---

## [0.8.0] · 2026-10-17 · T16: el front tiene tests, y los tests ya encontraron cosas

Aprobada la dependencia (ADR-023), entra **Vitest** para la logica pura del front. **48 tests** sobre las iniciales de la cuenta, las imagenes, la regla de cantidades, el eje de los graficos, el saneado de preferencias y la sesion guardada.

Entorno `node` y no `jsdom`: nada de esto monta componentes. Lo visual sigue verificandose en el navegador (R07).

### Lo que encontraron los tests, que es el punto

**1. El eje de los graficos etiquetaba una linea donde no estaba.** El primer test del eje se puso rojo antes de terminar de escribirse: con maximo 4, el techo daba 5, la linea del medio valia **2,5** y la etiqueta la redondeaba a **"3"**. La linea decia un numero y estaba en otro.

Se cambio el eje de "un techo y tres lineas fijas" a **una lista de marcas en pasos lindos** (1, 2, 5, 10, 20…), que es como lo hacen las librerias de graficos y por exactamente este motivo. Ahora cada marca cae donde dice que cae, y el test lo fija: *todas las marcas de una serie de enteros son enteras*.

**2. «Salir» no borraba la sesion guardada.** Y este lo puse yo, ayer, en el commit `073c2e4`.

Al blindar el `localStorage` contra las ventanas privadas, un reemplazo masivo convirtio a `olvidarSesion()` en una funcion que **se llamaba a si misma**. El `catch` que estaba ahi para tragarse los errores del navegador se trago tambien el desborde de pila, asi que la funcion no hacia nada **en silencio**:

```js
function olvidarSesion(): void {
  try {
    olvidarSesion();   // <- se llama a si misma
  } catch { /* el desborde de pila moria aca */ }
}
```

Consecuencia real: apretar **Salir** limpiaba la pantalla pero **dejaba el token en el navegador**. Recargar devolvia la sesion. En una computadora compartida, eso es que la siguiente persona entra.

No llego a ningun lado —vive en `dev`, sin push ni deploy— pero estuvo en el repo unas horas. La leccion no es "revisar mejor": es que **un `catch` que se traga todo esconde bugs que no tienen nada que ver con lo que se queria atrapar**, y que un reemplazo masivo puede escribir adentro de la funcion nueva.

Ahora la sesion guardada vive en `lib/sesionGuardada.ts`, acepta un almacen inyectado y **tiene siete tests**. El que describe el bug se vio rojo contra el codigo de ayer:

```
FAIL  src/lib/sesionGuardada.test.ts > la sesion guardada > olvidar borra de verdad
```

**3. La sesion vencia y la pagina no se enteraba.** Aparecio probando el panel: el token dura 15 minutos y, pasado ese rato, Andrea seguia viendo el panel "abierto" —su nombre arriba, las pestañas— con todo fallando en silencio con 401. Y no podia ni volver a entrar: la pantalla de ingreso la rebotaba porque para el front la sesion seguia viva.

Ahora `apiRequest` avisa cuando el back rechaza un token **que nosotros mandamos** (401 **y** 422: el primero es vencido, el segundo es ilegible) y la sesion se cierra sola.

Verificado con un token vencido de verdad, firmado con la clave real del `.env`: el back contesta `401 {"msg":"Token has expired"}`, la app redirige a `#/ingresar`, el circulo vuelve a "Entrar o crear una cuenta" y el almacenamiento queda limpio.

### Y algo que aparecio al instalar: `npm audit`

Instalar Vitest disparo el primer `npm audit` del proyecto (D10 estaba abierta desde el 2026-10-16 sin correrse nunca). **16 avisos: 12 altos.** Ninguno lo trajo Vitest.

Lo que importa de verdad, con el matiz honesto:

- **`react-router-dom` 7.13.0** arrastra una docena de avisos, uno de ellos **RCE sin autenticar** por deserializacion. **La mayoria son de modo SSR/RSC** —single-fetch, `__manifest`, hidratacion— y este proyecto es un SPA con `HashRouter`, sin nada de eso. Pero **dos si aplican del lado del cliente**: *open redirect* via barra invertida en `<Link>`/`useNavigate` y via ruta que arranca con `//`. Se arregla con un salto de version menor.
- **`vite`** tiene tres altos, todos del **servidor de desarrollo** (lectura de archivos arbitrarios, bypass de `server.fs.deny`). No afectan al sitio publicado, si a la maquina de quien programa.
- `postcss`, `nanoid`, `rollup` y las dependencias de `eslint`: todas de build.

**No se actualizo nada**: eso es R19 y necesita su propio OK y su propia verificacion. Queda como **D23**, con los numeros arriba para poder decidir.

### Numeros

| Antes (0.7.1) | Ahora (0.8.0) |
|---|---|
| 151 tests del back, **0 del front** | 151 + **48** |
| `harness.config.json` con una suite | dos: `test` y `test_front`, las dos tienen que estar verdes |
| JS 366,14 KB | JS 366,59 KB (el runner no entra al bundle) |

---

## [0.7.1] · 2026-10-17 · El hover le borraba la rotacion al dorso

Reportado por el humano usando la pagina: *"cuando esta dada vuelta, si vos le pasas el mouse, da vuelta otra vez, es como que quiere dar vuelta otra vez"*.

**La causa, medida y no deducida.** Las dos caras de la tarjeta son `.product-card`, que tiene un efecto de hover para levantarse dos pixeles:

```css
.product-card:hover { transform: translate(-2px, -2px); }
```

El dorso se sostiene con `transform: rotateY(180deg)` de `.flip-cara-dorso`. **Es la misma propiedad**, y `.product-card:hover` (0,2,0) le gana en especificidad a `.flip-cara-dorso` (0,1,0). Con el mouse encima, el dorso perdia la rotacion:

| estado | transform del dorso | angulo |
|---|---|---|
| dada vuelta, sin mouse | `matrix3d(-1, 0, 0, 0, …)` | **-180°** |
| dada vuelta, **con mouse** | `matrix(1, 0, 0, 1, -2, -2)` | **0°** |

El dorso se des-rotaba debajo del puntero. Con `backface-visibility: hidden` encima, el resultado se ve exactamente como lo describio: la tarjeta queriendo darse vuelta sola.

**El arreglo son dos palabras:** el levantadito pasa a usar la propiedad **`translate`**, que es independiente y **se compone** con `transform` en vez de reemplazarlo.

```css
.product-card:hover { translate: -2px -2px; }
```

Verificado con el mouse de verdad: el dorso se queda en **-180° en los tres estados** (con mouse, sin mouse, y despues de cuatro pasadas seguidas), y el levantadito sigue andando en las dos caras (`translate: none` → `-2px -2px`).

**La leccion, que sirve fuera de este proyecto:** un efecto de hover escrito con `transform` pisa cualquier `transform` que el elemento necesite para otra cosa. En algo que rota, se traslada o se escala por su cuenta, el hover va con `translate`/`rotate`/`scale`, que son propiedades aparte. Quedo anotado en el Cerebro.

---

## [0.7.0] · 2026-10-17 · T15: el header respira, y la tarjeta gira cuando se lo piden

Una tanda entera de diseño, mirando lo construido el mismo dia.

### El header tenia siete controles y ahora tiene tres (F50, F51, F52, ADR-021)

Arriba se habian juntado la hamburguesa, el logo, Carta, Andrea, **cuatro iconos de estacion**, el carrito, el nombre de quien entro, salir, ingresar y crear cuenta. Quedan tres: el menu (solo en celular), la marca, y a la derecha el carrito y la cuenta.

- **La hamburguesa es del celular.** En pantalla grande el menu ya esta a la vista, en la barra o en el panel lateral.
- **La cuenta es un circulo con las iniciales** — "Facundo Moreno" da "FM" — y es tambien el boton de entrar para quien no tiene sesion. Adentro: Perfil, Administrador (solo Andrea), Configuracion y Salir. Sin sesion: Ingresar, Crear cuenta y Configuracion.
- **El selector de estacion se fue a Configuracion**, donde ya estaba la misma opcion. Eran cuatro iconos fijos para algo que se toca una vez. `ThemeSwitcher.tsx` se borro: quedaba sin usar.
- **Entro `/cuenta`**: nombre, mail y los accesos a Mis pedidos, Configuracion y el panel. No inventa campos que no existen.
- **El panel lateral ahora se elige**: siempre abierto (default) o que se abra al acercarse. Medido: fijo ocupa 256px y corre el contenido; escondido deja una cinta de 28px y al abrirse **se dibuja encima**, sin mover ni un pixel de la pagina. Si empujara el texto al abrirse seria el mismo problema que las tarjetas que temblaban.

**Lo que se cuido y no se ve:** el panel escondido se abre tambien con el teclado. La primera version lo ocultaba con `visibility: hidden`, que saca los links del tabulador y dejaba el menu inalcanzable sin mouse. Con opacidad, 4 tabulaciones lo despliegan.

### La tarjeta gira con un clic en la foto (F53, ADR-022, reemplaza ADR-016)

El hover duro medio dia. Lo probo el humano y lo dijo mejor que cualquier spec: *"vos tenes la imagen de primera vista y vas a ver un Agregar, y vos queres ir a tocar el Agregar y pum, se da vuelta la tarjeta"*.

Ahora la **foto** es el boton, con un cartelito "Ver que lleva" para que se note. Girar pasa a ser algo que la persona pide, no algo que le pasa por mover el mouse, y es la misma interaccion con dedo que con mouse.

De paso se arreglaron las dos cosas que el humano describio como "tiemblan y desaparecen", las dos **medidas antes y despues**:

| | Antes | Despues |
|---|---|---|
| Ancho minimo durante el giro | **124px** de 392, dos cuadros seguidos de canto | **201px**, y nunca pasa por los 90 grados |
| Tarjetas que giraban al cruzar la grilla | **5 cambios de estado** en 150ms | **0** |

Lo primero era `steps(5)`, que hacia caer el giro justo en 72 y 108 grados. Con `steps(3)` los angulos son 0, 60, 120 y 180. Lo segundo se fue solo al sacar el hover.

### Lo que encontro la revision independiente (R30)

Un reviewer que re-ejecuto todo y barrio **11 rutas x 2 modos de panel x 2 anchos x con y sin sesion = 88 cargas limpias**: cero desbordes, cero errores de consola, ninguna pantalla tapada. Encontro cinco cosas, las cinco corregidas y medidas:

- **Un nombre largo sin espacios se llevaba la pagina entera de ancho.** 1257px de desborde en 390px, y arrastraba al header tambien. El back acepta ese nombre sin chistar (no hay largo maximo). Faltaba `break-words`. Ahora: **0**.
- **El menu de cuenta quedaba abierto** si elegias la opcion de la pantalla en la que ya estabas: el unico cierre colgaba de que cambiara la ruta, y elegir "Perfil" estando en `/cuenta` no la cambia. Ahora cierra con el clic.
- **Las iniciales partian emojis al medio.** "🍰 Pastelera" daba un rombo con signo de pregunta: se indexaba por posiciones del string y un emoji ocupa dos. Ahora se recorre por caracteres de verdad.
- **Los cartelitos sobre la foto se comian el clic que da vuelta la tarjeta.** Las etiquetas y el "Con receta" se dibujan encima del boton: clickear justo ahi no hacia nada. Un `pointer-events-none` y listo. Medido: de `llegaAlBoton: false` a `true` en todas.
- **El giro mandaba el foco al `<body>`.** Poner `inert` en el ancestro de lo enfocado lo expulsa; con el teclado se podia seguir, pero un lector de pantalla perdia el hilo y nada anunciaba que la tarjeta habia girado. Ahora el foco se muda a la cara que quedo a la vista, con su nombre ("Que lleva Brownie Tentacion").

### Y una que estaba desde antes: la pagina en blanco con el almacenamiento bloqueado

El reviewer marco, fuera del diff, que `AuthContext` leia `localStorage` sin red de contencion. Se reviso el resto y **el carrito tenia lo mismo**. En una ventana privada, con los datos de sitio bloqueados o detras de ciertas politicas de empresa, tocar `localStorage` **tira excepcion**: pasaba adentro del arranque de los dos providers y la persona se quedaba con **la pantalla en blanco**. No podia ni mirar la carta.

Medido con el `localStorage` reventado a proposito, antes y despues:

| | Antes | Despues |
|---|---|---|
| Header | no renderiza | renderiza |
| Tarjetas en la carta | 0 | 4 |
| Agregar al carrito | imposible | anda (se pierde al recargar, nada mas) |
| Errores de JS | la app no arranca | **0** |

Sin guardado el sitio funciona igual: hay que volver a entrar y el carrito dura lo que dura la pestana. Eso es infinitamente mejor que no abrir. `PreferencesProvider` ya lo hacia bien desde 0.4.0; los otros dos se habian quedado atras.

### Numeros

| Antes (0.6.0) | Ahora (0.7.0) |
|---|---|
| 151 tests del back | **151**, sin cambios: esta tanda es de front |
| JS 360,12 KB · CSS 30,71 KB | JS 366,14 KB · CSS 33,93 KB |
| 7 controles en el header | **3** |

---

## [0.6.0] · 2026-10-17 · T10-T14: el hover, el perfil con CV, las fotos, los graficos y la IA apagada

Cinco pedidos del humano por dictado, con sus cinco ADR (016 a 020). Todo medido, nada deducido.

### T10 · La tarjeta gira con el hover, y el dorso se queda con el "Agregar" (F42, ADR-016)

F33 ya existia desde 0.4.0, pero giraba **solo con un boton**. Ahora gira tambien al pasar el mouse, con dos cuidados que no son opcionales:

- El hover entra **solo donde hay un mouse de verdad** (`(hover: hover) and (pointer: fine)`), y el medio se evalua en JS (`usePunteroFino`) y no en CSS. En una pantalla tactil `:hover` queda pegado despues de tocar, y ademas la cara visible manda `aria-hidden` e `inert`: con el CSS girando por su cuenta, la pantalla mostraria una cara y el lector de pantalla anunciaria la otra.
- **El dorso suma su propio boton de agregar.** Si la tarjeta gira al pasar el puntero, el "Agregar" de la cara de adelante deja de ser clickeable: el puntero entra, la cara se va y el boton se escapa. Sin esto, el hover le sacaba a la carta su accion principal.

El boton de informacion se queda en todos los dispositivos: en celular es el unico camino, y es el del teclado.

### T11 · El perfil de Andrea: sus redes y su CV (F43, F44, ADR-017)

`/historia` dejo de ser solo un texto. Ahora ella carga desde **Panel -> Tu perfil**: su foto, que es, su zona, una linea sobre ella, **sus redes** (Instagram, TikTok, y seis mas) y **su CV** completo -- titulo, resumen, que sabe hacer, experiencia y formacion.

El CV se publica en **`/cv`**, una vista propia con hoja de estilos de impresion: cualquiera la guarda en PDF desde el navegador. **El pedido fue textual**: que un reclutador que entre a ver el emprendimiento encuentre ahi su CV. Por eso el link vive en su perfil y no escondido, y por eso el CV es texto de verdad y no un archivo adjunto.

Todo vive en **un JSON** en `SiteContent["profile"]`, validado y normalizado por `ProfileService`: sin tabla nueva y sin migracion. El servidor recorta cada campo, acepta 8 redes y 12 entradas por lista, y **una URL que no empiece con `http(s)://` no se guarda** -- `javascript:` en un campo que despues sale en un `href` es XSS almacenado, y el admin es justo quien pega links sin mirarlos.

Lo que esta vacio **no se renderiza**: misma regla que F24. No se inventa el CV de una persona real.

### T12 · Las fotos se suben desde el panel (F45, F49, ADR-018) -- esto prende N5

Hasta hoy la foto de un producto era una URL que ella tenia que conseguir en otro lado. Ahora se arrastra o se elige, y **`image_url` sigue existiendo**: si ya tiene la foto subida, pegar el link sigue siendo mas rapido.

`POST /api/uploads` (solo admin) **no mira la extension ni el `Content-Type`**: parsea la estructura del archivo -- marcadores del JPEG, chunks del PNG con su CRC -- y **reescribe la imagen dejando solo los pixeles**. Se van EXIF, XMP, ICC y comentarios.

**Por que reescribir y no solo validar:** una foto de celular trae **EXIF con GPS**. Andrea cocina en su casa; publicar la carta con las coordenadas de su casa adentro de cada JPG es filtrar su domicilio sin que nadie lo note. Reescribir mata ademas el archivo poliglota: un JPG valido que tambien es HTML o un ZIP.

**Medido, no deducido:** una foto real de 1967 bytes salio de 1949 con el JFIF afuera, y el archivo limpio **vuelve a decodificar** como JPEG de 120x80. Se rompio el limpiador a proposito (R29) y los tests se pusieron rojos con el `eXIf` y el `Exif\0\0` adentro del archivo guardado.

Nombre generado por el servidor (`secrets.token_hex`), carpeta fuera del repo, y servido con `Content-Type` fijo, `nosniff` y `Content-Disposition: inline`. **WEBP y HEIC se rechazan nombrandolos**: el mensaje dice "guardala como JPG", y para HEIC aclara que es el formato del iPhone (D16).

**Se cae de aca:** los **headers de seguridad** entraron globales (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Resource-Policy`, CSP minima). Desde que el back sirve archivos que subio una persona dejaron de ser hardening. Cierra **D3**.

### T13 · Graficos y metricas en el panel (F47, F48, ADR-019)

El resumen del panel ahora tiene numeros arriba y **seis graficos**: visitas por dia, pedidos por dia, facturacion por dia, lo que mas se pide, estado de los pedidos, paginas mas vistas y dispositivos. Con selector de 7 / 30 / 90 dias.

Las visitas se cuentan en una tabla nueva, `page_view`, con **contadores agregados**: `(dia, ruta, clase de dispositivo) -> cantidad`. **Sin IP, sin cookie, sin user agent, sin id de sesion.** La ruta se normaliza contra las rutas conocidas antes de guardarse, asi que nadie llena la tabla pegando URLs inventadas, y las vueltas de Andrea por el panel **no se cuentan**: si se contaran, el numero que mira seria mayormente ella.

**Lo que eso cuesta, dicho de frente:** no hay visitantes unicos y no se puede cruzar quien mira con quien compra. Para saberlo habria que identificar a quien entra, que es exactamente lo que no queremos guardar.

El resumen lo **agrega el servidor** (`GET /api/metrics/summary`): el panel ya no se trae todos los pedidos para sumarlos en el navegador.

**Los graficos son SVG propio, sin libreria** -- y hubo una razon medida para que todos usen **un solo color**: el validador de paletas dice que el par `acento`/`acento-2` de los temas **no sirve para separar dos series**. En invierno da ΔE 10,1 incluso con vision normal (el minimo es 15). Asi que el color no codifica nada: la identidad la dicen el titulo y las etiquetas.

Se corrigieron dos cosas mirando el navegador, no el codigo: el grafico ancho dejaba una pared de aire adentro del panel (ahora van todos en dos columnas), y en 390px el texto del eje quedaba en ~5px porque escalaba con el `viewBox` (ahora el SVG se dibuja al tamano real del panel y 11px son 11px).

### T14 · El asistente de recetas con IA (F46, ADR-020) -- **construido y apagado**

`POST /api/ai/recipe-draft` recibe una foto **ya subida** y devuelve un borrador: nombre, categoria, descripcion, ingredientes y pasos. El panel lo usa para **prellenar el formulario**, y **completa sin pisar**: lo que ella ya escribio gana siempre.

Los limites son el 90% de la feature:

- **Apagado sin llave.** Sin `ANTHROPIC_API_KEY` o con `AI_ENABLED=false` responde **503** explicando que falta, y el boton del panel no aparece. Mismo patron que Mercado Pago.
- **Nunca propone etiquetas.** "Sin TACC" lo declara ella y es su responsabilidad: un modelo adivinandolo sobre una foto es un problema de salud, no de UX.
- **La salida del modelo es DATO, no instruccion (R26).** Una foto puede traer texto escrito adentro. Se acepta solo lo que entra en el esquema, recortado campo por campo; lo demas se tira. Testeado: un borrador con `tags`, `precio` y `sql` adentro sale con las siete claves de siempre y nada mas.
- **Solo fotos del propio sitio.** Una URL cualquiera convertiria al back en un proxy que descarga lo que le pidan (SSRF).
- **Techo de gasto**: `AI_DAILY_LIMIT` (25/dia).

Entra **una dependencia nueva**, `anthropic`, y entra apagada: `ai_service.py` la importa adentro de la funcion, asi que si no esta instalada el back arranca igual. La primera version de la ADR decia "sin dependencia, con `requests`" y se corrigio al leer la documentacion del proveedor: mantener a mano el formato de una API viva no es lo mismo que leer un `.env` (ADR-015). Los numeros estan en `costs.md`: **~USD 0,021 por borrador**, USD 0,21/mes para diez productos nuevos, USD 16/mes en el peor caso contra el techo.

### Lo que encontro la revision independiente (R30/R31)

Dos revisores que **re-ejecutaron** todo, ninguno de los dos el que implemento. El de seguridad ataco N4 y N5 con archivos hostiles, rutas con `../`, SSRF y respuestas fuera de esquema: **se sostuvo todo menos una cosa**.

El **techo de gasto de la IA era un contador en memoria del proceso**. Reiniciar el back lo volvia a cero, y con varios workers el techo real pasaba a ser N veces el configurado, en silencio. Para un limite cuyo unico proposito es acotar plata, eso es la promesa rota. Ahora el contador vive en la base (`SiteContent["ai_usage"]`) y se descuenta **antes** de llamar al modelo, porque una llamada que sale y despues falla igual se paga.

El test que lo prueba se vio **rojo primero** contra el codigo viejo (R29): `AssertionError: ServiceError not raised`.

El **reviewer funcional** re-ejecuto los tres comandos (dieron lo afirmado), audito los tests y ataco el codigo nuevo. Encontro cinco cosas mas, todas corregidas con su test:

- **Una carrera que devolvia 500 en un endpoint publico.** Dos visitas simultaneas a la misma ruta el mismo dia veian las dos que la fila no existia, las dos insertaban, y la segunda chocaba contra el indice unico — justo lo que el docstring de la ruta promete que no pasa. Ahora el contador sube con un UPDATE atomico y el choque se resuelve sumando sobre la fila del otro. De paso, el `views = views + 1` resuelto en Python perdia cuentas.
- **El filtro de URL tenia un agujero de un caracter.** Descartaba `//otro-host` pero dejaba pasar `/\otro-host`: el parser de URL de los navegadores lee la barra invertida como una barra. Lo probo contra el parser de verdad, no de memoria.
- **Lo vacio contaba como la portada.** `normalizar_ruta` le pegaba un `/` adelante a cualquier cosa, asi que `""`, `"?x=1"` y `"#abajo"` terminaban sumando visitas a `/`.
- **El grafico de estados ignoraba el filtro de fechas** mientras vivia en la misma grilla que cuelga del selector de 7/30/90 dias: un pedido de hace dos anios aparecia en el panel de la semana.
- **Dos tests pasaban de casualidad**: el del WEBP afirmaba que el mensaje decia "JPG", y el mensaje generico de "no es una imagen" tambien lo dice (con la rama del WEBP borrada seguia verde); y un `assertEqual` comparaba `[]` contra `[]`.

Y dos del codigo que habia entrado horas antes: el `_consumir` nuevo repetia la misma carrera, y reventaba con `AttributeError` si el contador guardado no era un objeto.

Lo que **no** pudo romper, despues de empujar fuerte: el parser de imagenes escrito a mano (21 entradas hostiles, ninguna lo colgo ni lo hizo leer fuera de rango) y la matematica del grafico (un solo punto, todos los valores en cero, el mouse fuera del SVG: ninguna division por cero ni indice fuera del array).

Quedaron anotadas dos deudas que salieron de ahi: **D19** (se tira el perfil de color de la foto: en una reposteria la foto *es* el producto) y **D20** (la llamada al SDK no tiene test; el parseo de la respuesta ahora si).

### Lo que se encontro probando

- **`PanelApiTestCase` heredaba de `BackendApiTestCase`** y unittest corria la suite entera del padre otra vez: 13 tests nuevos aparecian como 23. El arnes de la app de test se mudo a `support.py`, que `discover` no carga.
- La base de datos trae `date` y el eje de los graficos mostraba **"1" dos veces** cuando el maximo del dia era 1 (la linea del medio valia 0,5). No hay medio pedido: con maximo 2 o menos, el techo es 2.
- El SVG dentro de una celda de grid **agrandaba la celda** para entrar, y la medicion del ancho se volvia circular. `min-w-0` en el panel.

### Numeros

| Antes (0.5.0) | Ahora (0.6.0) |
|---|---|
| 70 tests | **151 tests**, todos verdes |
| JS 326,85 KB · CSS 29,22 KB | JS 360,12 KB · CSS 30,71 KB |
| migracion 0002 | **0003** (`page_view`), probada sobre copia, en los dos sentidos y desde base vacia |
| 5 pestanas en el panel | 6, con graficos y perfil |

---

## [0.5.0] · 2026-10-16 · T3: el modelo nuevo, y el `admin123` fuera del repo publico

### Seguridad primero (D12, D13) · ADR-015

`backend/.env` era decorativo: nadie lo leia. `backend/env_file.py` lo carga a `os.environ` **antes** de que `Config` resuelva sus `os.getenv`, en 40 lineas y sin dependencia nueva (la API quedo igual a la de `python-dotenv` a proposito: cambiar de opinion es borrar un archivo).

Con el archivo leyendose de verdad se pudo sacar lo que importaba: `ADMIN_EMAIL` y `ADMIN_PASSWORD` **ya no tienen default**, y `ensure_admin()` **dejo de reescribir la contrasena del admin en cada arranque**. Si Andrea la cambia, la suya gana; para rotarla a mano hay `ADMIN_PASSWORD_RESET=true`, de una sola vez y avisando por log. Sin `JWT_SECRET_KEY` en el entorno se usa una al azar por proceso: reiniciar cierra sesiones, pero nadie firma un token de admin con una clave publicada.

**Medido, no deducido:** el test que fallaba antes del arreglo decia `AssertionError: False is not true` sobre la clave vieja, y el de "sin ADMIN_EMAIL no se crea admin" decia `1 != 0`. Despues del cambio se intento pisar la clave a mano (`ADMIN_PASSWORD=admin123` + arranque) y la salida fue `admin123 entro: False`.

Los tests dejaron de leer `backend/.env` (`backend/tests/__init__.py` apunta `ENV_FILE` a un archivo que no existe): si lo leyeran, pasarian o fallarian segun lo que cada maquina tenga cargado.

### El modelo (F16, F17, F19, F21, F28) · ADR-010

`Product` absorbio la receta y aprendio a venderse por unidad: `slug`, `steps`, `prep_note`, `unit_label`, `min_qty`, `qty_step`, `allows_pickup`, `allows_delivery`. Entraron `Tag` (m2m, las crea ella) y `ProductVariant`. `Order` sumo `channel` y **`user_id` paso a opcional** (ADR-012). `Recipe` se borro.

**Flask-Migrate entro de verdad**: `0001` es el esquema previo a T3, escrita a mano porque cuando se adopto Alembic el modelo ya tenia los cambios; `0002` es la migracion de T3, autogenerada y despues editada por tres motivos reales — las columnas NOT NULL necesitan `server_default` sobre una tabla con filas, `slug` entra nullable y recien despues pasa a NOT NULL UNIQUE, y **las recetas no se tiran**: cada una se convierte en un `Product` no disponible y con precio 0, y su texto de ingredientes se parte en filas de `Ingredient`.

Se probo **sobre una copia antes que sobre la base real**, en los dos sentidos (`upgrade` y `downgrade`) y tambien desde una base vacia. En la base de desarrollo habia contenido escrito a mano, no solo semilla: una receta "Brownies", un ingrediente "Azucar" y el texto de Historia editado. Todo sobrevivio; la receta quedo como producto sin precio y oculto, esperando que Andrea decida.

`create_all()` quedo **solo para los tests**. Si la base esta atrasada, la app ya no explota al arrancar: avisa por log y levanta igual, que es justo el estado de cualquiera que hace `git pull` antes de migrar.

### La API (F20, F22, F25) y el front

Endpoints nuevos: `GET /api/products?tag=&available=1`, `GET /api/products/<slug>`, el CRUD de `/api/tags` y `GET /api/site/delivery`. `POST /api/orders` valida `min_qty` y `qty_step` **del lado del servidor** (V4) y acepta `channel`. `/api/payments/checkout` responde **503** con los pagos apagados, en vez de un error de configuracion raro.

`/api/site/delivery` mato dos duplicaciones: el `DELIVERY_FEE = 2500` que estaba hardcodeado en el front (C4) y el numero de WhatsApp, que vivia **a la vez** en el `.env` del front y en el del back y podian discrepar. Ahora `VITE_WHATSAPP_PHONE` no existe.

Vistas: `/producto/<slug>` con etiquetas, ingredientes, variantes, aviso de preparacion y la receta en pasos numerados. El filtro por etiqueta en la carta lo resuelve el back. En el panel, la pestana Recetas **se jubilo** (ADR-001) y la receta es un campo del producto; entro una pestana Etiquetas con un aviso explicito de que "sin TACC" es **su declaracion**, no un certificado del software.

**El slug no se mueve cuando ella corrige un nombre**: es la URL de la ficha y un link compartido no se puede romper. Verificado: renombrar "Cookies New York x6" a "Cookies New York" dejo el slug viejo.

### Lo que se encontro probando, no leyendo

- **El carrito guardado en `localStorage` antes de T3** mostraba el precio viejo y una unidad vacia ("$ 9.600 por"). La clave paso a `andres-bakery-cart-v2` y la vieja se borra: mostrar un precio desactualizado es mentirle al cliente.
- **La home anunciaba "Chat guiado abajo a la derecha"**, que dejo de existir en 0.4.0. Decia una mentira desde ese commit.
- **Editar una etiqueta le reseteaba el orden a 0**, porque `sort_order` no viajaba en la respuesta. Entro al serializer.

### Desviaciones declaradas

- `design.md` §B3 pedia `Order.customer_phone`. **No se agrego**: `OrderDelivery.customer_phone` ya existe con el resto del contacto, y duplicar la columna invita a que las dos digan cosas distintas.
- `contracts.md` §2 no listaba `sort_order` en `Tag` ni `slug` en la respuesta de crear producto. Los dos entraron porque el panel los necesita.
- Las etiquetas **no se siembran**. "Sin TACC" es declaracion de Andrea: el seed no la pone por ella.

**Medido** — 70 tests OK (eran 19), eslint + tsc limpios, build 326,85 KB JS / 29,22 KB CSS. Responsive a 390px en carta, ficha, carrito, **checkout y panel**: cero desbordes. Flujo completo probado en el navegador: agregar de a 6, carrito con envio del back, pedido #4 registrado con `channel=whatsapp`. El servidor rechaza 7 cookies con `400 product 3 is sold in steps of 6 unidad`.

---

## [0.4.0] · 2026-10-16 · Cuatro secciones de UI, una por commit

Segunda tanda del dictado del humano. Cuatro decisiones antes de escribir codigo (**ADR-011 a ADR-014**) y despues cuatro commits, uno por seccion.

**Navegacion (F29, F39) · ADR-011.** Arriba quedan Carta y Andrea; el resto vive en un drawer lateral que cierra con Escape, con el backdrop o al elegir destino. Los enlaces salen de un solo archivo, `layout/enlaces.ts`, que alimenta la barra y el drawer. A la derecha del todo y siempre en el mismo lugar: estaciones, carrito con contador, e Ingresar / Crear cuenta. Las preferencias se mudaron de `theme/` a `preferencias/` y ahora guardan tema, tipografia, tamano y modo de nav en un solo JSON, saneando ids viejos que ya no existan.

**Configuracion (F30).** `/configuracion` con cuatro grupos de opciones y un boton para volver a los defaults. La tipografia **Redonda** existe por accesibilidad: una pixel font en parrafos largos no se lee. El tamano mueve el `font-size` de `<html>`, asi que escala todo lo que esta en `rem` sin tocar una clase. Incluye vista previa con texto largo de verdad. Se guarda por navegador, no por cuenta: un invitado tambien configura.

**Ayuda (F35, F36, F37) · ADR-013.** Se fue el "Soporte guiado". Se probo en el navegador y era peor de lo reportado: ocupaba el alto completo, tenia las respuestas rapidas **debajo** del historial —asi que cada mensaje las empujaba y se terminaba tocando otro boton— y dos scrolls anidados. Ahora: acordeon nativo (`<details>`) de preguntas frecuentes y dos salidas, WhatsApp y mail. **Si falta `VITE_WHATSAPP_PHONE` el boton no aparece** y el panel dice que falta: mejor eso que un `wa.me` roto. El footer dejo de vender dashboards y dice donde encontrarla, con PedidosYa en "proximamente" (ADR-008).

**Carta y carrito (F33, F34, F40).** Tarjetas con dorso: frente foto y precio, dorso descripcion e ingredientes cuando existan. Se voltea **con un boton, no con el hover**: en celular no hay hover y una tarjeta que gira sola al pasar el dedo es una trampa. Las dos caras comparten celda de grid, asi ninguna se recorta. El giro va en `steps(5)` y se apaga con `prefers-reduced-motion`. El carrito tiene pagina propia en `/carrito`; el icono del header lleva ahi y el boton flotante sigue abriendo el panel rapido.

**Decidido y todavia no construido:** **ADR-012**, el invitado va a poder pedir por WhatsApp sin cuenta. No se implemento porque obliga a que `Order.user_id` sea opcional y a revisar cada consulta que hoy asume que una orden tiene usuario: eso es **T3**, no un parche. **ADR-014**, el deploy espera a T3: Vercel sirve el front, pero Flask + SQLite necesita proceso vivo y disco, y ahi se perderian los pedidos.

**Medido** — 19 tests OK, eslint + tsc limpios. Verificado en navegador: drawer, configuracion cambiando tamano, panel de Ayuda, tarjeta girando y carrito sumando cantidades. **Responsive a 390px**: cero scroll horizontal y ningun elemento desbordado, medido con `scrollWidth` contra `clientWidth`, no a ojo.

**Dos cosas propias encontradas y corregidas:** el generico de `GrupoOpciones` estaba atado a la clave de `Preferencias` y TypeScript colapsaba la union de todas; y agregar al carrito abria el panel rapido tapando la propia pagina del carrito.

**Nota de entorno, no del codigo:** el navegador servia otro proyecto en el puerto 5174 porque habia dos procesos, el nuestro en IPv6 y uno ajeno en IPv4, y `localhost` resuelve a IPv6. Se levanto todo en el **5188** con CORS acorde.

---

## [0.3.0] · 2026-10-16 · T2 estetica pixel pastel + 4 temas, y la cartilla de Andrea

**Agregado — el motor de temas (F15, ADR-005).** `theme/tokens.css` con las 4 paletas estacionales en nombres **semanticos** (`--color-acento`, nunca `--rosa-300`), `ThemeProvider` que escribe `data-theme` en `<html>` y lo persiste en `localStorage` con try/catch (en ventana privada el tema igual funciona, solo no sobrevive la recarga), `useTheme` y un `ThemeSwitcher` de 4 botones en el header. Default **primavera**. Tailwind 4 lee los tokens desde `@theme`, asi que `bg-superficie` y `text-tinta` son utilidades de Tailwind de verdad y cambiar `data-theme` repinta todo sin recargar.

**Agregado — la estetica (F14, ADR-003).** Cero assets: el pixel sale de CSS propio. Recuadros con borde de 4px **sin esquinas** (los cuatro `box-shadow` planos, el truco clasico de UI de 8 bits), sombras duras sin blur, botones que se hunden al apretarlos, fondo de papel cuadriculado con `repeating-linear-gradient`, y tipografia **Pixelify Sans** solo en titulos y precios — el cuerpo va en **Nunito** porque una pixel font en parrafos largos es ilegible en celular.

**Las fotos de comida quedan limpias.** El pixel va en el marco, no en el producto: destruir una foto de una torta no ayuda a venderla. El hero dejo de ser una imagen al 45% bajo un velo oscuro y paso a ser una **caja de dialogo**: foto entera arriba, panel solido abajo.

**Agregado — la cartilla de Andrea (F24).** Ruta `/historia` y link "Andrea" en el menu. Ficha tipo hoja de personaje: foto enmarcada, nombre, oficio, zona y como se le encarga. **No se invento ninguna biografia.** La historia sale de `/api/site/about`, que ella ya edita desde Panel → Contenido. Si ese texto esta vacio aparece un recuadro punteado que dice exactamente que falta y quien lo completa, y **se borra solo** cuando ella escribe. Hoy se ve el texto generico que siembra `BootstrapService`, que no es de ella: **F24 sigue bloqueada por su texto y su foto**.

**Cambiado — un pase mecanico sobre los 25 archivos** del front: 333 reemplazos que sacaron radios, blur y sombras blandas, y mapearon la paleta vieja (`stone-950`, `orange-500`, `emerald-50`…) a los tokens. Control final con grep: **cero** restos de la paleta anterior.

**Dos bugs mios en ese pase, encontrados y corregidos:** el `` final de la regex no matchea despues de `]`, asi que sobrevivieron todos los `rounded-[32px]`; y la normalizacion de espacios aplasto la indentacion dentro de template literals en dos archivos, que se reescribieron a mano.

**Desviacion declarada de `design.md` §B2:** la variante **oscura** de cada estacion no se hizo. El pedido era pastel, el pastel es claro, y ocho paletas duplican el trabajo de contraste sin que nadie lo haya pedido. `prefers-color-scheme` hoy no se consulta: el default es primavera siempre.

**Medido** — 19 tests del back OK, eslint + tsc limpios, build verde: **296 KB JS** y **27 KB CSS**, que bajo de 41 porque los tokens borraron utilidades repetidas. Verificado en navegador: home, tienda, `/historia` y el panel admin renderizando, cambio de estacion repintando todo, y el tema sobreviviendo a la recarga.

---

## [0.2.0] · 2026-10-16 · T0 higiene + T1 partir `App.tsx`

**Borrado** — `front/Andres_Bakery/api/` entera: 13 `.js` y un `README.txt`, 316 lineas sin una sola referencia desde `src/`. Verificado antes de borrar, no asumido. La idea que proponia ese README (traer ingredientes y fotos de Spoonacular/Edamam/TheMealDB/Unsplash) quedo anotada en `features.md` §C para no perderla.

**Sacado** — `stripe==8.7.0` de `requirements.txt`: ningun `.py` del back lo importa, los pagos van por `urllib` directo a Mercado Pago.

**Cambiado** — `backend/.env.example` deja de llevar el mail real de Andrea y la password `admin123` como defaults, y documenta `WHATSAPP_PHONE` y `PAYMENTS_ENABLED` (ADR-002). El mail real **ya quedo en el historial de git**: esto frena la hemorragia, no la borra.

**Agregado** — `backend/.env` local (gitignored) con un `JWT_SECRET_KEY` de verdad, y `front/Andres_Bakery/.env.example` trackeado.

**Destrackeado** — `front/Andres_Bakery/.env` estaba versionado contra lo que declara el propio `.gitignore`. El archivo sigue en disco.

**Partido (T1)** — `App.tsx` paso de **1604 lineas a 17**. Refactor mecanico, sin cambio de comportamiento:

- `App.tsx` solo providers + router · `layout/` AppShell, SiteHeader, SiteFooter
- `pages/` Home, Shop, Checkout, Orders, Login, Register · `pages/admin/` AdminPage + 5 pestañas
- `components/` HeroCarousel, ProductCard, CartDrawer, SupportChat · `components/ui/` los 11 helpers de presentacion con barrel
- `lib/` constants.ts, format.ts, ui-types.ts

Archivo mas grande ahora: `AdminPage.tsx` con **233 lineas**. R05 cumplida.

**Desviaciones del arbol de `design.md` §B1**, chicas y a la vista: se sumaron `lib/constants.ts` y `lib/ui-types.ts` (los datos y tipos compartidos necesitaban casa propia), `components/ui/index.ts` como barrel, y `admin/RecipesTab.tsx`, que nace ya marcada para jubilarse en T3 por ADR-001.

**Un cambio que NO es mecanico**, y por eso se declara: el primer slide del hero decia `"Edici?n especial"` — un caracter roto que se veia en pantalla. Quedo `"Edición especial"`.

**Medido** — 19 tests del back OK, eslint + tsc limpios, build verde (292 KB JS · 41 KB CSS, contra 291 · 41 antes: mismo bundle). **La app se corrio de verdad**: back en `:5000` sirviendo la DB real, front en `:5174`, home y tienda renderizando y el carrito abriendo. Unico error de consola: `favicon.ico` 404, preexistente.

**Sin tocar** — el back, salvo `requirements.txt` y `.env.example`. Y el cambio del widget de soporte de `right-6` a `left-6` que estaba sin commitear: se preservo tal cual en `components/SupportChat.tsx`.

---

## [0.1.0] · 2026-10-16 · SDD aplicado (brownfield, R15)

**Agregado** — carpeta `sdd/` completa sobre un repo que tenía 4 meses de código y ningún SDD:

- Núcleo del paquete copiado: `SDD-MASTER.md`, `SDD-COMPACT.md`, `GUIDE.md`, `custom.md`, `scenarios.md`, `teams.md`, `models.md`, `harness.md`, `orchestration.md`, `loops.md`.
- MDs del proyecto escritos desde el análisis del repo: `spec.md`, `design.md`, `diagram.md`, `contracts.md`, `features.md`, `testing.md`, `security.md`, `costs.md`, `decisions.md`, `status.md`, `glossary.md`, este changelog.
- `prompts/start-prompt.md` con la prompt de arranque sintética que exige R15.
- Espejos `AGENTS.md` y `CLAUDE.md` en la raíz (R22), `harness.config.json` con los comandos reales (R30), `.gitattributes` con `merge=union` para el changelog.
- `material-cliente/` con su estructura, vacía: ahí va lo que aporte la clienta, tal como llegue.

**Decidido** — ADR-001 a ADR-010 en `decisions.md`. Las cuatro que vinieron del cuestionario del humano: una sola entidad vendible, WhatsApp como canal principal, pixel solo con CSS, 4 temas estacionales.

**Enmendado el mismo día**, con las respuestas a las preguntas abiertas y antes de escribir código:

- **ADR-001 enmendada:** Andrea publica ingredientes **y** receta paso a paso ⇒ `Product` suma `steps`. `Recipe` igual se jubila como tabla. Nace F28 y el criterio V10; el supuesto S3 de `spec.md` quedó anulado.
- **ADR-006 confirmada:** "sin TACC" es una etiqueta más, no un campo propio. El término había llegado deformado por dictado de voz como "sin tag" y se verificó antes de modelarlo (R04).
- **ADR-008 precisada:** Andrea todavía no tiene tienda en PedidosYa ⇒ F26 pasa a **Deferred**.
- La clienta tiene nombre en los MD: **Andrea**. Falta su historia escrita y una foto (F24 sigue bloqueada por material, no por código).

**Aprobado por el humano el 2026-10-16** (R01/R08/R28): este `sdd/`, su commit, y **ADR-010 pasa de Propuesta a Vigente** — `Flask-Migrate` entra como dependencia en T3. B6 destrabado.

**Medido** — no deducido: 19 tests del back en verde, lint y build del front limpios.

**Sin tocar** — ni una línea de código de la aplicación. R15 lo prohíbe hasta el OK de este `sdd/`.

### Estado del repo al momento de aplicar el SDD

- 15 commits, el último `2914c1d "Codex 10.0"` del 2026-03-08. Siete meses de inactividad.
- Rama `dev`, adelantada respecto de `main`.
- Un cambio sin commitear en `App.tsx`: el widget de soporte pasó de `right-6` a `left-6`.
- `front/Andres_Bakery/src/App.tsx` con 1604 líneas, contra el máximo de 300 de R05.
