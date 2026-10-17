# decisions.md · ADRs de Andres Bakery

Decisiones con fecha y motivo, para no re-discutirlas. Una decisión no se borra: se marca **Revisada** y se escribe la que la reemplaza.

---

## ADR-001 · `Product` absorbe la receta: una sola entidad vendible

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Contexto:** el modelo tiene `Product` (precio, categoría, m2m con `Ingredient`) y `Recipe` (título, resumen, ingredientes como texto libre, pasos). Se pisan. La clienta quiere "cargar sus recetas y ponerles precio" — una sola cosa, no dos.

**Decisión:** `Product` es la entidad vendible y absorbe lo que aportaba `Recipe`. Los ingredientes pasan a ser relacionales (el m2m que ya existía y nadie usaba). `Recipe` se jubila.

**Por qué:** dos entidades para un concepto obliga a ella a cargar en dos pantallas y a nosotros a mantener dos CRUDs; y el m2m `Product.ingredients` ya estaba construido, solo faltaba usarlo. La alternativa de ligar `Recipe` ↔ `Product` solo paga si alguna vez quiere publicar recetas que **no** vende: hoy no es el caso (ver `spec.md` S3, pendiente de confirmar).

**Costo:** hay que migrar el contenido de las recetas sembradas por `bootstrap_service` y borrar `routes/recipes.py`, `recipesApi` y la pestaña de recetas del panel.

**Enmienda del 2026-10-16 (misma fecha, antes de escribir código):** preguntado si Andrea quiere publicar los ingredientes o la receta paso a paso, contestó **"ambas"**. `Product` suma un campo `steps` (texto, opcional) además de los ingredientes relacionales, y la ficha de producto muestra las dos secciones. **No vuelve `Recipe` como tabla:** sigue habiendo una sola entidad vendible y una sola pantalla de carga; lo que cambia es que esa entidad tiene un campo más. El supuesto S3 de `spec.md` quedó anulado y marcado como tal.

---

## ADR-002 · WhatsApp es el canal de pedido principal de v1

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Contexto:** el checkout actual tiene un único camino (Mercado Pago) y sin `MERCADO_PAGO_ACCESS_TOKEN` tira `ConfigurationError`. Nunca se pudo probar de punta a punta.

**Decisión:** el carrito crea la orden en la DB y abre `wa.me` con el detalle y el total prellenados. Mercado Pago queda detrás de `PAYMENTS_ENABLED` (default `false`).

**Por qué:** desbloquea O3 sin depender de credenciales de un tercero, y es como compra la gente en una repostería de barrio. Se usa `wa.me` y no la WhatsApp Business API porque esta última tiene costo y verificación de negocio (ver `costs.md`).

**Costo:** el pago no queda confirmado en el sistema; el estado lo mueve ella a mano desde el panel. Aceptado para v1.

---

## ADR-003 · La estética pixel se hace con CSS, sin assets

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Decisión:** paleta pastel, bordes chunky sin radio, sombras duras sin blur, tipografía pixel de Google Fonts en títulos y precios, íconos de `lucide-react` (ya está como dependencia). Cero sprites, cero imágenes nuevas.

**Por qué:** el look fiel de Stardew Valley necesita arte que habría que dibujar o licenciar, y el arte de Stardew no es nuestro para usar. Un CSS bien hecho da el 80% del carácter con 0 assets y 0 problemas de licencia. Si ella consigue arte propio, entra por `material-cliente/` y se suma encima sin rehacer nada.

**Costo:** no va a ser pixel art de verdad; va a ser "inspirado en". Se dijo de frente.

---

## ADR-004 · `App.tsx` se parte antes de cualquier feature nueva

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Contexto:** `App.tsx` tiene 1604 líneas. **R05 es regla FIJA** del SDD (≤300, máx 400): no se puede apagar.

**Decisión:** T1 (partir el archivo, sin cambiar comportamiento) es prerrequisito de T2 y de todo lo que toque el front.

