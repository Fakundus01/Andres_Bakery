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

**Fecha:** 2026-10-17 · **Estado:** ~~Vigente~~ **Reemplazada el mismo día por ADR-022**: el hover se fue entero. Lo que sobrevive es el "Agregar" en el dorso, que resultó buena idea por otro motivo · **Enmienda:** el comentario de `ProductCard.tsx` que descartaba el hover

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

---

## ADR-021 · El header se queda con tres cosas, y el resto vive en el círculo de la cuenta

**Fecha:** 2026-10-17 · **Estado:** Vigente · **Enmienda:** ADR-011 (la barra corta y el drawer)

**Contexto:** el header había juntado siete controles: hamburguesa, logo, Carta, Andrea, el selector de estación (cuatro íconos), el carrito, el nombre de quien entró, salir, ingresar y crear cuenta. En pantallas medianas se amontonaba, y tres de esos controles —la estación, salir, crear cuenta— no son lo que alguien viene a hacer a una repostería.

**Decisión:** arriba quedan **tres cosas**: el menú (solo en celular), la marca, y a la derecha el **carrito** y **la cuenta**.

- **La hamburguesa es del celular.** En pantalla grande el menú está en la barra o en el panel lateral; un botón más para abrir lo que ya está a la vista es ruido.
- **La cuenta es un círculo con las iniciales** (`Facundo Moreno` ⇒ `FM`), que es también el botón de entrar para quien no tiene sesión. Adentro: **Perfil**, **Administrador** (solo Andrea), **Configuración** y **Salir**; sin sesión, **Ingresar**, **Crear cuenta** y **Configuración**.
- **El selector de estación se va del header** a Configuración, donde ya estaba la misma opción. Eran cuatro íconos permanentes para algo que se toca una vez.
- **Perfil es una pantalla nueva** (`/cuenta`): nombre, mail y los accesos a Mis pedidos, Configuración y —si corresponde— el panel. No inventa datos que no tenemos: hoy una cuenta son dos campos.

**Por qué el círculo y no un botón con el nombre:** el nombre completo cambia de ancho con cada persona y empuja al carrito de lugar. Un círculo de tamaño fijo no se mueve, y las iniciales alcanzan para saber con qué cuenta estás.

**El menú lateral, cuando se elige, tiene dos formas** (Configuración → "Cómo se comporta el panel"):

- **Siempre abierto** (el default): ocupa su lugar en la grilla y no se mueve nunca.
- **Se abre al acercarte**: queda una cinta de 28px y se despliega al pasar el mouse.

En el modo que se esconde, el panel se dibuja **encima** del contenido y el lugar reservado no cambia: si empujara la página al abrirse, cada acercada del mouse movería todo el texto. Es el mismo problema que el de las tarjetas que temblaban, y se descarta por el mismo motivo.

**Lo que se cuidó y no se ve:** el panel escondido se abre **también con el teclado**. La primera versión lo ocultaba con `visibility: hidden`, que saca los links del tabulador — y entonces no había forma de llegar al menú sin mouse. Se esconde con opacidad: un `Tab` enfoca el primer link, `focus-within` lo despliega. Medido: 4 tabulaciones desde el inicio de la página, y el panel pasa de 28 a 256px.

---

## ADR-022 · Las tarjetas se dan vuelta con un clic en la foto, nunca con el hover

**Fecha:** 2026-10-17 · **Estado:** Vigente · **Reemplaza a:** ADR-016

**Contexto:** ADR-016 puso el giro en el hover y, para que el botón "Agregar" no se escapara cuando la cara de adelante giraba, le dio al dorso su propio botón. Con el hover andando, el humano lo probó y dijo la frase que cierra el tema: *"vos tenés la imagen de primera vista y vas a ver un Agregar, y vos querés ir a tocar el Agregar y pum, se da vuelta la tarjeta"*.

**Decisión:** **el giro es un clic en la foto.** Ni hover, ni demora, ni intención del puntero.

- La **foto** es el botón que da vuelta la tarjeta, con un cartelito "Ver qué lleva" en la esquina para que se note que hace algo.
- La cara de adelante queda con **un** botón a lo ancho: Agregar.
- El dorso mantiene su Agregar (se puede comprar desde cualquiera de las dos caras) más "Ver la ficha" y "Volver".
- Se fue el botón de info: la foto hace exactamente lo mismo y es un objetivo veinte veces más grande.

**Por qué esto es mejor y no solo distinto:** girar pasa a ser algo que la persona **pide**, no algo que le **pasa** por mover el mouse. El botón principal de la carta deja de moverse solo, y la interacción es **la misma con dedo que con mouse** — lo que hace que `usePunteroFino` deje de hacer falta acá (sigue vivo para clasificar el dispositivo en las métricas).

**Lo que se arregló en el camino, medido antes y después:**

| | Antes | Después |
|---|---|---|
| Ancho mínimo de la tarjeta durante el giro | **124px** de 392 (dos cuadros seguidos de canto) | **201px**, y nunca pasa por los 90° |
| Tarjetas que giraban al cruzar la grilla camino al carrito | **5 cambios de estado** en 150ms | **0** |

El primero era el *"tiembla y desaparece"*: `steps(5)` hacía caer el giro en 72° y 108°, donde una tarjeta plana se ve de canto. Con `steps(3)` los ángulos son 0, 60, 120 y 180. El segundo desapareció solo al sacar el hover.

---

## ADR-023 · Vitest para la lógica pura del front, y nada más por ahora

