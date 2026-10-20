# status.md · Andres Bakery

**Versión:** 0.16.0 · **Última actualización:** 2026-10-19

## 1 · Dónde estamos

El repo tiene 4 meses de código y **estuvo 7 meses quieto** hasta el 2026-10-16, cuando se le aplicó el SDD por el flujo brownfield (R15). Desde entonces van ocho ciclos: T0–T3 el 16, **T10–T17 el 17**, T6/T6b el 18 y 19, y **T4-F19a + T18 el 19**.

**Salud medida hoy, no deducida:**

| Check | Resultado |
|---|---|
| Tests del back | **365 OK** (eran 343 antes del recargo del sabor; 22 nuevos, 9 de ellos de la revisión) · eran 228 al abrir el día |
| Tests del front | **207 OK** — Vitest, lógica pura (ADR-023). Eran 179 antes del recargo del sabor; eran 90 al abrir el día |
| Lint del front (eslint + tsc) | limpio |
| Build del front | verde — **423,58 KB JS · 36,15 KB CSS**. La historia: 381,91 al abrir el día → 411,39 con la pestaña de gustos, la personalización de la ficha y el detalle del renglón → 420,71 con los pop-ups del panel → 423,58 con el recargo del sabor (+2,9 KB) |
| Migraciones | **`0009` aplicada** (el recargo del sabor y el que cobró el pedido), probada **para abajo y para arriba sobre una copia de la base de desarrollo con datos**: las filas y las restricciones quedaron iguales. Antes, **`0006`, `0007` y `0008` aplicadas** (el tamaño vendido en el renglón, los grupos de opciones, y la personalización + el registro de fotos), probadas para arriba y para abajo sobre una copia de la base real **con datos sembrados a propósito**, otra vez para arriba, y desde base vacía. Antes, **`0005`** (el ingrediente gana su nombre normalizado con índice único, ADR-030), probada en los dos sentidos sobre una copia con un choque sembrado. Antes, **`0004`** (el mail del cliente pasó a opcional), probada para abajo y para arriba sobre la base real. Antes, **`0003`**. Probada sobre una copia antes que sobre la real, en los dos sentidos y desde base vacía |
| App corriendo | back en `127.0.0.1:5000`, front en `127.0.0.1:5173`. Probado en navegador: giro por hover, subida de una foto real de punta a punta, panel con gráficos, perfil y `/cv` |
| Responsive 390px | `/cv`, `/historia`, `/tienda` y `/admin`: cero desbordes, medido con `scrollWidth` vs `clientWidth` |
| Archivos > 300 líneas | **ninguno**, y costó: `models.py` (396) se partió en paquete, `lib/types.ts` (333) también, `order_service.py` dejó el renglón en su módulo, `usePanelDeAdmin.ts` sacó los valores iniciales y las acciones, y dos archivos de tests se partieron en dos |
| Encontrado usando la página | el hover le borraba la rotación al dorso de la tarjeta (0.7.1). Lo vio el humano, no los tests ni el reviewer: **nadie había pasado el mouse por encima de una tarjeta ya dada vuelta** |
| Revisión independiente (T7) | dos revisores que **re-ejecutaron**: uno funcional y uno de seguridad. **Doce hallazgos reales**, todos corregidos con su test: 500 con HTML en la ruta pública, el tope de mensaje que no acotaba nada, `method` sin lista blanca (envío $0 cobrando de menos), el tope por IP que quemaba cupo con errores de formulario, mail a destinatario arbitrario, `debug=True` en el entry point, textos sin tope, notas que fingían campos del sistema, la ruta con token sin tope, y tres del limitador. **Y uno que salió mirando el panel: el pedido de invitado le aparecía a Andrea como «undefined», sin nombre ni teléfono** |
| Revisión independiente (T6-F20) | dos revisores que **re-ejecutaron**. El de seguridad: **APPROVED**, sin XSS (probó un `<img onerror>` de punta a punta), autorización correcta (401/403/422, y `admin_required` relee `is_admin` de la base), y **un MEDIA**: `ingredient_service` no limita largos y entraron 4 MB en un `name` que el `GET` público devuelve. El funcional: **CHANGES_REQUESTED**, 13 hallazgos, 3 bloqueantes — los tres arreglados con su test. Y probando el arreglo apareció el que más importa: **la unicidad es exacta en el back y normalizada en el front**, así que el duplicado entra igual |
| Revisión independiente (T10–T14) | dos revisores que **re-ejecutaron** (R30/R31). Entre los dos encontraron **seis cosas reales**: el techo de gasto de la IA en memoria, una carrera que devolvía 500 en un endpoint público, un filtro de URL con un agujero de un carácter, rutas basura contadas como la portada, un gráfico que ignoraba el filtro de fechas, y dos tests que pasaban de casualidad. **Las seis quedaron corregidas con su test**, cada uno visto en rojo primero |
| Dependencias | **0 avisos** en los dos lados (`npm audit` y `pip-audit`). Eran 16 y 57 |
| Pedido de invitado | **probado en el navegador sin sesión**: carta → carrito → checkout → pedido #6, link de `wa.me` con el texto que arma el back, y el pedido visible en el panel de Andrea con nombre y teléfono |
| F20 en el navegador | **medido, no mirado**: `azucar` reusa «Azúcar» (1 solo `POST /api/ingredients`), Enter en el campo de ingrediente **no** guarda el producto (`0 POST /api/products`), y 375px y 390px con `scrollWidth - clientWidth = 0` |
| Revisión independiente (T4-F19a + T18) | **hecha, y encontró cosas de fondo.** Dos revisores que **re-ejecutaron**: el funcional (`CHANGES_REQUESTED`, 14 hallazgos) y el de seguridad + pentester (`CHANGES_REQUESTED`, 9, **ninguno CRÍTICA ni ALTA**). Lo central de la tanda aguantó: 22 formas de `variant_id` y ninguna pagó de menos, 33 payloads contra la URL de la foto y solo entraron las nuestras, el tope por IP no se saltea con 10 headers de proxy distintos, y 30 combinaciones de credencial × ruta de admin dieron 401/403/422. **Lo que rompieron: la cuota se pasaba 5,7× con seis subidas simultáneas** (el mismo `check-then-insert` de ADR-030, en otro archivo), **los ids de variante se movían en cada guardado** —ADR-029 parte 3 estaba escrita como hecha sin estarlo— y dos 500 con HTML en una API JSON. **Todo corregido con su test**; ver `review_T18.md` y `security_review_T18.md` |
| Revisión independiente (T4-F19b) | **hecha**: `CHANGES_REQUESTED`, 14 hallazgos, **3 ALTA** y las tres de lo mismo — lo que el panel avisa, el back no lo validaba. La peor: un precio de `1e400` dejaba `GET /api/products` con **JSON inválido** y la web en blanco para todos los visitantes. Corregidas con su test |
| Pop-up de edición (ADR-034) | **medido en 1920px**: el panel usa 1905 y el sitio 1664 (eran 1280); el pop-up abre con los datos, cierra con Escape, guarda desde el pie y no mueve los ids. A 390px no hay pop-up, como se pidió |
| Pop-up en todo el panel (ADR-035) | **medido en 1920px y 390px**: en computadora abren en pop-up la etiqueta, el grupo, el editor del grupo, las tres secciones del perfil y el texto institucional; **a 390px ninguno de formulario** (el editor del grupo se abre dentro de la tarjeta) y el **cartel de borrado sí aparece** (342 px). Desborde 0 en las dos medidas |
| Borrar sin preguntar | **era real y está cerrado**: "Eliminar" en un producto y "Borrar" en una etiqueta borraban de una, con el botón al lado del de editar. Ahora preguntan, nombrando lo que se pierde |
| Revisión independiente (T19-F60) | **hecha**: `CHANGES_REQUESTED`, 16 hallazgos (1 ALTA, 7 MEDIA, 8 BAJA). El ALTA **no era de código**: los MDs decían que esto no se había visto en el navegador cuando sí, o sea documentación que manda a repetir trabajo hecho. Lo de fondo: **Escape adentro del editor cerraba el pop-up entero**, **no había forma de abandonar un nombre tipeado** (el `onBlur` lo guardaba al cerrar y la X de cancelar se había perdido en el refactor), **el pop-up se cerraba aunque el guardado fallara**, y **"Cerrar" no cancelaba** en perfil ni historia. Los 7 MEDIA y 5 BAJA corregidos, con 3 tests nuevos. Verificó además 10 sospechas que **estaban bien** |
| Revisión independiente (T20-F61) | **hecha**: `CHANGES_REQUESTED`, 10 hallazgos (1 ALTA, 4 MEDIA, 5 BAJA), **los diez corregidos**. El ALTA: **el sabor no tenía testigo**, así que borrando uno y dejando que SQLite reusara su id, una torta de $14.200 se cobró **$23.200** (el reviewer lo midió). Es el mismo agujero que ADR-029 ya había cerrado para el tamaño. Además: el *"desde $X"* de la carta podía quedar por debajo del mínimo comprable **y el ADR afirmaba lo contrario**, escribir «1.500» guardaba $1,50, el alta de un sabor que ya existía descartaba el recargo mientras avisaba que lo guardó, y el recargo cobrado no se veía en ninguna pantalla. Verificó además que V4 aguanta (siete inyecciones distintas, el total no se movió) y que el refactor no se llevó ningún texto |
| Recargo por sabor (F61) | **anda de punta a punta, medido**: con «Relleno: Chocolate +$800» y «Bizcocho: Chocolate +$1.500», la ficha dice $16.500 sobre el tamaño de $14.200 y el pedido se cobró $44.201 por dos de 12 porciones. Un `price_delta` mandado en el pedido **se ignora**; un descuento se rechaza en castellano |
| Lo que encontró el navegador en F61 | **la ficha mostraba el precio sin los recargos** —$14.200 donde el back iba a cobrar $16.500— con las dos suites en verde. El hook de la ficha le pasaba el tamaño al cálculo y no los sabores: la función estaba bien, lo que estaba mal era lo que se le daba. Corregido pasando la personalización entera |
| Navegador sin Playwright | el MCP **no conectó** en esta sesión (también `github` y `codegraph`). Los Chromium que dejó instalados estaban en disco, así que se manejó uno de verdad **hablando CDP a mano** (`scratchpad/cdp.py`, WebSocket crudo): navegar, clickear, leer la pantalla y sacar la foto. Es lo que permitió cumplir R07 en vez de dar por buena una pantalla sin mirarla |
| Gustos cargados en la base de desarrollo | **dos grupos, no uno**: «Relleno» (Dulce de leche, **Chocolate +$800**, Crema) y **«Bizcocho» (Chocolate +$1.500, Vainilla)**, nuevo. Los dos están marcados en «Cheesecake de Frutos Rojos» y la ficha pública pide los dos antes de agregar al carrito. Lo pidió el humano al ver que faltaba el del bizcochuelo; los sabores reales los define la chef |
| Rama | `dev`, adelantada respecto de `main` |