**Por qué:** además de la regla, es la condición práctica para el theming: no se pueden pasar tokens a componentes que no existen como módulos. Y 1604 líneas en un archivo hacen que cualquier agente tenga que leerlo entero para cambiar un botón.

**Costo:** un ciclo entero sin feature visible. Se mide con `V1` y el riesgo se controla con lint + build + revisión en navegador (R07).

---

## ADR-005 · Cuatro temas estacionales por CSS custom properties

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Decisión:** primavera / verano / otoño / invierno, todos pastel, default primavera, elegibles desde el header y persistidos en `localStorage`. Tokens con nombre semántico (`--color-acento`), nunca el color literal.

**Por qué:** las estaciones son el gesto más reconocible de Stardew y dan 4 identidades con una sola arquitectura. Los nombres semánticos son lo que permite agregar un quinto tema sin tocar un solo componente.

**Costo:** 4 paletas que mantener y 4 que verificar en contraste (V2).

---

## ADR-006 · Las etiquetas las crea ella, no están en el código

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Decisión:** tabla `Tag` con CRUD en el panel, m2m con `Product`. No hay enum de etiquetas en el código.

**Por qué:** "sin TACC", "vegano", "sin lactosa", "frío", "por encargue" — la lista no la sabemos nosotros y va a cambiar. Una lista cerrada en el código obliga a un deploy para agregar una etiqueta, que es exactamente el tipo de dependencia del dev que O2 quiere eliminar.

**Confirmado el 2026-10-16:** "sin TACC" es **una etiqueta más** del sistema, no un campo propio del producto. El término venía deformado por el dictado ("sin tag") y se verificó con el humano antes de modelarlo.

**Nota legal:** una etiqueta "sin TACC" la pone ella bajo su responsabilidad; el software no la certifica. Queda escrito en `security.md` §datos de terceros.

---

## ADR-007 · Precio por unidad con mínimo y paso, variantes para lo entero

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Decisión:** `Product.price` es el precio de **una** unidad; `unit_label` dice de qué unidad hablamos; `min_qty` y `qty_step` modelan "mínimo 6, de 6 en 6". Lo que se vende entero con tamaños usa `ProductVariant` ("torta 8 porciones", "torta 12 porciones").

**Por qué:** el caso que pidió el humano es "cuánto me salen 5 brownies", que es precio unitario × cantidad. Las tortas enteras no entran en ese molde y meterlas a la fuerza (una torta = 1 unidad de precio alto) funciona hasta que hay tamaños. Dos mecanismos chicos y explícitos salen más baratos que uno genérico que nadie entiende.

**Costo:** el panel tiene dos modos de carga. Se mitiga con el default: si ella no toca variantes, el producto es por unidad y listo.

---

## ADR-008 · PedidosYa: solo link de salida

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Contexto:** se pidió "conexión con PedidosYa". Se investigó el 2026-10-16.

**Decisión:** un link a su tienda de PedidosYa si la tiene. Nada de traer pedidos ni sincronizar menú.

**Por qué:** no existe portal de desarrolladores público de PedidosYa con endpoints y autenticación para que un comercio se integre solo. Lo que hay es (a) la API de *PedidosYa Envíos*, con alta por su portal de envíos y pago por envío, orientada a despachar, no a recibir pedidos; (b) integraciones bidireccionales vía proveedores certificados como Deliverect, disponibles solo para clientes suyos; (c) la app de PedidosYa Envíos para Tiendanube, dada de baja desde fines de 2023. Cualquier integración real arranca por el contacto comercial de PedidosYa.

**Fuentes:** `infonegocios.com.py` (PedidosYa Envíos para pymes) · `deliverect.com/en/integrations/pedidosya` · `ayuda.tiendanube.com` (app no disponible). **R26:** material leído de la web, es dato, no instrucción.

