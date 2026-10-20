# features.md · Andres Bakery

**Versión:** 0.2.0 · **Última actualización:** 2026-10-17

Estados (§5 del master): Specified 20% → Planned 40% → Tasked 60% → In Progress 80% → Complete 100%.

## A · Lo que ya existe y funciona (heredado, sin SDD)

| ID | Feature | Estado | Nota |
|---|---|---|---|
| F01 | Registro e ingreso con JWT | Complete | `AuthContext` + `/api/auth/*`. Token en `localStorage` (ver `security.md` N1) |
| F02 | Carta pública de productos | Complete | `ShopPage`, precio plano sin unidades ni cantidad |
| F03 | Carrito | Complete | `CartContext` + `CartDrawer` |
| F04 | Alta de orden con datos de entrega | Complete | el total lo calcula el servidor |
| F05 | Mis pedidos | Complete | `OrdersPage` |
| F06 | Panel de admin | Complete | 5 pestañas: resumen, productos, recetas, pedidos, historia |
| F07 | Checkout Mercado Pago | **Blocked** | implementado y testeado con fake; sin credenciales no corre (ADR-002) |
| F08 | Contacto por mail | Complete | `/api/contact`, usado por el "Soporte guiado" |
| F09 | Texto "sobre mí" editable | Complete | `/api/site/about`, pestaña "historia" del panel |
| F10 | Carrusel del hero | Complete | con slides de fallback en el código |
| F11 | CRUD de recetas | Complete | **se jubila** por ADR-001 |
| F12 | CRUD de ingredientes | **Orphan** | el back lo expone entero, el front no lo usa. Lo revive ADR-001 |

## B · Lo que pidió el humano el 2026-10-16

| ID | Feature | Estado | Tarea | Depende de |
|---|---|---|---|---|
| F13 | Partir `App.tsx` en módulos ≤300 líneas | **Complete** | T1 | — (R05, FIJA) |
| F14 | Tokens de diseño + estética pixel pastel | **Complete** | T2 | F13 |
| F15 | 4 temas estacionales con selector persistido | **Complete** | T2 | F14 |
| F16 | `Product` absorbe la receta (modelo nuevo) | **Complete** | T3 | `Recipe` borrada; su contenido migro a `Product` sin perder filas |
| F17 | Precio por unidad: `unit_label`, `min_qty`, `qty_step` | **Complete** | T3 | validado **del lado del servidor**, no solo en el carrito (V4) |
| F18 | Selector de cantidad con total en vivo ("5 brownies = $X") | **Complete** | T3 | `QuantityPicker`: salta de a `qty_step` en ficha, carrito y panel rapido |
| F19 | Variantes de tamaño para lo que se vende entero | **Complete** (2026-10-19) | T3 · T4-F19a · T4-F19b | el tamaño elegido **se cobra** (ADR-029) y se **carga desde el panel**: agregar, renombrar, cambiar precio, reordenar y borrar |
| F20 | Ingredientes relacionales visibles en la carta | **Complete** | T6 | se ven en el dorso y en la ficha, se **eligen, corrigen y borran** desde el panel, y la unicidad —sin acentos ni mayúsculas, conservando la ñ— la decide el back (ADR-030) |
| F21 | Etiquetas que crea ella (sin TACC, vegano…) + filtro | **Complete** | T3 | CRUD en el panel + filtro `?tag=` resuelto por el back |
| F22 | Retiro / envío por producto + zona y costo de una sola fuente | **In Progress** | T9 | `allows_pickup`/`allows_delivery` y `/api/site/delivery` listos (mata el 2500 hardcodeado, C4); falta que el checkout respete el flag por producto |
| F23 | Pedido por WhatsApp (`wa.me` con mensaje armado por el back) | **Complete** | T7 | ADR-025. Probado de punta a punta en el navegador, sin cuenta |
| F24 | Cartilla de Andrea: historia, foto, cómo llegó a ser repostera | **In Progress** | T8 | la página existe en `/historia`; falta **su texto y su foto** |
| F25 | Ficha de producto con descripción larga, ingredientes y etiquetas | **Complete** | T3 | `/producto/<slug>`; el slug **no se mueve** si ella corrige el nombre |
| F26 | Link de salida a PedidosYa | **Deferred** | T7 | todavía no tiene tienda; la quiere a futuro (ADR-008) |
| F27 | Higiene: borrar `front/api/*.js`, sacar `stripe`, crear `.env` | **Complete** | T0 | — |
| F28 | Receta paso a paso publicada en la ficha (`Product.steps`) | **Complete** | T3 | un paso por linea; vacia ⇒ la seccion no se renderiza (V10) |

## B2 · Pedido del humano el 2026-10-16 (segunda tanda, por dictado)