**Fecha:** 2026-10-17 · **Estado:** Vigente · **Cierra en parte:** D7 (cero tests de front, abierta desde el 2026-10-16)

**Contexto:** el front llevaba cuatro ciclos sin un solo test. Los bugs se encontraban de tres maneras, todas caras: mirando la pantalla, leyendo el código en una revisión, o —la peor— usando la página el humano. En el último ciclo, el bug de las iniciales que partían emojis lo encontró un reviewer **leyendo**, y el del eje que etiquetaba "1" dos veces lo encontré **mirando un gráfico**. Ninguno de los dos necesitaba un navegador para salir: son funciones que reciben un número y devuelven otro.

**Decisión:** entra **Vitest** como dependencia de desarrollo del front, y se usa **solo para lógica pura**: funciones que no tocan React, ni la red, ni el DOM.

**Qué queda cubierto hoy (48 tests):** `iniciales`, `urlDeImagen`, la regla de cantidades (`cantidades.ts` completo), `ticksDelEje` y `formatoCorto` de los gráficos, `sanear` de las preferencias y la sesión guardada.

**Por qué Vitest y no otro:** el proyecto ya es Vite. Vitest **reusa `vite.config.ts`** tal cual —los mismos plugins, los mismos alias, el mismo manejo de TypeScript y JSX— así que no hay una segunda configuración de build que mantener en sincronía. Está muy vivo (es el runner por defecto del ecosistema Vite). Jest habría pedido su propia cadena de transformación para TS y JSX; es exactamente la duplicación que no queremos.

**Entorno `node`, no `jsdom`.** Lo que se prueba no monta componentes, así que un DOM falso sería una dependencia más para no usarla. El día que se prueben componentes, entra `jsdom` + Testing Library con su propia línea acá.

**Lo que NO se prueba con esto, y se sigue probando en el navegador** (R07): que el panel lateral se abra, que la tarjeta gire, que no haya desbordes a 390px, que los headers salgan. Eso necesita un navegador de verdad y ya tiene su forma de verificarse.

**Lo que costó y vale la pena anotar:** el runner encontró un bug **en el primer intento**, antes de terminar de escribirse. El test "la línea del medio de un eje de enteros cae en un entero" se puso rojo con máximo 4: el techo daba 5 y la línea del medio valía 2,5, pero la etiqueta la redondeaba a "3". La línea decía un número y estaba en otro. Eso llevó a cambiar el eje de "un techo y tres líneas fijas" a "una lista de marcas en pasos de 1, 2, 5, 10…", que es como lo hacen las librerías de gráficos y por este motivo.

**Dos comandos de test, no uno.** `harness.config.json` tenía una sola clave `test` para el back. Ahora hay dos suites y las dos tienen que estar verdes para que algo sea `done`: se agregó `test_front` y la nota que lo explica. No se juntaron en un solo comando a propósito: corren en runtimes distintos y conviene poder correr una sola mientras se trabaja.

**Los datos de contacto de Andrea** salieron de su propia etiqueta de producto (un PDF vectorial, rasterizado con `pymupdf` a 900 dpi porque no tenía texto extraíble): Instagram **@andresbakery.ar** y teléfono **11-7059-5319**. Van en `backend/.env` y en la base, **nunca en el código**: el repo es público y, aunque ella los imprima en cada sticker, versionar el contacto de una persona es otra cosa. `pymupdf` se usó una sola vez para leer el PDF y no quedó como dependencia del proyecto.

---

## ADR-025 · El invitado pide por WhatsApp, y el mensaje lo arma el servidor

**Fecha:** 2026-10-17 · **Estado:** Vigente · **Cierra:** F23, F31 · **Destraba:** el agujero más viejo del flujo

**Contexto:** hasta hoy, alguien que entraba, elegía y llegaba al checkout se encontraba con *"Necesitás iniciar sesión para completar la compra"* y el botón apagado. `POST /api/orders` pide token (`orders.py:11`) y el servicio exige un `User` (`order_service.py:28`). Para una repostería de barrio donde el pedido se cierra charlando, pedir registro **antes** de poder hablar es la venta perdida. `Order.user_id` ya era opcional desde ADR-012: faltaba la ruta.

**Decisión:** `POST /api/orders/whatsapp`, **pública**. Crea el pedido y devuelve `{order_id, total, phone, message}`. Si viene un token válido, el pedido queda atado a esa cuenta; si viene uno vencido o roto, se ignora y se trata como invitado —un token viejo en el navegador no puede ser la razón de que alguien no pueda comprar—.

**El texto lo arma el back** (`services/mensaje_whatsapp.py`) con los importes de la base. Si lo armara el front, cualquiera edita el total antes de mandarlo y a Andrea le llega un mensaje que dice $2.000 por algo de $12.000, con cara de pedido legítimo. Es la misma razón por la que `validate_quantity` corre del lado del servidor (V4).

**Lo que se descartó:**

| | Opción | Por qué no |
|---|---|---|
| B | `POST /api/orders/<id>/whatsapp` con token, como estaba planeado en `contracts.md` | pide el token que el invitado no tiene, y con el id en la URL se lee el mensaje de **otro** pedido —nombre, dirección, teléfono— probando 1, 2, 3. Un IDOR escrito a mano |
| C | Armar el mensaje en el front | los precios vendrían del cliente |
| D | Cuenta "liviana" de invitado | una cuenta igual, con otro nombre |

**El mail pasó a opcional** (migración `0004`). Quien pide por WhatsApp deja **nombre y teléfono**; el teléfono es el canal. Pedirle un mail que no va a usar es un campo más en la puerta. Sin mail, el aviso al cliente no sale y el de Andrea sí, que es el que mueve el pedido.