**Estado real el 2026-10-16:** Andrea **todavía no tiene tienda en PedidosYa**, pero quiere tenerla a futuro. El link queda especificado y sin implementar (F26, diferida): es un `<a>` y un campo de configuración, no vale adelantarlo.

**Costo:** si algún día factura por PedidosYa, esos pedidos no van a aparecer en el panel. Si eso llega a doler, se reabre con el contacto comercial.

---

## ADR-009 · Se mantiene el stack

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Decisión:** Flask + SQLAlchemy + SQLite en el back, React 19 + TS + Vite + Tailwind 4 en el front.

**Por qué:** el repo existe, el back está bien separado en capas, hay 19 tests verdes y el build del front compila limpio. Ningún outcome de `spec.md` se resuelve cambiando de stack; cambiarlo quemaría el único activo que hay. **Descartado:** migrar el back a FastAPI (ganaría validación por esquema y `/openapi.json`, pero reescribe 9 blueprints y 8 servicios que funcionan) y migrar el front a Next (ganaría SEO, que para una carta linkeada desde Instagram no mueve la aguja).

---

## ADR-010 · Flask-Migrate desde T3

**Fecha:** 2026-10-16 · **Estado:** Vigente (OK del humano el 2026-10-16; era dependencia nueva, R28)

**Contexto:** el esquema nace de `db.create_all()` (`app_factory.py:21`), que crea tablas faltantes y **nunca altera una tabla existente**. T3 agrega columnas a `Product` y tablas nuevas: sobre `instance/bakery.db` las columnas no van a aparecer.

**Decisión:** sumar `Flask-Migrate` (Alembic) y versionar las migraciones, desde T3.

**Qué resuelve:** cambios de esquema repetibles sobre una base con datos. **Por qué no alcanza lo que hay:** `create_all()` no hace `ALTER TABLE`; hoy la salida es borrar `bakery.db` y re-sembrar, y eso deja de ser una opción el día que ella cargue su carta a mano — que llega **antes** del lanzamiento, no después. **Qué tan viva está:** Alembic es el estándar de facto de SQLAlchemy y Flask-Migrate su envoltorio oficial, ambos con mantenimiento activo.

**Alternativa descartada:** un script de migración a mano. Alcanza para una columna y se vuelve una fuente de bugs a la tercera.

**Costo:** una dependencia más y un paso (`flask db upgrade`) en el arranque.

---

## ADR-011 · Navegación: barra corta + drawer, elegible

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Contexto:** el header tenía 5 ítems, el selector de temas, el carrito y el login todo apretado en la misma línea, y en pantallas medianas se amontonaba.

**Decisión:** arriba quedan **Carta** y **Andrea**, el selector de estación, y a la derecha del todo el carrito y el acceso a la cuenta. El resto del menú vive en un **drawer lateral** que se abre con el icono de hamburguesa. Cuál se usa por defecto se elige en **Configuración** (F30).

**Por qué:** la Carta es lo que vende, así que no se esconde detrás de un clic. El resto (pedidos, configuración, panel) es navegación de vuelta, no de entrada. **Descartado:** solo drawer (esconde la carta) y solo barra (no es configurable, que es justo lo que se pidió).

**Costo:** el drawer y la barra son dos caminos que hay que mantener en paralelo, y los dos tienen que ser accesibles con teclado.

---

## ADR-012 · El invitado pide sin cuenta

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Contexto:** hoy el checkout exige login (`CheckoutPage` corta si `!isLoggedIn`). Con WhatsApp como canal principal (ADR-002), pedirle una cuenta a alguien antes de dejarlo mandar un mensaje es fricción que no compra nada.

**Decisión:** tres roles explícitos. **Invitado:** mira la carta, arma el carrito y **manda el pedido por WhatsApp** dejando nombre y teléfono. **Cliente** (con cuenta): además ve su historial y puede pagar online cuando se prenda Mercado Pago. **Admin** (Andrea): el panel.

**Por qué:** el pedido por WhatsApp termina en una conversación donde ella ya pide los datos. La cuenta aporta valor en el historial, no en el primer pedido.