## 2 · Avance por feature

Lo heredado (F01–F12) está Complete salvo lo anotado. De lo pedido el 2026-10-16, sigue abierto lo mismo que antes. Lo pedido el **2026-10-17** cerró entero:

| ID | Feature | % | Estado |
|---|---|---|---|
| F42 | Hover que da vuelta la tarjeta | 100% | **Complete** — y el dorso ganó el "Agregar" (ADR-016) |
| F43 | Redes sociales en el perfil | 100% | **Complete** — falta que ella cargue sus links reales |
| F44 | CV / perfil profesional en `/cv` | 100% | **Complete** — falta su trayectoria real |
| F45 | Subir fotos desde el panel | 100% | **Complete** — N5 activado con sus controles |
| F46 | Asistente de recetas con IA | 100% | **Complete, apagado** — necesita `ANTHROPIC_API_KEY` y la decisión de gastar |
| F47 | Gráficos de ventas | 100% | **Complete** |
| F48 | Visitas medidas sin cookies | 100% | **Complete** |
| F50 | Header limpio + menú de cuenta | 100% | **Complete** — T15 |
| F51 | `/cuenta`, el perfil de quien usa el sitio | 100% | **Complete** — T15 |
| F52 | Panel lateral fijo o que se abre al acercarse | 100% | **Complete** — T15 |
| F53 | La tarjeta gira con un clic en la foto | 100% | **Complete** — T15, reemplaza el hover de F42 |
| F49 | Panel más fácil | 100% | **Complete** — la foto se sube, el borrador prellena |
| F23 | Pedido por WhatsApp | 100% | **Complete** — T7, el back arma el mensaje (ADR-025) |
| F31 | Invitado, cliente y admin | 100% | **Complete** — T7, el invitado ya compra sin cuenta |
| F55 | Tope de requests por IP | 100% | **Complete** — T7, cierra D2 (ADR-026) |