**Topes del pedido**, porque la ruta es pública y escribe: 30 productos distintos y 1000 unidades por renglón (`ORDER_MAX_LINES`, `ORDER_MAX_UNITS`). No son reglas de negocio —son anti-basura— y se suben por entorno.

**De paso, un agujero que no era de esta feature pero esta la agrandaba:** `_resolve_shipping_amount` aceptaba el `shipping_amount` que mandara el cliente. Con token era discutible; en una ruta pública es envío gratis a pedido, o peor, un envío **negativo** que deja el total por debajo del subtotal. Ahora el número sale de `DELIVERY_FEE` y el request no opina. El test lo prueba con `0`, `-5000` y basura.

**El mensaje se corta a 1500 caracteres.** `wa.me` manda el texto en la URL y los clientes lo recortan. El corte se decide sobre los productos y nunca sobre el total ni la entrega: perder el renglón 29 se aguanta, perder la dirección no.

---

## ADR-026 · Tope de requests por IP, en memoria del proceso

**Fecha:** 2026-10-17 · **Estado:** Vigente · **Cierra:** D2 (abierta desde el 2026-10-16)

**Contexto:** ADR-025 abre la primera ruta pública que **escribe** y que, de paso, dispara un mail por request. Hasta hoy la única ruta pública que escribía era `/api/metrics/view`, que suma un entero. Y `/api/auth/login` y `/api/contact` estaban expuestos desde el día uno sin ningún tope.

**Decisión:** un limitador de ventana deslizante en `services/rate_limit.py`, aplicado con el decorador `limitar(...)` de `routes/utils.py`:

| Ruta | Tope |
|---|---|
| `POST /api/orders/whatsapp` | 3 por minuto, 10 por hora |
| `POST /api/auth/login` | 10 cada 5 minutos |
| `POST /api/auth/register` | 5 por hora |
| `POST /api/contact` | 5 por hora |

Contesta **429** con `Retry-After`: sin ese header, un cliente bien portado no tiene con qué saber cuánto esperar.

**Ventana deslizante y no contador por minuto calendario**, porque el contador por minuto deja pasar el doble justo en el cambio de minuto.

**Lo que NO es, dicho antes de que alguien se confíe:** vive en la memoria del proceso. No sobrevive un reinicio, y con N workers el tope real es N veces el configurado. Cuenta por IP, y detrás de un proxy `remote_addr` es el proxy: sin `ProxyFix` y un header de confianza, todo el tráfico entra como una sola clave. Para lo que hay hoy —un proceso, sin proxy— alcanza y es barato; en el deploy se muda a Redis o al proxy. Queda anotado en `security.md` y como **D25**.

**Tiene techo de claves** (10.000, con desalojo LRU). Un limitador que guarda una entrada por IP sin límite es la fuga de memoria que venía a prevenir.

**Apagable por configuración** (`RATE_LIMIT_ENABLED`), y apagado en los tests por default: si no, una suite que hace diez logins se cae por el limitador en vez de por lo que mide, y el test que falla no es el culpable.

---

## ADR-027 · Lo que llega de afuera se sanea en un solo lugar

**Fecha:** 2026-10-18 · **Estado:** Vigente · **Nace de:** las dos revisiones de T7

**Contexto:** la ruta pública de pedido asumía que `customer` y `delivery` eran diccionarios y que sus campos eran strings. Los dos revisores llegaron, por caminos distintos, a la misma lista: once formas de sacarle un **500 con HTML** sin tener cuenta, más textos sin tope (4 MB por fila, porque SQLite no hace cumplir el `String(120)` del modelo), más `int(2.9) == 2`, más saltos de línea que fingían campos del sistema en el mail de Andrea.

**Decisión:** un módulo `services/saneado.py` con cuatro funciones —`diccionario`, `texto`, `mail`, `entero`— y tres reglas: lo que no es del tipo esperado es un **400 explicado y en castellano**, todo texto tiene tope, y los campos de una sola línea pierden los saltos.

**Por qué un módulo y no validación por esquema** (pydantic, marshmallow): sería una dependencia nueva (R28) para cuatro funciones de cincuenta líneas, en un proyecto que tiene **un** formulario público. El día que haya varios endpoints con formas distintas, la dependencia se justifica y esto se tira.

**Lo que NO rechaza:** un número donde va texto (una dirección "123" es alguien tipeando raro, no un ataque) y un mail mal escrito, que se descarta sin voltear el pedido —quien pide por WhatsApp deja el mail de yapa, y que lo escriba mal no puede costarle la compra—.

**De paso, un `rollback`.** Un pedido rechazado a mitad de armado quedaba pendiente en la sesión y lo grababa el próximo `commit()` que saliera bien. Por HTTP no se alcanza, porque cada request tiene su sesión; igual se cerró, que es la clase de mina que explota meses después y lejos de acá.

---

## ADR-028 · El tope cuenta lo que sale bien, no lo que se intenta

**Fecha:** 2026-10-18 · **Estado:** Vigente · **Corrige:** ADR-026

**Contexto:** el tope del pedido público contaba cada request, incluidos los 400. El barrio viene precargado pero es editable y el front no validaba la zona, así que el camino real era: la vecina cambia el barrio, se come tres 400, y **al cuarto intento —el bueno— la web le dice que mande menos pedidos**. Medido por el revisor, no deducido.