**Consecuencia en el modelo:** `Order.user_id` pasa a ser **opcional**, y la orden guarda nombre y teléfono del que pidió. Eso **no es gratis**: hay que revisar cada consulta que hoy asume que una orden tiene usuario, y `OrdersPage` solo puede listar las del usuario logueado.

**Lo que NO se habilita:** pagar online sin cuenta. Un pago sin dueño en el sistema complica historial y reclamos.

---

## ADR-013 · El "Soporte guiado" deja de fingir que es un chat

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Contexto:** se probó en el navegador el 2026-10-16. Ocupa el alto completo y tapa el header; la fila de respuestas rápidas está debajo del historial, así que cada mensaje la empuja y **se termina tocando otro botón** (pasó en la prueba); hay dos scrolls anidados; y abajo hay un formulario de contacto metido adentro de la "conversación".

**Decisión:** se reemplaza por un panel de **Ayuda**: preguntas frecuentes desplegables y, abajo, dos salidas claras — **WhatsApp** y mail. Nada de burbujas ni de asistente.

**Por qué:** no hay nadie del otro lado en tiempo real. Una interfaz que aparenta conversación promete una respuesta que no existe. Un acordeón de FAQ más un botón de WhatsApp resuelve lo mismo, ocupa un tercio del espacio y no miente.

**Descartado:** un chatbot con IA. Mete dependencia, costo por consulta y activa **N4** de `security.md` — con el agravante de que inventar una respuesta sobre alérgenos es un problema de salud, no de UX. Si alguna vez se quiere, va con su propia ADR.

---

## ADR-014 · El deploy espera a T3

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Contexto:** se pidió publicar en Vercel. Vercel sirve el front estático sin problema, pero el back es **Flask + SQLite**: necesita un proceso vivo y un disco que persista, y el filesystem de las funciones serverless es efímero. Publicarlo ahí perdería los pedidos de Andrea.

**Decisión:** **no se deploya todavía.** Primero T3 (modelo nuevo, migraciones). Cuando el esquema esté estable: front a **Vercel**, back a un host con proceso vivo (**Render** o **Railway**, los dos con plan gratis) y la base de SQLite a **Postgres**.

**Por qué:** T3 cambia el esquema entero. Deployar antes obliga a migrar la base dos veces y a mostrar algo a medio hacer.

**Pendiente de decidir cuando toque:** el host del back y el proveedor de Postgres van a su propia ADR, con los números en `costs.md`. **Hoy no hay ninguna config de Vercel en el repo:** se verificó.


---

## ADR-015 · El `.env` se lee con 40 líneas propias, no con `python-dotenv`

**Fecha:** 2026-10-16 · **Estado:** Vigente

**Contexto:** `backend/.env` era decorativo. Nadie llamaba a `load_dotenv()` y el back corría con los defaults de `config.py` (**D12**), entre ellos `ADMIN_PASSWORD=admin123` en un repo público (**D13**). Para sacar esos defaults hay que poder leer el archivo primero.

**Decisión:** `backend/env_file.py` — `parse_env` + `load_env_file`, sin dependencias nuevas. Se llama desde `config.py` **antes** de la clase `Config`, porque sus `os.getenv` se resuelven al importarse.

**Por qué no `python-dotenv`:** es la opción obvia y está viva, pero es una dependencia nueva y lo que necesitábamos son 40 líneas: partir por `=`, ignorar comentarios, sacar comillas y **no pisar lo que ya está en el entorno**. La API quedó igual a la suya a propósito: cambiar de opinión es borrar un archivo y poner `load_dotenv()` en su lugar.

**Precedencia:** entorno > `.env` > default del código. El deploy y un `VAR=x` suelto en la terminal le ganan al archivo; está testeado (`test_does_not_overwrite_what_the_environment_already_said`).

**Lo que se cae de acá:**