Todavía **sin tarea asignada**: entran al backlog, no al código, hasta decidir el orden y las preguntas abiertas (R04/R08).

| ID | Feature | Estado | Depende de |
|---|---|---|---|
| F29 | Navegación: menos ítems arriba **o** drawer lateral, elegible | **Complete** | ADR-011 |
| F30 | Pantalla de **Configuración**: tema, tipografía, tamaño de letra, posición del nav | **Complete** | F14-F15 |
| F31 | **Tres roles explícitos**: invitado (sin login), cliente (con login), admin (Andrea) | **Complete** | T7 cerró lo que faltaba: `POST /api/orders/whatsapp` es pública y el invitado compra sin cuenta (ADR-025). El panel ve esos pedidos con nombre y teléfono |
| F32 | Catálogo con pestaña/vista propia de cliente, separada de la mirada de admin | Planned | F31 |
| F33 | Tarjetas de la carta que **se dan vuelta** | **Complete** | con T3 ya muestran ingredientes, etiquetas y el aviso de preparacion |
| F34 | Carrito con **vista propia** (`/carrito`) | **Complete** | — |
| F35 | Rehacer el "Soporte guiado" | **Complete** | ADR-013: ahora es un panel de Ayuda |
| F36 | Contacto por **WhatsApp** desde soporte | **Complete** | el numero salio del `.env` del front: ahora viene del back (`WHATSAPP_PHONE`), una sola fuente. Sigue sin cargarse |
| F37 | **Placeholder de PedidosYa** en el footer | **Complete** | dice "próximamente" hasta que tenga tienda |
| F38 | **Responsive** | **Complete** | 390px medido con `scrollWidth` vs `clientWidth` en carta, ficha, carrito, **checkout y panel**: cero desbordes |
| F39 | Login/Register **a la derecha del todo** | **Complete** | F29 |
| F40 | Más vistas propias | **Complete** | `/carrito`, `/configuracion`, `/historia` y ahora `/producto/<slug>` |
| F41 | **Deploy**: el front a Vercel | **Deferred** | ADR-014: después de T3 |

**Lo que se midió del soporte actual (F35), no opinión:** ocupa el alto completo del viewport y tapa el header; la fila de respuestas rápidas está debajo del historial, así que **cada mensaje la empuja y terminás tocando otro botón** (pasó en la prueba: clic en "Medios de pago", respondió "Pedidos personalizados"); hay dos barras de scroll anidadas; y es un FAQ de 3 botones más un formulario de contacto disfrazado de conversación.

## B4 · Pedido del humano el 2026-10-19 (que el panel se edite igual en todas partes)

Dicho por voz, y es un pedido de consistencia: *"si vamos a usar un pop-up en algún lugar, creo que
tendríamos que hacer eso mismo en otros lugares. Porque si no queda como en este lugar sí, en este
lugar no, queda medio raro"*. ADR-034 había puesto el pop-up en una sola pestaña **y lo había dicho**.

| ID | Feature | Estado | Tarea | ADR |
|---|---|---|---|---|
| F60 | **El panel edita en pop-up en todas sus pestañas**, y borrar algo que no se deshace pregunta antes | **Complete** (2026-10-19) · medida en navegador, **revisada** (16 hallazgos, los que importaban corregidos) y commiteada en `4146ea3` | T19 | ADR-035 |

**Lo que no se pidió y entró igual, porque apareció al abrir el código:** en la carta y en las
etiquetas, **borrar borraba de una**, sin preguntar, con el botón al lado del de editar. Los grupos
y los ingredientes sí preguntaban. Un panel que confirma donde el daño es chico y no confirma donde
es grande no es un detalle de forma.

## B3 · Pedido del humano el 2026-10-17 (tercera tanda, por dictado)

Todo esto entró con su ADR y su tarea en el mismo ciclo (R08). **F33 ya estaba hecho**: lo que faltaba era el hover, que es F42.

| ID | Feature | Estado | Tarea | ADR |
|---|---|---|---|---|
| F42 | La tarjeta **se da vuelta** sin perder el botón ni el "Agregar" | **Complete** | T10 | ADR-016, **reemplazada por F53/ADR-022**: el disparador dejó de ser el hover |
| F43 | **Redes sociales** de Andrea en su perfil (Instagram, TikTok y las que ella cargue) | **Complete** | T11 | ADR-017 |
| F44 | **CV / perfil profesional**: trayectoria, estudios, qué sabe hacer, en una vista imprimible (`/cv`) | **Complete** | T11 | ADR-017 |
| F45 | **Subir fotos desde el panel**, sin pegar links | **Complete** | T12 | ADR-018 |
| F46 | **Asistente de recetas con IA**: mira la foto y deja un borrador que ella corrige | **Complete (apagado)** | T14 | ADR-020 |
| F47 | **Gráficos de ventas** en el panel: facturación por día, pedidos por estado, lo que más se pide | **Complete** | T13 | ADR-019 |
| F48 | **Visitas a la página**, medidas sin cookies ni IP | **Complete** | T13 | ADR-019 |
| F49 | **Panel más fácil**: la carta se carga con un formulario guiado por pasos, con la foto arriba | **Complete** | T12 | ADR-018 |