**Decisión:** dos cuentas. La estricta (3/min, 10/hora) se anota **después**, solo si la respuesta salió bien. La laxa (15/min, 40/hora) cuenta todo intento, para que los 400 tampoco sean barra libre de trabajo del servidor. Y el front avisa de la zona antes de mandar, así ese 400 ni ocurre.

**En el login es al revés y queda como estaba:** ahí el intento fallido es exactamente lo que hay que contar.

**Lo que esto no arregla, y conviene no olvidar:** el tope sigue siendo por IP, y una IP distinta es un presupuesto nuevo. Con un /64 de IPv6 —lo que da cualquier VPS o conexión residencial— se pasan tantos pedidos como se quiera. Está escrito en el módulo y en `security.md`: esto frena al que abusa desde una IP, no al que sabe lo que hace.

---

## ADR-029 · La variante se cobra, y el pedido guarda su nombre, no su id

**Fecha:** 2026-10-18 · **Estado:** Vigente · **Completa:** ADR-007

**Contexto:** ADR-007 agregó `ProductVariant` para lo que se vende entero con tamaños, y T3 dejó el
modelo, la API y el selector de la ficha. Lo que nunca se construyó es el camino del precio: el
selector de `ProductPage` cambia el número en pantalla y nada más. `addItem` manda el producto
pelado, `CartItem extends Product` no tiene variante, y `order_service._agregar_renglon` cobra
`product.price`. Apareció al planificar T4/T6, leyendo el código y no la spec: F19 figuraba al 80%
*"falta cargarlas desde el panel"*, y cargarlas desde el panel sin esto habría significado que el
cliente ve $14.000, Andrea cobra $6.000 y la diferencia la paga ella.

**Decisión, en tres partes:**

1. **El `variant_id` viaja en el renglón del pedido; el precio no.** El servidor busca la fila y
   verifica que `variant.product_id == product.id` antes de usar su precio. Es el mismo agujero que
   ADR-025 ya cerró para el envío, en el mismo endpoint público: sin esa verificación, el
   `variant_id` barato de otro producto compra la torta grande al precio del alfajor.

2. **`OrderItem` guarda `variant_name`, no una FK.** Un pedido es historia: si ella renombra "Torta 8
   porciones" el año que viene, el pedido de hoy tiene que seguir diciendo lo que vendió hoy — la
   misma razón por la que `unit_price` ya se copia en vez de leerse. Y hay una razón dura además:
   `Product.variants` tiene `cascade="all, delete-orphan"`, así que guardar el producto desde el
   panel **borra las filas viejas**. Una FK desde `order_item` hacia algo que el panel borra de
   rutina revienta el día en que Andrea edite una torta que ya vendió.

3. **Los ids de las variantes dejan de cambiar en cada guardado** (*implementado el 2026-10-19, después de que las dos revisiones de T18 mostraran que esta parte estaba escrita como hecha sin estarlo: `_build_variants` reemplazaba la lista entera y los ids se movían en cada guardado*). `_build_variants` pasa a aceptar un
   `id` opcional y actualizar en lugar de reemplazar. Si no, cada edición del panel invalida el
   `variant_id` que alguien tiene en su carrito de `localStorage`, y el 400 le cae en el checkout.

**Lo que esto cuesta, dicho de frente:** no se puede contar "cuántas tortas de 8 porciones vendí" con
un `JOIN`; hay que agrupar por texto. Para el volumen de Andrea no cambia ninguna decisión, y el día
que importe se arregla con una tabla de reporte y no ensuciando el renglón del pedido.

**Lo que no se hizo:** sacar el selector hasta poder cobrarlo (opción C del drift) era más barato y
dejaba F19 en 60%. Se descartó porque el flujo de compra recién se completó en T7 y volver a
recortarlo para no arreglarlo es deuda disfrazada de prudencia.

---

## ADR-030 · La unicidad del ingrediente vive en el back, y pedir uno que ya existe no es un error

**Fecha:** 2026-10-19 · **Estado:** Vigente · **Nace de:** la revisión de T6-F20

**Contexto:** F20 puso el selector de ingredientes en el panel. El front compara nombres
**normalizados** (sin acentos, sin mayúsculas, sin espacios de más) para no duplicar lo que ya está;
el back comparaba **exacto** (`filter_by(name=name)`). Mientras la lista del panel esté al día no se
nota. Con la lista vieja —otra pestaña, otro día, la API— entra igual: probándolo en el navegador
quedaron **«Coco rallado» y «coco rallado»** en la misma lista. El front solo puede evitar los
duplicados que ve.

En el mismo módulo, la revisión de seguridad encontró que `create` y `update` no limitaban el largo
de nada. SQLite no hace cumplir el `String(120)` del modelo: entraron **4.000.000 de caracteres** en
un `name`.

> **Corrección (2026-10-19).** Esta ADR decía que `GET /api/ingredients` «le devuelve esos MB a cada
> visitante». **Es falso y no estaba verificado**: el endpoint no pide auth, pero la única pantalla
> que lo llama es el panel (`usePanelDeAdmin.ts`). Lo midió el reviewer de T6-F20b; se había
> repetido del informe de seguridad sin comprobarlo. Lo que sí es cierto es que una fila de 4 MB es
> una fila de 4 MB, y que cualquiera que conozca la URL puede pedirla.

**Decisión, en tres partes:**

1. **La unicidad se decide en el servicio, normalizada.** `saneado.normalizar_nombre` espeja a
   `front/src/lib/ingredientes.ts`, con la misma regla de la ñ: se conserva, porque es otra letra y
   no una n con acento — si la barriéramos, «Piña» y «Pina» serían el mismo ingrediente y uno de los
   dos nombres desaparecería de la lista de Andrea sin que nadie lo haya decidido.