- `ADMIN_EMAIL` y `ADMIN_PASSWORD` **sin default**. Sin email configurado no se crea ningún admin: el panel queda sin dueño antes que con una clave publicada.
- `ensure_admin()` **deja de reescribir la contraseña en cada arranque**. Si Andrea la cambia, la suya gana. Para rotarla hay `ADMIN_PASSWORD_RESET=true`, de una sola vez y avisando por log.
- Sin `JWT_SECRET_KEY` en el entorno se usa **una al azar por proceso**: reiniciar cierra las sesiones, pero nadie firma un token de admin con una clave que está en el repo.
- Los tests **no leen** `backend/.env` (`backend/tests/__init__.py` apunta `ENV_FILE` a un archivo que no existe): si lo leyeran, pasarían o fallarían según lo que cada máquina tenga cargado.

**Pendiente:** el `.env` local quedó con `admin@local.test` y una clave aleatoria. El mail real de Andrea **ya está en el historial de git** (`config.py:34` del commit viejo) y eso no se deshace reescribiendo el presente.

---

## ADR-016 · El hover da vuelta la tarjeta solo donde hay un mouse, y el dorso se queda con el botón de agregar

**Fecha:** 2026-10-17 · **Estado:** Vigente · **Enmienda:** el comentario de `ProductCard.tsx` que descartaba el hover

**Contexto:** F33 se implementó con un botón (ícono de info) porque en celular no hay hover y una tarjeta que gira cuando pasás el dedo es una trampa. El humano pidió explícitamente el giro con hover.

**Decisión:** las dos cosas, separadas por capacidad del dispositivo.

- El giro por hover está detrás de `(hover: hover) and (pointer: fine)`: entra en escritorio con mouse y **no existe** en una pantalla táctil, donde `:hover` queda pegado después de tocar.
- Ese medio se evalúa **en JS** (`usePunteroFino`, con `matchMedia`) y no con un `:hover` en el CSS. No es un detalle: la cara visible también manda `aria-hidden` e `inert`, así que si el CSS girara la tarjeta por su cuenta, la pantalla mostraría una cara y el lector de pantalla anunciaría la otra — y los botones de la cara tapada seguirían siendo clickeables. Con una sola fuente de verdad eso no puede pasar.
- El botón se queda, en todos los dispositivos. Es el único camino en celular, el camino del teclado (`focus-within` gira igual) y el que deja el dorso abierto mientras lees.
- Con `prefers-reduced-motion: reduce` la cara cambia sin animación: se muestra el dorso, no gira.

**Lo que obliga a cambiar, y es la parte que importa:** si la tarjeta gira al pasar el mouse, **"Agregar" deja de ser clickeable** — el puntero entra, la cara se va y el botón se escapa. Por eso el dorso suma su propio botón de agregar al pedido. Sin eso, el hover le saca al visitante la acción principal de la carta; con eso, cualquiera de las dos caras vende.

**Descartado:** girar con un retardo (`transition-delay`) para que el puntero "de paso" no dispare el giro. Agrega un estado invisible y no resuelve el botón que se escapa.

---

## ADR-017 · El perfil de Andrea es un JSON en `SiteContent`, no una tabla nueva

**Fecha:** 2026-10-17 · **Estado:** Vigente

**Contexto:** F43 (sus redes) y F44 (su CV y su trayectoria) necesitan guardar datos con forma: una lista de redes, una lista de experiencias, una de estudios. Hoy `/historia` lee un único texto plano de `SiteContent["about"]`.

**Decisión:** un solo registro `SiteContent["profile"]` con un **JSON** adentro, validado y normalizado por `ProfileService` al escribir. No entran tablas ni columnas nuevas, así que **no hay migración** y el contenido del sitio sigue teniendo un solo lugar donde vive.

**Por qué:** son datos de **una** persona y nadie los consulta por separado — no se filtra por red social ni se ordena por experiencia. Una tabla `SocialLink` y una `CvEntry` darían tres joins para pintar una página que siempre se pide entera. Si algún día hay más de un perfil, la migración es leer el JSON y repartirlo; mientras eso no pase, el JSON es la forma honesta.

