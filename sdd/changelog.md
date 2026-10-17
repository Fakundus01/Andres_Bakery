# changelog.md · Andres Bakery

Semver `MAJOR.MINOR.PATCH` (R13). No se borra nada: lo viejo queda.

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