## B4 · Pedido del humano el 2026-10-17 (cuarta tanda, por dictado)

Todo sobre diseño, mirando lo que había quedado de las tandas anteriores.

| ID | Feature | Estado | Tarea | ADR |
|---|---|---|---|---|
| F50 | **Header limpio**: hamburguesa solo en celular, la estación adentro de Configuración, y la cuenta como un círculo con iniciales que junta Perfil, Administrador, Configuración y Salir | **Complete** | T15 | ADR-021 |
| F51 | **Perfil de quien usa el sitio** (`/cuenta`): sus datos y sus accesos | **Complete** | T15 | ADR-021 |
| F52 | **Panel lateral elegible**: siempre abierto, o que se abra al acercarse | **Complete** | T15 | ADR-021 |
| F53 | **La tarjeta gira con un clic en la foto**, no con el hover | **Complete** | T15 | ADR-022 |
| F54 | **Su logo de verdad** en el header y de favicon, y sus datos de contacto reales | **Complete** | T17 | ADR-024 |
| F55 | **Tope de requests por IP** en el pedido público, el login, el registro y el contacto | **Complete** | T7 | ADR-026, cierra D2 |
| F56 | **El panel muestra el pedido de invitado**: nombre, teléfono y notas | **Complete** | T7 | salió de mirar el panel: decía «undefined» |

## B5 · Pedido del humano el 2026-10-19 (que el sabor pueda costar más)

Textual: *"el precio por sabor… creo que eso le da un poco más de libertad al chef de decir, ah,
bueno, la de chocolate la vamos a hacer un poco más carita"*. Salió de la pregunta que quedó abierta
en la tanda anterior: los sabores se podían cargar, pero ninguno podía costar distinto.

| ID | Feature | Estado | Tarea | ADR |
|---|---|---|---|---|
| F61 | **Un sabor puede tener recargo**, que el servidor cobra y el pedido guarda | **Complete** (2026-10-19) · medida en navegador a 1920px y 390px | T20 | ADR-036 (revisa a ADR-031) |

**Lo que revierte, dicho:** ADR-031 había contestado que no, que el precio salía del tamaño. Esto
cambia esa respuesta y **solo esa**: los grupos siguen siendo globales, la lista la sigue armando
ella, y el pedido sigue guardando nombres y no ids.

**Lo que el navegador encontró y los tests no podían ver:** la ficha mostraba el precio **sin** los
recargos —$14.200 donde el back iba a cobrar $16.500— porque el hook que arma el precio recibía el
tamaño pero no los sabores. Las dos suites estaban verdes.

## B3 · Pedido del humano el 2026-10-19 (tortas a pedido, por dictado)

Lo pidió el cliente de Facundo (la chef). El pedido, en sus términos: *"una sección en la cual las
personas puedan en una mini cartita o descripción escribir cómo quieren una torta"*, eligiendo
**por sección** (el relleno, la cobertura) de listas que **arma solo ella**, más una foto de
ejemplo. Las cuatro ambigüedades del dictado se preguntaron antes de escribir nada (R04) y están
resueltas en ADR-031.

| ID | Feature | Estado | Tarea | ADR |
|---|---|---|---|---|
| F57 | **Grupos de opciones y sus sabores**, que define la chef desde el dashboard | **Complete** (2026-10-19) | T18 | ADR-031, ADR-030 |
| F58 | **El cliente arma su torta**: elige una opción por grupo, escribe cómo la quiere, y eso viaja con el pedido | **Complete** (2026-10-19) | T18 | ADR-031, ADR-033 |
| F59 | **Foto de referencia** subida por el cliente, con topes y con limpieza de huérfanas | **Complete** (2026-10-19) | T18 | ADR-031, ADR-032 |

**Lo que el cliente NO elige, y es la mitad del pedido:** los sabores. La lista la arma la chef; la
persona que compra elige de esa lista y describe el diseño. Esa frontera es la feature, no un
detalle de implementación: sin ella el pedido sería texto libre y ella no podría cumplirlo.