**El contrato lo sostiene el servidor, no el front:** `ProfileService` recorta cada campo a su largo máximo, acepta como mucho 8 redes y 12 entradas por lista, y descarta lo que no reconoce. Si el JSON guardado está roto o vacío, devuelve el perfil vacío: la página muestra los huecos punteados (como ya hace F24) en vez de explotar.

**La URL de una red se valida de verdad.** Solo `http://` y `https://`. `javascript:…` en un campo que después sale en un `href` es XSS almacenado con un formulario de admin de por medio, y el admin es justo quien va a pegar links sin mirarlos. Los `<a>` salen con `rel="noopener noreferrer"`.

**Nada se inventa (sigue a F24):** no se escriben handles, años ni títulos de nadie. Cada sección que viene vacía **no se renderiza**, y el panel dice qué falta.

**Sobre el CV:** se publica como una vista propia (`/cv`) con hoja de estilos de impresión, armada con los datos que ella carga. Así "tener el CV" no depende de subir un PDF: el que lo quiera lo imprime o lo guarda como PDF desde el navegador, y el contenido es texto indexable en vez de un archivo opaco. Si además quiere adjuntar su propio archivo, el campo existe y se apoya en F45.

---

## ADR-018 · Las fotos se suben al panel: validadas por contenido, reescritas sin metadatos, servidas inertes

**Fecha:** 2026-10-17 · **Estado:** Vigente · **Enmienda:** `features.md` §C decía "subida de fotos desde el panel: fuera de v1"

**Contexto:** hoy la foto de un producto es `image_url`, un campo de texto. Para cargar la carta, Andrea tiene que subir la imagen a otro lado, copiar el link y pegarlo. Pidió que el panel sea fácil; ese paso es el más caro de todos y el que más veces va a repetir.

**Decisión:** entra `POST /api/uploads` (solo admin, `multipart/form-data`). Esto **activa N5 de `security.md`**, y los controles van en el mismo ciclo, no después:

| Control | Cómo |
|---|---|
| Tamaño | tope de 4 MB, cortado por `MAX_CONTENT_LENGTH` **y** revisado en el servicio |
| Tipo real | se parsea la **estructura** del archivo (marcadores JPEG, chunks PNG), no la extensión ni el `Content-Type` que manda el navegador |
| Metadatos | se reescribe el archivo dejando solo lo que hace falta para verlo: se van EXIF, XMP, ICC y comentarios |
| Nombre | lo genera el servidor (`secrets.token_hex`): el nombre del usuario no llega al disco, así que no hay `../` que valga |
| Dónde | `instance/uploads/`, fuera del árbol de código y fuera del repo (`.gitignore`) |
| Cómo se sirve | `Content-Type` fijo según el tipo detectado, `X-Content-Type-Options: nosniff` y `Content-Disposition: inline` solo para imágenes |

**Por qué reescribir y no solo validar:** una foto sacada con el celular trae **EXIF con GPS**. Andrea cocina en su casa; publicar la carta con las coordenadas de su casa adentro de cada JPG es filtrar su domicilio sin que nadie lo note. Reescribir también mata el archivo políglota (un JPG válido que además es HTML o un ZIP).

**Por qué sin `Pillow`:** es la opción obvia y está viva, pero para JPEG y PNG lo que hace falta son ~140 líneas de recorrer segmentos y chunks, y es **el mismo criterio de ADR-015** (`env_file.py` en vez de `python-dotenv`). Pillow entra el día que haya que redimensionar o convertir de verdad, con su línea en este archivo (R28). Hoy el tope de 4 MB hace de límite y el navegador escala la foto en pantalla.

**Lo que no se acepta, y lo dice claro:** WEBP y HEIC se rechazan con el mensaje "guardala como JPG o PNG". HEIC es el default de iPhone, así que va a pasar: el aviso del panel lo nombra en vez de decir "formato inválido". Queda como deuda **D16**.