**Lo que sigue abierto de las tandas anteriores** (en este ciclo cerraron **F57, F58, F59** y la mitad que importaba de **F19**): F19 (cargar variantes desde el panel, `T4-F19b`), F22 (que el checkout respete el flag por producto, 60%), F24 (su texto y su foto), F32 (vista propia de cliente), F26 (PedidosYa, diferida) y F41 (deploy, diferida).

| ID | Feature | % | Estado |
|---|---|---|---|
| F20 | Ingredientes desde el panel | 100% | **Complete** — T6 + T6-F20b. Se eligen, se corrigen y se borran, y el duplicado lo frena el back (ADR-030) |
| F19 | Variantes de tamaño | 100% | **Complete** — `T4-F19a` (se cobra el elegido) + `T4-F19b` (se cargan desde el panel). Cierra lo que venía abierto desde T3 |
| F57 | Los gustos los define la chef | 100% | **Complete** — T18. Grupos globales con sus sabores, y en cada producto se marca cuáles aplican |
| F58 | El cliente arma su torta | 100% | **Complete** — T18. Elige una opción por grupo, escribe cómo la quiere, y el servidor valida contra los grupos de ESE producto |
| F59 | Foto de referencia | 100% | **Complete** — T18. Ruta pública con sus cuatro controles, y las fotos van a Cloudinary si hay credenciales (ADR-032) |