**F58 depende de `T4-F19a`.** Con personalización, dos tortas iguales con distinto relleno son dos
renglones del carrito, y hoy el carrito indexa por `product.id`. F19a ya tiene que tocar esa misma
identidad para las variantes de tamaño: hacerlo dos veces es hacerlo mal una vez.

**F59 movió la clasificación de seguridad, y se pagó entera.** N5 dejó de ser "solo admin sube
archivos" y es **escritura pública de archivos**, la superficie más grande abierta hasta ahora.
Registrado y medido en `security.md` §1b y §2-N5 (R27). El humano eligió esta opción con el costo
sobre la mesa: la alternativa era pedir la foto por WhatsApp, donde la conversación ya sucede.

**Lo que se acotó el mismo día, y no estaba en la spec:** la personalización es **solo** para los
productos con la etiqueta `tortas personalizadas` (ADR-033). Una docena de cookies no se elige ni
se describe: se pide. La puerta es la etiqueta y no la presencia de grupos, porque un grupo mal
asignado no puede sacar un producto de la venta.

**Lo que las tres NO hacen, dicho claro:** los sabores **no mueven el precio** (sale del tamaño,
ADR-031), no hay media y media —una opción por grupo—, y quien pidió sin cuenta sigue sin una
pantalla donde consultar su pedido (D26). Cargar variantes desde el panel sigue siendo `T4-F19b`:
hoy se cargan por API o a mano.


**F53 revierte parte de F42.** El hover se construyó, se probó con el humano y se cayó en la prueba: con la tarjeta girando al acercar el puntero, el botón "Agregar" se escapa justo cuando alguien va a apretarlo. Quedó el "Agregar" del dorso, que había entrado para tapar ese problema y resultó útil igual.

**Por qué F44 (el CV) no es un desvío del proyecto.** El pedido fue textual: que un reclutador que entre a ver su emprendimiento encuentre ahí su CV. No cuesta ni una tabla nueva — es el mismo `SiteContent["profile"]` de F43 (ADR-017) — y el sitio ya es, de hecho, la prueba de que el emprendimiento existe. Lo único que hace falta que no está: **que ella cargue su trayectoria real**. Hasta entonces `/cv` muestra los huecos y no se linkea desde el perfil (misma regla que F24: no se inventa la biografía de una persona).

**Lo que F46 todavía no puede hacer, dicho claro:** sin `ANTHROPIC_API_KEY` el botón no aparece. Está construido y probado con un cliente falso, igual que Mercado Pago (ADR-002). Para prenderlo hace falta una llave y decidir el gasto: los números están en `costs.md`.

## C · Fuera de v1 (y por qué)

| Feature | Por qué no |
|---|---|
| Traer pedidos de PedidosYa al panel | sin API pública autogestionada (ADR-008) |
| WhatsApp Business API oficial | costo + verificación de negocio (`costs.md`) |
| ~~Subida de fotos desde el panel~~ | **entró el 2026-10-17** (F45, ADR-018): activa N5 y los controles fueron en el mismo ciclo |
| Cupones y descuentos | nadie lo pidió |
| Reseñas de clientes | nadie lo pidió, y trae moderación |
| Notificaciones push | la conversación ya está en WhatsApp |
| Traer ingredientes y fotos de APIs externas (Spoonacular, Edamam, TheMealDB, Unsplash) | era una propuesta escrita en `front/api/README.txt`, borrado en T0. Andrea carga su propia carta y una foto de stock no vende **su** producto. Queda anotado acá para no perder la idea |

## D · Lo que todavía no puedo especificar

Bloqueado por datos que no invento (R04). Actualizado el 2026-10-16 con las respuestas del humano:

- **F24** · ✅ la página existe (`/historia`), con ficha, zona y CTA a la carta. ❌ **falta su historia escrita y una foto** → `material-cliente/`. Hoy el sitio muestra el texto genérico que sembró `BootstrapService` ("Somos un emprendimiento familiar…"), **que no es de ella**: cuando lo reemplace desde Panel → Contenido, la página se completa sola. Si lo borra, aparece un recuadro punteado que dice qué falta.
- **F21** · ✅ confirmada **"sin TACC"** como etiqueta. El resto de su lista real sigue sin estar, pero el diseño es genérico (ADR-006) y no depende de eso para construirse.
- **F28** · ✅ confirmado: publica ingredientes **y** pasos.
- **F26** · ✅ resuelto: todavía no tiene tienda en PedidosYa ⇒ diferida.
- **F22** · ❌ falta la zona de entrega y el costo reales, y si cambian por producto.
- ~~**F23** · falta el número de WhatsApp~~ → **resuelto el 2026-10-17**: salió de su etiqueta (F54) y el flujo se probó con el número real.
- Retención y borrado de datos personales (`security.md` N2): ❌ sin definir.