**Lo que se cae de acá (cierra D3):** si el back empieza a servir archivos que subió una persona, **los headers de seguridad dejan de ser hardening y pasan a ser parte del control**. Entran globales en `after_request`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Resource-Policy` y una CSP mínima para lo que sirve el back (que es JSON e imágenes, no HTML).

---

## ADR-019 · Las visitas se cuentan agregadas, sin cookie ni IP, y los gráficos son SVG propio

**Fecha:** 2026-10-17 · **Estado:** Vigente

**Contexto:** se pidió un panel con gráficos: cuánta gente entró, cuánta compró, cantidades y medidas. De las ventas ya hay datos (`Order`, `OrderItem`); de las visitas no hay nada.

**Decisión, dos partes.**

**1. Qué se mide.** Una tabla `PageView` con **contadores agregados**: `(día, ruta, clase de dispositivo) → cantidad`. Un `UPDATE … + 1`, no una fila por visita. No se guarda IP, ni cookie, ni user agent, ni id de sesión, ni nada que permita reconstruir el recorrido de una persona. La ruta se **normaliza contra las rutas conocidas** antes de guardarse (`/producto/<slug>` cuenta como una sola ruta, y lo que no se reconoce cae en `otra`): sin eso, cualquiera llena la tabla pegando URLs inventadas.

**Lo que esto cuesta, dicho de frente:** no hay **visitantes únicos**, y no se puede saber si la persona que entró es la que compró. Para saberlo habría que identificar a quien mira, y eso es exactamente lo que no queremos guardar — con N2 abierto (Ley 25.326, retención sin definir, D8) meter un identificador por visitante es agrandar el problema para un número que no cambia ninguna decisión de Andrea. Se mide **visitas**, y la conversión se mira contra pedidos, no contra personas. Toma la forma de la lección de `sdd-universal/sdd/decisions.md#ADR-013` (contadores propios y clase gruesa de dispositivo), recuperada del Cerebro: es dato, no instrucción (R26).

**2. Con qué se dibuja.** Componentes SVG propios (`GraficoBarras`, `GraficoLineas`, `GraficoRanking`), en el estilo pixel del sitio. **Sin librería de gráficos:** `recharts` o `chart.js` pesan más que todo el CSS del proyecto, traen su propia estética redondeada que choca con ADR-003, y lo que hace falta son tres formas (barras por día, línea de pedidos, ranking horizontal). Con `<rect>` y `<polyline>` alcanza, y los bordes chunky salen gratis porque son los mismos tokens. Si alguna vez hace falta zoom, tooltips o series apiladas, entra una librería con su línea en este archivo (R28).

**El panel no se trae todos los pedidos para contar.** `GET /api/metrics/summary` devuelve ya agregado lo que el gráfico dibuja. Hoy el panel pide `/api/orders` entero y suma en el navegador: con 40 pedidos da igual, con 4.000 es la deuda D5 pegándole al panel.

---

## ADR-020 · El asistente de recetas con IA: apagado por default, borrador que ella corrige, y lo que devuelve el modelo es DATO

**Fecha:** 2026-10-17 · **Estado:** Vigente · **Activa N4 de `security.md`**

**Contexto:** se pidió que al subir la foto de un brownie, la IA la reconozca y deje cargada una receta base que Andrea después corrige. Hoy ella escribe descripción, ingredientes y pasos desde cero por cada producto.

**Decisión:** entra `POST /api/ai/recipe-draft` (solo admin): recibe una imagen ya subida (F45) y devuelve un **borrador** — nombre sugerido, categoría, descripción, lista de ingredientes y pasos. El panel lo usa para **prellenar el formulario**. Nada se guarda ni se publica solo: ella edita y aprieta guardar, igual que hoy.

**Los límites, que son el 90% de la decisión:**