2. **`POST` de uno que ya existe devuelve 200 con la fila existente, no 400.** Desde el panel,
   "agregar un ingrediente que ya está" es la misma intención que "marcarlo": hacerle leer un error
   a Andrea por eso es ruido. El 201 queda para el alta de verdad. **El nombre que gana es el que ya
   estaba**, porque lo escribió ella y un alta posterior con otra grafía no se lo pisa.

3. **Topes de largo con 400 explicado, no recorte silencioso.** El resto del proyecto recorta
   (`saneado.texto`), y acá no alcanza: el nombre es lo que ella va a leer en la lista, así que
   cortarlo en 120 sin avisar sería renombrarle el ingrediente a sus espaldas.

   > **Primera versión, corregida el 2026-10-19:** el código *sí* recortaba en silencio. `_nombre`
   > le pasaba a `saneado.texto` un tope de 121, y `texto` **recorta antes** de que midiéramos: un
   > nombre de 5.000 caracteres con invisibles entraba como una fila de 61 y con un 201. Lo midió el
   > reviewer. Ahora el tope que se le pasa es holgado y la medición se hace sobre lo limpio.

4. **La unicidad la sostiene la base, no el chequeo.** `Ingredient.normalized_name` con índice
   único, y el servicio atrapa el `IntegrityError` y devuelve la fila que ya estaba.

   > **También de la segunda vuelta.** La primera versión era un `check-then-insert` sin nada que lo
   > respaldara: el reviewer lo rompió con 8 hilos y una barrera y metió **3 filas**
   > (`COCO rallado`, `Coco rallado`, `Coco Rallado`), y con grafía idéntica sacó un **500 con HTML**
   > en una API JSON, porque `json_endpoint` solo atrapa `ServiceError`. El título de la tarjeta
   > decía que la unicidad vivía en el back y era mentira: vivía en una mirada.

5. **Las dos normalizaciones espejan con categorías Unicode, no con rangos a mano.** La primera
   versión afirmaba que espejaban y **no era cierto**: 11 divergencias de 56 casos medidos
   (saltos de línea, ``, ``, ``, ``, y las marcas combinantes del árabe, el hebreo y el
   devanagari). Ahora las dos usan propiedades Unicode —`\p{Cf}` se saca, `\p{White_Space}` y
   `\p{Cc}` pasan a espacio, `\p{M}` se barre— y la ñ se recompone antes del barrido en las dos.

**La comparación queda escrita dos veces, en dos lenguajes, a propósito.** El front la necesita para
no mandar un pedido que ya sabe redundante; el back, porque es donde está la restricción. Las dos
tienen sus tests y el comentario de cada una nombra a la otra. Es duplicación consciente: la
alternativa —confiar en que el front filtre— es exactamente el bug que esta ADR cierra.

**Lo que esto no arregla:** `tag_service` tiene la misma comparación exacta para el nombre de las
etiquetas. Ahí el daño es menor porque `unique_slug` desempata la URL, pero «Vegano» y «vegano»
pueden convivir. Queda anotado, no tocado: no es de esta tarjeta.

---

## ADR-031 · La chef define los sabores; el cliente arma su torta con esa lista

**Fecha:** 2026-10-19 · **Estado:** Vigente · **Features:** F57, F58, F59

**Contexto:** el pedido llegó por dictado y tenía cuatro cosas que no cerraban. Se preguntaron antes
de escribir una línea (R04), y las respuestas son parte de esta decisión:

| Lo que no cerraba | Lo que se decidió |
|---|---|
| *"una mini cartita o descripción"* — ¿una cosa o dos? | **Una sola**: un texto libre donde describe cómo quiere la torta. **No** hay campo de dedicatoria |
| ¿Los sabores cambian el precio? | **No.** El precio sale del tamaño (F19). El relleno y la cobertura no lo mueven |
| ¿La foto se sube a la web o llega por WhatsApp? | **Se sube a la web**, con topes. Ver abajo |
| ¿El SMTP entra en esta tanda? | **No.** La personalización viaja por WhatsApp y se ve en el panel, como todo hoy |

**Decisión, en cuatro partes:**

1. **Los grupos de opciones son globales, como las etiquetas y los ingredientes.** "Relleno" se
   define una vez con sus sabores y se engancha a las tortas que lo usen. Definirlos por producto
   obligaría a la chef a recargar la misma lista en cada torta, que es exactamente el trabajo que
   el panel existe para ahorrarle.

2. **La frontera es la feature.** La lista de sabores la arma **solo** ella; quien compra elige de
   esa lista y describe el diseño en texto libre. Si el cliente pudiera escribir el sabor, el pedido
   sería una carta de deseos y ella no podría cumplirlo. Por eso las opciones se validan **en el
   servidor** contra los grupos que ese producto tiene asignados: un `option_id` que no es de ese
   producto es un 400, no un renglón raro en el pedido.

3. **El pedido guarda los nombres, no las FK.** Igual que `variant_name` (ADR-029) y por la misma
   razón: si ella renombra "Dulce de leche" a "DDL" el año que viene, el pedido de hoy tiene que
   seguir diciendo lo que vendió hoy.