> ~~**F20 se movió un poco sin querer:** el asistente de IA propone ingredientes y el panel los **muestra para copiar**, porque guardarlos todavía no se puede. Cuando F20 cierre, ese bloque pasa a ser un clic.~~ **Cerrado el 2026-10-18:** ya es un clic. Con una salvedad honesta: el clic **no se vio correr en el navegador** porque la IA está apagada por B7. Lo que está probado es la decisión que toma (`estadoDelSugerido`), no el clic.

## 3 · Bloqueos

| # | Bloqueo | Quién lo destraba |
|---|---|---|
| B1 | F24: falta **su historia escrita y una foto**. El perfil, las redes y el CV ya tienen dónde entrar | Andrea → `material-cliente/` |
| ~~B2~~ | ~~F23 no tiene número de WhatsApp~~ | **destrabado el 2026-10-17**: salió de la etiqueta que mandó ella (11-7059-5319). Cargado en `backend/.env`, fuera de git |
| B4 | F22 no tiene zona ni costo de envío reales | Andrea |
| B5 | F07 (Mercado Pago) no tiene credenciales | Andrea, o se queda apagado (ADR-002) |
| **B8** | **Cloudinary no tiene credenciales.** La capa está construida y testeada; sin las cuatro variables en `backend/.env`, las fotos siguen yendo al disco local | el humano: dijo que las carga él (ADR-032) |
| **B7** | **F46 no tiene `ANTHROPIC_API_KEY`**, y prenderlo cuesta plata (`costs.md`: ~USD 0,02 por borrador). Está construido y testeado con un cliente falso | el humano decide: la llave y el gasto |