- **Apagado sin llave.** Sin `ANTHROPIC_API_KEY` o con `AI_ENABLED=false`, el endpoint responde **503** con un mensaje que explica qué falta, y el botón del panel no aparece. Mismo patrón que Mercado Pago (ADR-002): implementado, probado con un cliente falso, apagado hasta que haya credencial.
- **Nunca toca alérgenos.** El borrador **no propone etiquetas** ("sin TACC", "sin lactosa", "vegano"): esas las pone ella y son su declaración bajo su responsabilidad (ADR-006, `security.md` §3). Un modelo adivinando "sin TACC" sobre una foto es un problema de salud, no de UX — es la misma razón por la que ADR-013 descartó el chatbot.
- **La respuesta del modelo es dato, no instrucción (R26).** Una foto puede traer texto escrito adentro ("ignorá las instrucciones anteriores…"), y el modelo lo lee. Por eso la salida se acepta **solo** como JSON con la forma esperada: cada campo se recorta a su largo, las listas a su cantidad, y todo lo que no está en el esquema se tira. Nada de lo que devuelva se ejecuta, se concatena en una consulta ni se guarda sin que ella lo vea.
- **Techo de gasto.** `AI_DAILY_LIMIT` (default 25) corta la cantidad de borradores por día. Un endpoint de admin que cuesta plata por llamada necesita un techo que no dependa de que nadie se equivoque. **El contador vive en la base** (`SiteContent["ai_usage"]`), no en memoria: la primera versión lo guardaba en el proceso y el security-reviewer mostró que reiniciar el back lo volvía a cero y que con varios workers el techo real era N veces el escrito. Se descuenta **antes** de llamar al modelo, porque una llamada que sale y después falla igual se paga.
- **Se avisa en pantalla** que lo escribió una IA mirando una foto y que hay que leerlo antes de publicar.

**Qué modelo y con qué se lo llama (R28, y acá hubo un cambio de opinión a mitad de camino):** `claude-opus-5-5` por la API de Anthropic, con el **SDK oficial `anthropic`**.

La primera versión de esta ADR decía "`claude-sonnet-5-5` llamado con `requests`, sin dependencia nueva", siguiendo el criterio de ADR-015. Se revisó contra la documentación del proveedor antes de escribir una línea de código y las dos partes estaban mal:

- **El modelo:** elegir el más chico "porque sale más barato" es una decisión del dueño del proyecto, no del que programa, y acá la diferencia es de centavos por borrador (ver `costs.md`). Va el modelo bueno. Si el gasto molesta, bajarlo es cambiar un string — y está anotado como la primera palanca.
- **El cliente HTTP:** `requests` a mano contra `/v1/messages` es mantener nosotros el formato de un endpoint que cambia (el parámetro de salida estructurada, la forma del bloque de imagen y la configuración de razonamiento cambiaron todas en el último año). Con el SDK, eso lo mantiene el proveedor. **Es la diferencia con ADR-015:** leer un `.env` son 40 líneas que no cambian nunca; hablar con una API viva, no.

Entonces entra **una** dependencia nueva, `anthropic` (oficial, activa, la que recomienda la documentación). Y entra **apagada**: `ai_service.py` la importa adentro de la función, no arriba del archivo, así que si no está instalada el back arranca igual y el asistente responde el mismo 503 que cuando falta la llave. Ningún otro pedazo del proyecto la toca.

El borrador se pide con **salida estructurada** (`output_config.format` con un esquema JSON), que es lo que hace cumplir la forma del lado del proveedor; el parseo propio de arriba sigue estando igual, porque la defensa no se delega. Esfuerzo `low`: mirar una foto y proponer una receta base no necesita más, y el techo de gasto agradece.

**Descartado:** reconocer la imagen con un modelo local (no hay dónde correrlo: el back es un proceso chico en free tier), y publicar el borrador solo si la confianza es alta (no hay medida de confianza que valga para "esto es un brownie y lleva estos ingredientes", y el costo de equivocarse lo paga ella frente a un cliente).