4. **La foto de referencia se sube a la web, y eso mueve N5.** La alternativa recomendada era
   pedirla por WhatsApp, donde la conversación ya sucede (ADR-025): cero endpoint público de
   archivos, cero disco, cero retención. **El humano eligió la subida con el costo sobre la mesa.**
   Entonces el costo se paga completo, y es la tarjeta F59: ruta pública **separada** de la de
   admin, tope por IP, tamaño menor a los 4 MB del panel, cuota de disco (cierra D18), y barrido de
   huérfanas (cierra D17 para estas fotos). Sin esas cuatro cosas, F59 no sale.

**El agujero que esto abre si se hace mal, dicho antes de hacerlo:** el renglón del pedido va a
llevar una URL de foto que mandó el cliente. Si se acepta cualquier URL, el pedido se vuelve un
lugar donde meter un link a cualquier cosa, y el panel de Andrea —y el mensaje de WhatsApp— lo
muestran con su firma. La URL tiene que ser **una que emitimos nosotros**: el formato de nuestros
nombres (`/uploads/<32 hex>.<jpg|png>`) y el archivo existiendo en disco. Es el mismo agujero que
ADR-020 cerró en la IA y ADR-025 en el envío.

**Lo que esto le cuesta al mensaje de WhatsApp:** `TOPE_CARACTERES` son 1500 y ya se recorta. Con
relleno, cobertura y una descripción libre, los productos empiezan a caerse del mensaje. La nota va
con tope corto (300) y `_recortar` tiene que contemplar lo nuevo, porque hoy solo mide renglones de
producto.

---

## ADR-032 · Las fotos viven en Cloudinary, y el back es el único que escribe ahí

**Fecha:** 2026-10-19 · **Estado:** Vigente · **Features:** F45, F59, F41 · **Deudas:** D17, D18, D19

**Contexto:** F59 abre subida pública de archivos y el disco del back ya tenía tres problemas
anotados: nada se borra nunca (D17), no hay cuota (D18) y **el disco de Render free no persiste**
(F41). Con subida de admin eso era deuda; con subida de un anónimo es un agujero. El humano decidió
Cloudinary y dejar las credenciales en el `.env`.

**Decisión, en tres partes:**

1. **Una capa de almacenamiento, dos destinos.** `services/almacen_de_imagenes.py` guarda y borra;
   con `CLOUDINARY_*` en el entorno usa Cloudinary, y sin credenciales escribe en el disco local,
   que es lo que pasa hoy en desarrollo. **Las dos fotos pasan por ahí**: las de producto que sube
   Andrea (F45) y las de referencia que sube el cliente (F59). Dos caminos distintos para lo mismo
   sería la clase de diferencia que se descubre en producción.

2. **El back valida y después sube; el navegador nunca habla con Cloudinary.** Lo que llega pasa
   por `image_file.limpiar` —que valida por contenido y reescribe sin metadatos— y recién entonces
   el back lo sube **firmado**. Un `upload preset` sin firma habría sido más simple y es una puerta
   pública de escritura a su cuenta: se saltea nuestro validador y cualquiera puede llenarle el
   plan free. El `api_secret` no sale del servidor.

3. **La URL que el pedido acepta sigue siendo solo una que emitimos nosotros.** Lo que cambia es la
   forma, no la regla (ADR-031): o `/uploads/<32 hex>.<jpg|png>` existiendo en disco, o una de
   `res.cloudinary.com/<nuestro cloud>/image/upload/.../<nuestra carpeta>/<32 hex>`. Cualquier otra
   cosa es un 400. Sin eso, el renglón del pedido es un lugar donde pegar un link a cualquier cosa
   y el panel de Andrea lo muestra con su firma.

**Sin dependencia nueva (R28).** La API de Cloudinary se llama con `urllib` y la firma es un SHA-1
de los parámetros ordenados más el `api_secret`, el mismo camino que ya usa `payment_service.py`
para Mercado Pago. El SDK oficial sumaría una dependencia —y su auditoría (R19)— para armar un
multipart y un hash.

**Lo que esto cierra y lo que no:**

- **D18 (cuota)** se cierra en los dos destinos, y **no con una mirada**: la fila se escribe
  primero y la suma se verifica después (igual que ADR-030 punto 4 para el ingrediente), porque la
  primera versión medía-y-escribía y seis subidas simultáneas por la ruta pública entraban las
  seis, 5,7× la cuota. Lo midió el reviewer de T18 con una barrera; hay test con hilos. Además,
  **cada puerta tiene su techo**: lo que sube cualquiera no puede comerse el lugar de las fotos de
  la carta.
- **D17 (nada se borra)** se cierra **para las fotos de referencia**: se registran al subirse, se
  marcan usadas cuando el pedido se crea, y el barrido borra lo provisorio que pasó su ventana.
  Para las fotos de producto sigue abierta: cambiar la foto de un producto deja la anterior.
- **D19 (perfil de color)** sigue igual. Cloudinary no lo arregla: el perfil se tira **antes**, en
  nuestro limpiador, que es el precio de no tener `Pillow`.
- **Sin credenciales el deploy pierde las fotos igual.** La capa está lista; cargar las cuatro
  variables es parte de F41, no algo que el código pueda resolver solo.

---

## ADR-033 · La personalización vive detrás de una etiqueta, no de los grupos

**Fecha:** 2026-10-19 · **Estado:** Vigente · **Features:** F57, F58, F59

**Contexto:** con F57/F58 construidas, la ficha ofrecía elegir sabores, escribir cómo la querés y
subir una foto a **cualquier producto** que tuviera grupos asignados. El humano lo acotó en el mismo
ciclo: *"solo es para el tag «tortas personalizadas», para lo otro no"*.