**B8 no bloquea nada hoy**: sin credenciales el back guarda en disco y todo funciona igual; lo que
no está resuelto hasta cargarlas es la persistencia en el deploy (F41). Ninguno bloquea lo que se
construyó. B7 es una decisión, no un impedimento técnico — pero desde F20 tiene una consecuencia medible: el botón que agrega de un clic los ingredientes que propone la IA **no se pudo ver andando en el navegador**, porque la IA está apagada. Es lo primero a mirar el día que se prenda.

## 4 · Deuda registrada

Lo de 0.5.0 sigue igual salvo lo tachado. **D3 se cerró** y entraron tres deudas nuevas, todas nacidas de la subida de archivos:

| ID | Deuda | Desde | Nota |
|---|---|---|---|
| D1 | Token de sesión en `localStorage`, no en cookie `httpOnly` | 2026-10-16 | sigue |
| ~~D2~~ | ~~Sin rate limit en ningún endpoint~~ | **resuelta 2026-10-17** | ADR-026: topes por IP en el pedido público, el login, el registro y el contacto, con `Retry-After`. **`/api/metrics/view` quedó afuera a propósito**: cuenta visitas y limitarlo por IP sesgaría el número que ella mira. La nota vieja decía: **subió de prioridad**: `POST /api/uploads` es admin-only, pero `/api/metrics/view` es público y sin límite. Ya **no puede crear filas** (la lista blanca de rutas lo acota a ~39 por día) ni tirar un 500 (la carrera se cerró), pero sigue siendo una escritura con commit por request: un bot ensucia el número que ella mira y hace trabajar la base de arriba |
| ~~D3~~ | ~~Sin headers de seguridad~~ | resuelta 2026-10-17 | globales en `after_request` (ADR-018) |
| D4 | Firma del webhook de MP sin validar | 2026-10-16 | sigue |
| D5 | Ninguna lista pagina | 2026-10-16 | el panel ya no depende de eso para contar (`/api/metrics/summary`) |
| D6 | Respuestas de escritura inconsistentes | 2026-10-16 | sigue |
| **D21** | **A 320px** (por debajo del mínimo que nos pusimos, 390) `/tienda` desborda 15px | 2026-10-17 | lo midió el reviewer. A 390 está impecable en las 11 rutas. Queda anotado por si alguna vez baja el piso |
| ~~D7~~ | ~~Cero tests de front~~ | **resuelta en parte** 2026-10-17 | entró Vitest (ADR-023) y la **lógica pura** quedó cubierta con 48 tests. Lo que sigue sin red son los **componentes**: para eso hace falta `jsdom` + Testing Library, con su propia decisión. La línea vieja decía: **sigue creciendo**: ya hay seis funciones puras sin cubrir y el bug de los emojis en `iniciales` salió de una lectura, no de un test. Entra Vitest cuando se apruebe la dependencia. **crece**: hay lógica propia que lo amerita (`ejeY`, `normalizar_ruta` del lado del front, `urlDeImagen`). Lo de arriba se probó en navegador, no con tests |
| D8 | Retención y borrado de datos personales sin definir | 2026-10-16 | sigue. Las visitas **no** agrandan esto: son contadores sin persona (ADR-019) |
| ~~D27~~ | ~~El espejo de la etiqueta es un string en los dos lados~~ | **resuelta 2026-10-19** | el back lo dice en `GET /api/site/delivery` (`personalization_tag`) y el front lo pregunta; la constante queda como red. La nota vieja decía: | el back decide por **slug**, y el slug no cambia al renombrar (lo verificó el reviewer; la primera versión de esta línea decía lo contrario). Lo que sí puede pasar: dos etiquetas que se llamen igual y solo una habilite. El panel ahora **nombra la parecida**. La salida de verdad es que el back exponga el slug en `/api/site/delivery` |
| ~~D28~~ | ~~`tag_service` compara el nombre exacto~~ | **resuelta 2026-10-19** | compara normalizado, como los ingredientes (ADR-030) y los grupos. **Con una salvedad**: lo decide un barrido en Python, no una columna con índice único, así que **no aguanta concurrencia** — dos altas simultáneas con la misma grafía pasan las dos. Con diez etiquetas no se nota; el día que sean cientos es la migración de ADR-030. La nota vieja decía: | «Tortas Personalizadas» y «tortas personalizadas» entran como dos etiquetas y solo una habilita la personalización. Es el mismo bug que ADR-030 cerró para ingredientes y que F57 heredó para los grupos: el único que quedó sin normalizar es el de las etiquetas |
| **D19** | **Se tira el perfil de color de la foto.** El limpiador descarta el chunk `iCCP`/los APPn, así que una foto de iPhone en Display P3 conserva sus píxeles pero pierde el perfil y el navegador la dibuja como sRGB | 2026-10-17 | lo marcó el reviewer y es **de producto, no de seguridad**: en una repostería la foto *es* el producto y el corrimiento de color se ve. Hoy es el precio de no tener `Pillow`; se resuelve igual que D16 |
| **D20** | **La llamada real al SDK de Anthropic no tiene test.** El parseo de la respuesta sí (`leer_respuesta`, que salió afuera justo para eso); lo que no se ejercita nunca es `messages.create` | 2026-10-17 | es la frontera con una librería de terceros. Si algún día cambia la forma del pedido, lo vamos a ver en producción y no en los tests |
| **D16** | **WEBP y HEIC se rechazan.** HEIC es el default de iPhone | 2026-10-17 | el mensaje lo nombra y dice qué hacer, pero si ella saca fotos con iPhone lo va a ver seguido. Se arregla con `Pillow` o convirtiendo en el navegador antes de subir |
| **D17** | **Lo subido no se borra nunca** ⇒ **acotada el 2026-10-19**: las fotos de referencia que nunca llegaron a un pedido **se borran solas** (nacen provisorias, el barrido se las lleva; las usadas no se tocan nunca). Cambiar la foto de un producto **sigue** dejando la anterior | 2026-10-17 | lo que falta es el barrido de las fotos de producto, que no se puede hacer igual: no se sabe cuál usa cada producto sin leer `image_url` de todos. Y **borrar un pedido a mano deja su foto marcada como usada para siempre**: hoy no hay forma de borrar un pedido desde la app |
| ~~D18~~ | ~~No hay cuota de disco para las subidas~~ | **resuelta 2026-10-19** | ADR-032: la fila se reserva y después se verifica la suma —medir-y-escribir dejaba pasar seis subidas simultáneas, lo midió el reviewer— y cada puerta tiene su techo (`REFERENCE_UPLOAD_QUOTA_BYTES`). Pasarse es un **507 explicado**, distinto para ella y para quien compra. Ojo con lo que no cuenta: las fotos que ya estaban en disco antes del registro `stored_image` no tienen fila, así que la cuota las cuenta de menos hasta que se reemplacen |
| D14 | El carrito guarda una foto del producto en `localStorage` | 2026-10-16 | sigue |
| D15 | Mensajes de error de la API en inglés | 2026-10-16 | los nuevos (subida, IA, métricas) **salen en castellano**; los viejos siguen igual |
| D9 | Varios `.py` del back arrancan con BOM | 2026-10-16 | cosmético |
| ~~D23~~ | ~~16 avisos en el front~~ · ~~57 en el back~~ | resueltas 2026-10-17 | ADR-024. Los dos lados en **0**. La próxima auditoría: `pip install -r backend/requirements-dev.txt` y `python -m pip_audit` |
| **D25** | **El tope por IP vive en la memoria del proceso** | 2026-10-17 | no sobrevive un reinicio y con N workers el tope real es N veces el configurado. Detrás de un proxy, `remote_addr` es el proxy: el deploy necesita `ProxyFix` o todo el tráfico cuenta como una sola IP. Se muda a Redis o al proxy cuando haya deploy (ADR-026) |
| **D26** | **El pedido de invitado no se puede consultar después** | 2026-10-17 | quien pidió sin cuenta tiene su número y su mensaje de WhatsApp, y nada más: no hay una pantalla donde ver el estado. Hoy lo resuelve la conversación con Andrea, que es como ella trabaja. Si alguna vez hace falta, el camino es un link con token por pedido, no exponer `/api/orders/<id>` |
| **D24** | **El logo dice "ANDRE'S BAKERY" y el sitio dice "Andres Bakery"** | 2026-10-17 | no se cambió solo: es el nombre de su marca y lo decide ella. Afecta el header, el `<title>`, el footer y los textos |
| ~~D23-viejo~~ | **16 avisos de seguridad en las dependencias del front, 12 altos.** `react-router-dom` (la mayoría de modo SSR, que no usamos; **dos sí aplican**: open redirect por barra invertida y por ruta `//`), `vite` (tres altos, todos del servidor de desarrollo), `postcss`, `nanoid` y las de `eslint` | 2026-10-17 | medido al instalar Vitest, que **no** los trajo. Actualizar es R19: pide su OK y su verificación. `react-router-dom` se arregla con un salto de versión menor |
| D10 | ~~`pip-audit` y `npm audit` sin correr~~ (R19) | 2026-10-16 | `npm audit` **corrió el 2026-10-17**: resultado en D23. `pip-audit` sigue pendiente | **ahora importa más**: entró `anthropic` como dependencia nueva |
| ~~D11~~, ~~D12~~, ~~D13~~ | | resueltas | ver 0.4.0 y 0.5.0 |

