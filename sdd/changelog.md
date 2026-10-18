# changelog.md · Andres Bakery

Semver `MAJOR.MINOR.PATCH` (R13). No se borra nada: lo viejo queda.

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