**Decisión:** la puerta es la **etiqueta** `tortas-personalizadas` sobre el producto, y no la
presencia de grupos de opciones.

| Si el producto **tiene** la etiqueta | Si **no** la tiene |
|---|---|
| La ficha ofrece los grupos asignados, el texto libre y la foto | No ofrece nada de eso, aunque tenga grupos |
| El servidor acepta `option_ids`, `note` y `reference_image` | Los **rechaza con 400 explicado** |
| Un grupo `required` sin elegir frena el pedido | Los grupos se ignoran: el producto se vende como siempre |

**Por qué la etiqueta y no los grupos.** Si la puerta fueran los grupos, asignarle "Relleno" por
error a una docena de cookies la convertiría en algo que **no se puede pedir** sin elegir relleno:
un clic equivocado en el panel saca un producto de la venta. Con la etiqueta, el error se ve y se
deshace en el mismo lugar donde se cometió. Y es un mecanismo que Andrea ya usa todos los días.

**Por qué 400 y no descartar en silencio.** Si los campos se ignoraran, alguien manda una nota con
el pedido de cookies, ve un 201 y da por hecho que ella la va a leer. Decirle que ese producto no
se pide personalizado es la verdad.

**Lo que la etiqueta NO cierra:** vender por tamaños (`variants`, ADR-007) sigue siendo de la carta
y no depende de esto. Una torta se puede cobrar por tamaño sin ser personalizable, y el tamaño
elegido se cobra igual (ADR-029).

**El costo honesto:** hay **un string** que tiene que coincidir en los dos lados
(`renglon_del_pedido.py::TAG_PERSONALIZABLE` y `lib/carrito.ts::TAG_PERSONALIZABLE`). Es la misma
clase de espejo que `normalizar_nombre` (ADR-030).

> **Corregido el 2026-10-19, el mismo día.** La primera versión de esta ADR decía que *"si alguien
> renombra la etiqueta desde el panel, el slug cambia y la personalización deja de ofrecerse"*.
> **No es cierto y lo midió el reviewer de T18:** `tag_service.update` no recalcula el slug, así
> que renombrarla no la rompe. El riesgo real es otro y es el de al lado: **puede haber dos
> etiquetas que se llamen igual y solo una habilite**, porque `unique_slug` desempata con un
> sufijo (`tortas-personalizadas-2`) y lo que manda es el slug. El síntoma sería el peor posible:
> "le puse la etiqueta y no pasa nada", sin un error en ningún log.

Mitigado donde se trabaja: el panel dice qué etiqueta hace falta, la ofrece con un botón, avisa en
el formulario del producto cuando falta, y —desde la corrección del review— **nombra la etiqueta
parecida** cuando hay una marcada que se llama igual pero no es la que habilita. Lo que queda
abierto es que `tag_service` compare el nombre normalizado como ya hacen los ingredientes y los
grupos: queda como **D28**.

---

## ADR-034 · El panel edita en pop-up, y usa toda la pantalla

**Fecha:** 2026-10-19 · **Estado:** Vigente · **Features:** F49 (panel más fácil), F19b, F57

**Contexto:** el pedido fue del humano, por dictado: que editar desde el panel *"sea muy fácil y que
no se quede ahí"*, con **pop-ups** en vistas de computadora —"obviamente en celular podemos dejarlo
así"—, y que la app *"use la pantalla completa, porque vi que no la utiliza y queda un poco raro"*.

**Decisión, en tres partes:**

1. **El formulario del producto se edita en un pop-up, solo en pantallas grandes** (≥1024px). En
   celular se queda en la página: un formulario largo adentro de un pop-up, con el teclado virtual
   tapando media pantalla, es peor que sin pop-up. Lo decide `usePantallaGrande`, que escucha los
   cambios de tamaño en vez de mirar una sola vez.

2. **El pop-up es un `<dialog>` nativo**, no un `<div>` con `position: fixed`. El navegador ya sabe
   atrapar el foco adentro, cerrar con Escape, hacer inerte el resto de la página y devolver el foco
   al botón que lo abrió. Reimplementar eso a mano es lo que funciona con el mouse y deja afuera a
   quien usa teclado o lector de pantalla. Los botones de guardar viven en un **pie fijo**, fuera
   del área que scrollea, y mandan el formulario con `button[form=...]`: HTML de siempre.

3. **El ancho:** el panel usa **todo** el ancho (`max-w-none`) porque es un espacio de trabajo —una
   grilla de productos, gráficos, formularios—; el sitio público sigue acotado pero más holgado
   (1280 → 1408 en `xl` → 1664 en `2xl`). **No se saca el tope del sitio**: una línea de texto de
   2000 px no se lee, y la carta es para leer. Medido en 1920 px: el sitio pasó de 1280 a 1664, el
   panel a 1905.

**Lo que esto obligó a mover:** `ProductsTab` pasaba las 300 líneas con el pop-up adentro (R05), así
que el formulario salió a `FormularioDeProducto.tsx` y la pestaña quedó como orquestador. El mismo
componente se renderiza en los dos lugares, que es lo que evita que la versión de celular y la de
computadora se vayan separando.

**Lo que queda para después, dicho para no prometerlo:** las otras pestañas del panel (etiquetas,
gustos, perfil) siguen editando en la página. El `Modal` quedó hecho para reusarse —recibe título,
descripción, contenido y pie— pero ponerlo en cada pestaña es trabajo de otro ciclo.

---

## ADR-035 · El pop-up es la forma de editar en todo el panel, y borrar pregunta