## 5 · Próximo paso propuesto

**Cerró el 2026-10-19:** `T4-F19a` (el tamaño se cobra), la tanda **T18** entera (F57, F58, F59),
`T4-F19b` + ADR-034, D27/D28, **T19-F60** (el pop-up en todas las pestañas + la confirmación de
borrado, ADR-035) y **T20-F61** (el recargo por sabor, ADR-036). Los dos con su navegador y su
reviewer independiente: la línea que acá pedía mirar T19-F60 quedó vieja y se corrige en este
commit. La cola, en orden:

1. **Ofertas.** Lo pidió el humano al cerrar T20: una etiqueta "oferta", poder etiquetar varios
   productos de una, tope de **tres etiquetas visibles** por producto con la de oferta siempre
   visible, y dar vuelta la tarjeta para ver el resto.
2. **F41 · Deploy** (ADR-014). Las fotos ya no son un problema sin resolver —van a Cloudinary con
   cargar cuatro variables (B8)—, pero **el tope por IP sigue necesitando `ProxyFix`** (D25) y
   ahora importa más, porque la ruta pública de archivos depende de él.
3. **F32 · Vista propia de cliente**, separada de la mirada de admin.
4. **D24 · El nombre de la marca**: el logo dice "ANDRE'S BAKERY" y el sitio "Andres Bakery".

**Lo que Andrea tiene que hacer para que lo de hoy se vea en su sitio** (y no lo puede hacer el
código): ponerle la etiqueta **«tortas personalizadas»** a sus tortas a pedido, y cargar los grupos
de gustos que ella ofrezca de verdad. La etiqueta y un grupo "Relleno" de ejemplo quedaron creados
en la base de desarrollo; sus sabores reales los pone ella.

**Sin cambios:** F24 sigue esperando **la historia escrita y la foto de Andrea**, y ahora también
**sus redes y su trayectoria** si quiere el CV publicado. Nada de eso se inventa.