**Fecha:** 2026-10-19 · **Estado:** Vigente · **Features:** F60, F49, F57 · **Reemplaza el
"queda para después" de ADR-034**

**Contexto:** ADR-034 puso el pop-up en una sola pestaña y lo dijo abiertamente: las otras seguían
editando en la página. El humano lo señaló en cuanto lo vio: *"si vamos a usar un pop-up en algún
lugar, creo que tendríamos que hacer eso mismo en otros lugares. Porque si no queda como en este
lugar sí, en este lugar no, queda medio raro"*.

Tiene razón por dos motivos distintos. El primero es el que dijo: un panel donde "editar" significa
tres cosas según la pestaña se aprende tres veces. El segundo apareció al abrir el código para
hacerlo: **en la carta y en las etiquetas, el botón de borrar borraba de una**, sin preguntar nada,
y está al lado del de editar. Los grupos y los ingredientes sí preguntaban, cada uno con su texto
escrito a mano. O sea que el panel tenía confirmación justo donde el daño era chico.

**Decisión, en cuatro partes:**

1. **Todo lo que se crea o se edita en el panel se edita en un pop-up en pantallas grandes**:
   etiquetas, grupos de gustos, las tres secciones del perfil y el texto institucional, igual que
   ya hacía la carta. En celular todo sigue en la página, por el teclado virtual (ADR-034 parte 1,
   sin cambios).

2. **Borrar algo que no se deshace pregunta primero**, con el nombre de lo que se borra y lo que se
   pierde: productos, etiquetas y grupos. `ConfirmarBorrado` es un `Modal` con dos botones, y el que
   queda a tiro del dedo es **"No, dejarlo como está"**.

3. **Ese cartel sí se usa también en celular**, al revés que los formularios. La razón para dejar
   los formularios en la página es el teclado virtual, y en un cartel de confirmación no se escribe
   nada. Lo que se gana es grande: el `<dialog>` atrapa el foco, así que el Enter siguiente cae en
   un botón del cartel y no en lo que había atrás.

4. **El texto del cartel vive en `lib/borrados.ts`, con tests.** Estaba escrito dos veces a mano y
   lo único difícil que tiene es el castellano: el plural y el género. "Si lo borrás sale de los 1
   productos" es lo que sale de interpolar un número sin mirarlo, y es la clase de frase que hace
   que ella no borre nada por no entender qué le están preguntando. Ahí también vive la cuenta de en
   cuántos productos está cada etiqueta, que es lo que vuelve concreto el aviso.

**Lo que esto obligó a mover (R05):** `GrupoDeOpciones.tsx` (272 líneas) mezclaba la tarjeta con la
edición, así que se partió en `TarjetaDeGrupo` (muestra) y `EditorDeGrupo` (edita); `PerfilTab`
(259) se partió en sus tres secciones; `TagsTab` y `OpcionesTab` quedaron como orquestadores con su
formulario aparte. El mismo componente se renderiza en los dos lugares —pop-up y página—, que es lo
que evita que la versión de celular y la de computadora se vayan separando.

**Tres excepciones, a propósito y dichas:**

- **Los ingredientes no abren pop-up.** Se editan adentro del formulario del producto, que en
  computadora ya es un pop-up: uno adentro de otro es peor que lo que arregla. Ahí la confirmación
  sigue siendo en la propia fila, pero el texto ya es el compartido.
- **Un sabor se borra sin preguntar.** Es una palabra que se reescribe en dos segundos, y el cartel
  caería adentro del pop-up del grupo.
- **El perfil guarda entero.** Las tres secciones se editan por separado pero viajan en un PUT, así
  que el pie de los tres pop-ups dice "Guardar mi perfil": prometer "guardar esta sección" sería
  mentir sobre lo que hace el botón.

**Lo que agregó la revisión independiente, y vale como parte de la decisión:**

- **Un guardado en el `blur` es una trampa, no una comodidad.** El nombre del grupo se guardaba al
  salir del campo, y cerrar el pop-up mueve el foco: el PUT salía igual, así que no había forma de
  tipear un nombre y abandonarlo. Se guarda **con Enter o con el tilde**, y el pop-up lo dice.
- **Escape adentro de un pop-up cancela lo que se está editando, no el pop-up.** Sin
  `stopPropagation()`, el evento llega al `<dialog>` y cierra todo: la misma tecla hacía dos cosas
  distintas según el ancho de la pantalla, justo en el teclado, que es la razón declarada de usar
  `<dialog>` (ADR-034 parte 2).
- **El pop-up se cierra solo si el guardado salió bien.** Cerrarlo siempre dejaba el error a la
  vista pero se llevaba lo tipeado. `conAviso` devuelve si guardó.
- **"Cerrar" cancela de verdad** en el perfil y en la historia: se guarda una copia al abrir y
  cerrar la devuelve. Lo que no se deshace es una foto ya subida (deuda D17).
- **Lo que se volvió más caro, dicho:** el "obligatorio" del grupo se tildaba antes desde la
  tarjeta con un clic y ahora pide abrir el pop-up. Es consecuencia directa de "la tarjeta muestra,
  el editor edita"; si molesta en el uso real, el checkbox puede volver a la tarjeta sin romper nada.

**Lo que queda abierto:** el editor del grupo guarda **cada cosa cuando la hacés** (renombrar,
marcar obligatorio y agregar un sabor son tres llamadas distintas), así que su pie dice "Listo" y no
"Guardar cambios". Es honesto, pero es una tercera forma de guardar en el mismo panel. Unificarlo
pide que el back acepte el grupo entero en un PUT, y eso es otra tarjeta.
