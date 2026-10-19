# Review · T4-F19b · Variantes desde el panel

**Rol:** `reviewer` funcional (R27, R29, R30, R31) · **Fecha:** 2026-10-19 · **Rama:** `dev`
**Tarjeta:** [`T4-F19b`](../../cards/T4-F19b-variantes-desde-el-panel.md) ·
**Handback revisado:** [`handback_T4-F19b.md`](handback_T4-F19b.md) · **ADR:** 029 (sus tres partes)
**Sobre el commit `42c9a7c`**, revisando **lo que está sin commitear**.
**No implementé nada de esto.** No toqué una línea de código ni de tests del repo; todas las sondas
que corrí viven en mi carpeta temporal. La base de desarrollo quedó con sus datos intactos
(7 pedidos, variantes 1 y 2); lo único que se movió fue el contador de visitas, por mis propias
cargas de página — el diff fila por fila está al final.

## Veredicto

**`CHANGES_REQUESTED`** — 14 hallazgos (**3 ALTA**, 4 MEDIA, 4 BAJA, 3 INFO).

Lo primero, porque es lo que más pesa y es el punto de la tarjeta: **la pantalla hace lo que dice y
los ids no se mueven**. Dos guardados seguidos del mismo producto dejan las variantes con los
mismos ids; guardar sin la clave `variants` no las toca; un `id` de otro producto, inexistente o
negativo da 400 y la variante ajena queda intacta; `variants: []` borra todo, como está documentado.
C5 funciona: contra el working tree, un `variant_id` borrado contesta *"Ese tamaño ya no está
disponible…"* y uno ajeno sigue diciendo *"no es de «X»"*. Y los dos arreglos que salieron del
navegador son reales y están bien hechos: **el resumen del checkout ahora cobra el precio del
tamaño** (tres renglones de la misma torta en $28.400 / $28.000 / $19.800, subtotal $76.200, consola
sin errores) y la key del renglón ya no se repite. A 375px con el editor abierto y tres filas,
`scrollWidth − clientWidth = 0` y cero elementos desbordados.

Lo que no cierra es que **la tarjeta se propuso verificar que el control de plata no se pudiera
esquivar desde el panel, y el back no tiene ninguno**:

1. Un precio de tamaño `"NaN"` **tira un 500 con HTML**, no un 400 (hallazgo 1).
2. Un precio `"1e400"` se guarda como `Infinity` y el **endpoint público** `GET /api/products`
   devuelve `"price":Infinity`, que **no es JSON válido**: `response.json()` del front explota y la
   carta, la portada y la ficha quedan en blanco **para todos los visitantes** (hallazgo 2).
3. La regla *"precio mayor que cero"* **vive solo en el front**. El back acepta `0` y `-9999`, y un
   pedido real se arma con **Total: −$9.999** (hallazgo 3). Y desde la pantalla misma, `0.004` pasa
   el filtro del front, que muestra *"Se va a cobrar $ 0"*, y se guarda como `0.00`.
4. Los dos bugs que el handback dice haber encontrado en el resumen del checkout **siguen abiertos,
   idénticos, en `OrdersPage`** — la pantalla de "mis pedidos" (hallazgo 4). Reproducido.

Y sobre la honestidad del handback: **no miente, pero tres números no coinciden** y uno de ellos ya
está escrito en `status.md` y en el `changelog` (hallazgos 8 y 9).

---

## Lo que re-ejecuté (salida literal)

Los cuatro comandos de `harness.config.json`, desde la raíz del repo.

### Back — `backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q`

```
----------------------------------------------------------------------
Ran 330 tests in 141.986s

OK
```

**330 OK — coincide con el handback.** El ruido es el preexistente de siempre y nada más: 22
`ResourceWarning: unclosed database`, 8 `DeprecationWarning: datetime.utcnow()` y 1
`LegacyAPIWarning` de `Query.get()`. **Cero `SAWarning`**: el autoflush de
`renglon_del_pedido.py:146` que marcó la review de T18 ya no aparece (hallazgo 14, a favor).

### Front — `npm --prefix front/Andres_Bakery run test`

```
 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery

 Test Files  15 passed (15)
      Tests  166 passed (166)
   Start at  10:45:06
   Duration  512ms (import 38%, transform 33%, tests 15%, worker 13%, environment 1%)
```

**166 tests OK — coincide.** **15 archivos, no 16**, que es lo que el handback pega (hallazgo 8).
Los 31 nuevos sobre la base de 135 están ahí: 21 en `variantes.test.ts` y 10 en
`payloadDelProducto.test.ts`.

### Lint — `npm --prefix front/Andres_Bakery run lint`

```
> andres-bakery@0.0.0 lint
> npm run lint:eslint && npm run typecheck

> andres-bakery@0.0.0 lint:eslint
> eslint .

> andres-bakery@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
```

**Limpio, sin una sola línea de salida. Coincide.**

### Build — `npm --prefix front/Andres_Bakery run build`

```
vite v7.3.7 building client environment for production...
transforming...
✓ 1850 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.19 kB │ gzip:   0.60 kB
dist/assets/index-Lw5hPS16.css   34.41 kB │ gzip:   7.00 kB
dist/assets/index-DLWu8Ija.js   408.41 kB │ gzip: 122.68 kB
✓ built in 2.88s
```

**Verde, pero el JS mide 408,41 KB y el handback promete 408,21 KB** (hallazgo 8). El CSS sí
coincide (34,41 KB).

---

## Verificación de C1–C7

| # | Criterio | Resultado | Cómo lo medí |
|---|---|---|---|
| C1 | Agregar, renombrar, precio, reordenar, borrar, y que persista | **parcial** | el camino de escritura (formulario → payload → API → base) medido entero por sonda; **no apreté "Guardar" en el navegador** a propósito, para no escribir en la base real (ver alcance) |
| C2 | Editar sin tocar las variantes no las borra | **pasa** | `PUT` sin la clave `variants` dejó `[(1,'8 porciones'),(2,'12 porciones')]` igual |
| C3 | Guardar un producto ya editado conserva los ids | **pasa** | dos `PUT` seguidos con los ids: 1 y 2 antes, 1 y 2 después, y 1 y 2 otra vez |
| C4 | Variante sin nombre o sin precio: el panel lo dice; si igual llega, 400 | **pasa** | navegador (el cartel aparece) + 400 `each variant needs name and price` en los tres disfraces |
| C5 | `variant_id` borrado ⇒ 400 explicado | **pasa** | contra una copia de la base real: *"Ese tamaño ya no está disponible…"* |
| C6 | Un producto con 2 tamaños se compra al precio correcto, de punta a punta | **pasa** (hasta el botón de confirmar) | el resumen del checkout muestra los tres renglones a su precio; la confirmación la verifiqué por API |
| C7 | 375px y 390px sin scroll horizontal | **pasa a 375px** | `scrollWidth − clientWidth = 0` con 2 y con 3 filas; 390px no lo pude re-medir (ver alcance) |

**El contrato front/back, campo por campo** (hallazgo 3 y 7 salen de acá):

| Regla | `queFaltaEnLosTamanos` (front) | `_build_variants` (back) | ¿Coinciden? |
|---|---|---|---|
| nombre vacío / solo espacios | frena | 400 | sí |
| precio vacío / no numérico | frena | 400 | sí |
| coma decimal (`14200,50`) | frena | 400 `must be a valid number` | sí |
| **precio `0`** | frena | **200, guarda `0.00`** | **no** |
| **precio negativo** | frena | **200, guarda `-9999.00`** | **no** |
| **precio `0.004` / `1e-3`** | **pasa** (dice "Se va a cobrar $ 0") | **200, guarda `0.00`** | **no** (los dos lo dejan pasar) |
| **precio `Infinity` / `1e400`** | frena | **200, guarda `Infinity`** | **no** |
| **precio `NaN`** | frena | **500** | **no** |
| **nombres repetidos** | frena (sin mayúsculas) | **200, guarda los dos** | **no** |
| **más de 12 tamaños** | frena | **200, guardó 200** | **no** (lo admite el handback) |
| **nombre de más de 120 caracteres** | **no frena** | **200, guardó 4.000.000** | coinciden, y los dos mal |
| `sort_order` no entero | n/a (lo pone el front) | 400 | sí |
| `variants` que no es lista | n/a | 400 | sí |

Nada de lo que el front frena termina en un 400 inesperado para Andrea. El problema es el otro
sentido: **cinco reglas de precio viven solo en el front**, y una de ellas es la que define plata.

---

## Hallazgos

### 1 · ALTA · Un precio de tamaño `"NaN"` tira un 500 con HTML, no un 400

**Dónde:** `backend/services/base.py:28-33` (`parse_decimal`) ·
`backend/services/product_service.py:161` (`variant price`) · `:89` (el `price` base)

**Qué está mal.** `parse_decimal` hace `Decimal(str(value))`, y `Decimal("NaN")` es **válido**: no
levanta `InvalidOperation`. El `NaN` llega a la columna `Numeric(10,2)`, SQLAlchemy lo liga como
`nan`, SQLite lo rechaza por `NOT NULL` y el `IntegrityError` sube sin que nadie lo agarre. El
`json_endpoint` solo traduce `ValidationError`.

**Cómo lo reproduje.** Sonda propia, app de test con su base temporal y `PROPAGATE_EXCEPTIONS` en
`False`, como en producción:

```
== PUT /api/products/5 con price='NaN' -> HTTP 500
   cuerpo: b'<!doctype html>\n<html lang=en>\n<title>500 Internal Server Error</title>\n<h1>Internal Server Error</h1>...'
== lo mismo con price='nan'  -> HTTP 500
```

Con el traceback en el log del servidor:

```
sqlite3.IntegrityError: NOT NULL constraint failed: product_variant.price
[SQL: INSERT INTO product_variant (product_id, name, price, sort_order) VALUES (?, ?, ?, ?)]
[parameters: (5, 'X', nan, 0)]
  File "backend\services\product_service.py", line 95, in update
    db.session.commit()
```

**Qué pediría.** Que `parse_decimal` rechace lo que no es un número finito: después del
`Decimal(...)`, un `if not valor.is_finite(): raise ValidationError(...)`. Es un `if` en un lugar y
cierra este hallazgo y el 2 de una vez, para el precio del tamaño y para el precio base.

**Alcance honesto.** Requiere token de admin, y **el mismo agujero ya existía** en el `price` base
del producto (`PUT price BASE = 'NaN' -> HTTP 500`, medido). **No lo introdujo esta tarjeta**: lo que
esta tarjeta hizo fue agregar un segundo campo que cae por el mismo lugar, y declarar en su
encabezado que acá *"se verifica que no se lo pueda esquivar desde el panel"*. No se verificó.

---

### 2 · ALTA · `1e400` se guarda como `Infinity`, y eso rompe el JSON público de la carta

**Dónde:** `backend/services/base.py:28-33` · `backend/services/serializers.py:104` y `:87`
(`float(product.price)`)

**Qué está mal.** `Decimal("1e400")` es finito como `Decimal` pero `float()` lo desborda a `inf`.
El serializador hace `float(...)`, y el JSON de Flask emite `Infinity` con `allow_nan=True`. **Eso
no es JSON válido.** `GET /api/products` es el endpoint **público** que usan la portada, la carta y
la ficha, y `lib/api/cliente.ts:111` lo lee con `response.json()`: un `SyntaxError` y la pantalla
queda vacía. Un solo `PUT` deja el sitio sin carta para todo el mundo.

**Cómo lo reproduje.**

```
PUT con price='Infinity' -> HTTP 200; en base: [(2, 'Infinita', 'Infinity', 0)]
== price='1e400' (overflow a Infinity) -> HTTP 200
   en base: [(2, 'X', 'Infinity')]
GET /api/products -> HTTP 200
   "variants":[{"id":2,"name":"X","price":Infinity}]
json.loads estricto (como JSON.parse del navegador): FALLO -> constante JSON invalida: Infinity
```

Y lo que haría el navegador:

```
$ node -e 'try{ JSON.parse("{\"price\":Infinity}") }catch(e){ console.log("JSON.parse FALLA:", e.message) }'
JSON.parse FALLA: Unexpected token 'I', "{"price":Infinity}" is not valid JSON
```

**Qué pediría.** Lo mismo que el hallazgo 1 (`is_finite()`), y además un tope de magnitud acorde a
`Numeric(10,2)`: hoy `1e30` entra y se guarda como `1000000000000000019884624838656.00` en una
columna declarada de 10 dígitos, porque SQLite no hace cumplir la precisión.

**Alcance honesto.** Requiere token de admin, y **es preexistente** en el `price` base
(`PUT price BASE = '1e400' -> HTTP 200`, medido). El front **sí** lo frena (`Number.isFinite`
devuelve `false`), así que no es alcanzable desde la pantalla. Lo reporto en ALTA por el radio de
daño —el sitio público entero con un request— y porque la autoridad, según ADR-029, es el back.

---

### 3 · ALTA · "Precio mayor que cero" vive solo en el front, y `0.004` lo esquiva desde la pantalla

**Dónde:** `front/Andres_Bakery/src/lib/variantes.ts:130-133` (`precioValido`) contra
`backend/services/product_service.py:157-162` (que no valida el signo ni el mínimo)

**Qué está mal.** El front exige `numero > 0`; el back no exige nada. Son dos cosas distintas:

1. **Por API**, `0` y `-9999` entran y se cobran. No es un número en una tabla: el pedido se arma.
2. **Desde la pantalla**, `0.004` pasa `precioValido` (es finito y mayor que cero), el payload lo
   manda tal cual, y `Numeric(10,2)` lo redondea a `0.00` al guardarlo. El único guardia que separa
   "torta de $0" de la base es una comparación de floats con la que la capa de almacenamiento no
   está de acuerdo.

**Cómo lo reproduje.** Por API, con el pedido completo contra una base temporal:

```
en base: [(3, 'Gratis', '0.00'), (4, 'Negativa', '-9999.00')]
   Gratis: HTTP 201
      {"message": "¡Hola Andrea! ...\n- 1 x Torta plata (Gratis): $0\nTotal: $0\n...", "order_id": 1, "total": 0.0}
   Negativa: HTTP 201
      {"message": "¡Hola Andrea! ...\n- 1 x Torta plata (Negativa): -$9.999\nTotal: -$9.999\n...", "order_id": 2, "total": -9999.0}
```

Y desde el formulario real, en el navegador, sobre el Cheesecake (escribiendo en el input del
tamaño 3 y leyendo qué cartel aparece):

```
{ caso: '0',      frena: ['El tamaño «Prueba» necesita un precio mayor que cero.'] }
{ caso: '-5000',  frena: ['El tamaño «Prueba» necesita un precio mayor que cero.'] }
{ caso: '1e-3',   frena: [],  previewCobra: [..., 'Se va a cobrar $ 0'] }
{ caso: '0.004',  frena: [],  previewCobra: [..., 'Se va a cobrar $ 0'] }
```

Y el back, con ese mismo valor: `price='1e-3' -> 200  guardado=[(8, 'X', '0.00', 0)]`.

**Qué pediría.** El mínimo en el back, donde ADR-029 dice que vive la autoridad: en
`_build_variants`, un `if price <= 0: raise ValidationError(...)`. Y en el front, que `precioValido`
mida **lo que el back va a guardar** y no lo que se escribió — redondear a dos decimales antes de
comparar, que es además lo que haría coincidir el cartel *"Se va a cobrar"* con la realidad.

**Alcance honesto.** `0` y negativo son solo por API, con token de admin. `0.004` es alcanzable
desde la pantalla pero nadie lo escribe por accidente: el caso realista no es el ataque, es que **la
regla de plata está escrita en un solo lado**, que es exactamente lo que la tarjeta se propuso
verificar. El precio base del producto tiene el mismo agujero y es preexistente.

---

### 4 · MEDIA · Los dos bugs del resumen del checkout siguen abiertos, idénticos, en "mis pedidos"

**Dónde:** `front/Andres_Bakery/src/pages/OrdersPage.tsx:64-66`

```tsx
<div key={`${order.id}-${item.product_id}`} ...>
  <span>{item.quantity} x {item.product_name}</span>
  <strong className="text-tinta">{formatCurrency(item.unit_price * item.quantity)}</strong>
```

**Qué está mal.** Las dos cosas que el handback dice haber arreglado en `ResumenDelPedido.tsx`:

1. **La key se repite.** Dos tamaños de la misma torta son dos `order_item` con el mismo
   `product_id`, así que los dos `div` salen con la misma key. Es el mismo riesgo de React que
   motivó el arreglo del resumen, en la pantalla de al lado.
2. **El renglón no dice el tamaño.** `variant_name` viene en la respuesta y el panel de Andrea sí
   lo usa (`admin/OrdersTab.tsx:51`), pero acá el cliente ve dos líneas **idénticas** que solo se
   diferencian en el monto.

**Cómo lo reproduje.** Pedido con los dos tamaños del Cheesecake, contra una **copia** de la base
real, leyendo `/api/orders` como lo lee la pantalla:

```
POST /api/orders -> 201 {"order_id":8,"total":34000.0}

pedido #8  total=34000.0
  key de React = '8-2'    render = '1 x Cheesecake de Frutos Rojos'   monto=14200.0  variant_name='8 porciones'
  key de React = '8-2'    render = '1 x Cheesecake de Frutos Rojos'   monto=19800.0  variant_name='12 porciones'
```

**Qué pediría.** La misma corrección que en el resumen: `key={item.id}` (el `order_item` tiene su
propio id) o el índice, y el tamaño en el renglón —`{item.variant_name ?? ...}`—, como ya hace el
panel. Y de paso, que la próxima vez que se arregle un bug de este tipo se barra el resto de las
pantallas que listan renglones: son cinco (`CartDrawer`, `CarritoPage`, `ResumenDelPedido`,
`OrdersPage`, `OrdersTab`) y esta tanda tocó una.

**Alcance honesto.** No es plata mal cobrada: `unit_price` viene del servidor y es el correcto, y el
total del pedido está bien. Es una pantalla de historia que el cliente no puede leer, más una key
duplicada. Ningún pedido de la base de hoy tiene dos renglones del mismo producto (lo verifiqué:
`select order_id, product_id, count(*) ... having c>1` devuelve vacío), así que **hoy no se ve**;
es alcanzable desde esta tanda en adelante. No lo vi renderizado en el navegador, porque no llegué
a confirmar un pedido (ver alcance); lo que pegué es la respuesta de la API que esa pantalla mapea.

---

### 5 · MEDIA · El nombre del tamaño no tiene tope, y sale por el endpoint público

**Dónde:** `backend/services/product_service.py:157-159` · `backend/models/catalogo.py:115`
(`name = db.Column(db.String(120))`)

**Qué está mal.** `_build_variants` solo chequea que el nombre no esté vacío. SQLite no hace cumplir
el `String(120)` del modelo, así que entra cualquier largo — y `GET /api/products` lo devuelve. Es
**el mismo agujero que ADR-030 cerró para `Ingredient`** ("entraron 4.000.000 de caracteres en un
`name`"), no cerrado acá. Y a diferencia de los ingredientes —donde la corrección de ADR-030 aclara
que la única pantalla que llama al endpoint es el panel—, **la carta pública sí llama a este**.

**Cómo lo reproduje.**

```
  len pedido=      121 -> HTTP 200, guardado=121,      GET /api/products devuelve      2733 bytes
  len pedido=     5000 -> HTTP 200, guardado=5000,     GET /api/products devuelve      7612 bytes
  len pedido=   200000 -> HTTP 200, guardado=200000,   GET /api/products devuelve    202612 bytes
  len pedido=  4000000 -> HTTP 200, guardado=4000000,  GET /api/products devuelve   4002612 bytes
```

**Qué pediría.** El mismo tope que ya tiene el ingrediente tras ADR-030, aplicado al nombre del
tamaño: 120 caracteres, rechazando o recortando, y que el front lo diga antes (hoy `queFaltaEnLosTamanos`
no mide el largo, así que esta es además una regla que **ningún** lado chequea).

**Alcance honesto.** Requiere token de admin. El front no lo frena pero tampoco lo facilita: habría
que pegar 4 MB en el input. Lo que lo hace MEDIA y no BAJA es que es un agujero ya identificado,
con su ADR, en un módulo nuevo, y que acá la fila gorda se le sirve a cada visitante.

---

### 6 · MEDIA · El mismo `id` dos veces en la lista mueve el id, contra ADR-029 parte 3

**Dónde:** `backend/services/product_service.py:152-175` (`_build_variants`) y `:177-188`
(`_variante_a_reusar`)

**Qué está mal.** `_variante_a_reusar` no se acuerda de lo que ya devolvió. Si el mismo `id` viene
dos veces, la misma instancia de `ProductVariant` se agrega dos veces a `product.variants`; la
colección las colapsa, y lo que queda es **una fila con un id nuevo**. Es exactamente lo que ADR-029
parte 3 dice que no puede pasar.

**Cómo lo reproduje.** Producto con una variante de id 1:

```
PUT con el MISMO id dos veces -> HTTP 200
  quedo: [(4, 'dos', '200.00', 1)]
```

El id 1 desapareció y en su lugar quedó el 4: el `variant_id` que alguien tenga en su carrito es
inválido, y con el reuso de rowid de SQLite puede caer sobre otra variante (el riesgo que
`_exigir_que_sea_el_que_vio` cubre, pero que esta tarjeta decía evitar en origen).

**Qué pediría.** Que `_variante_a_reusar` rechace el id repetido con un 400 explícito, igual que
rechaza el ajeno: es un error del que llama, no un caso a resolver en silencio. Dos líneas.

**Alcance honesto.** **No alcanzable desde la pantalla**: cada fila del editor lleva el id de una
variante distinta del producto, y no hay forma de duplicarlo. Es por API, con token de admin. Lo
reporto porque es el único camino que encontré en el que ADR-029 parte 3 se rompe, y porque el
handback declara esa parte como cerrada sin reserva.

---

### 7 · MEDIA · Dos reglas más que viven solo en el front (nombres repetidos y el tope de 12)

**Dónde:** `front/.../variantes.ts:52-60` contra `backend/.../product_service.py:154-171`

**Qué está mal.** El front frena dos tamaños con el mismo nombre (comparando en minúsculas) y más
de 12 tamaños. El back acepta los dos. El primero importa de verdad: el **nombre** es lo que el
pedido guarda (ADR-029 parte 2) y lo que `_exigir_que_sea_el_que_vio` usa como testigo. Con dos
tamaños llamados igual y precios distintos, el testigo deja de distinguir nada.

**Cómo lo reproduje.**

```
  dos iguales                -> 200 [(2, '8 porciones', '1.00', 0), (3, '8 porciones', '2.00', 1)]
  iguales con mayusculas     -> 200 [(5, '8 Porciones', '1.00', 0), (6, '8 porciones', '2.00', 1)]
  n=  13 -> 200  guardados=13
  n= 200 -> 200  guardados=200
```

**Qué pediría.** La unicidad del nombre dentro del producto, en el back, por la misma razón por la
que ADR-030 mudó la del ingrediente: *"el front solo puede evitar los duplicados que ve"*. El tope
de 12 me conformo con que quede escrito como decisión de pantalla (el handback ya lo admite); la
unicidad no, porque toca el testigo del precio.

**Alcance honesto.** Por API, con token de admin. El handback declara el tope de 12 como riesgo
asumido; la unicidad del nombre **no la menciona**.

---

### 8 · BAJA · Tres números del handback no coinciden, y uno ya está en `status.md` y el changelog

**Dónde:** `sdd/progress/dev/handback_T4-F19b.md:33` y `:37` · `sdd/status.md:17` ·
`sdd/changelog.md` (sección 0.13.0, "Verificación")

| Promete | Mide |
|---|---|
| `Test Files  16 passed (16)` | `Test Files  15 passed (15)` |
| `408,21 KB JS` | `408.41 kB` |
| `330 OK` / `166 passed` / lint limpio | coinciden exactamente |

Los 15 archivos son los 13 de antes más los 2 nuevos; el "16" no sale de ningún lado. Y los
408,21 KB ya están copiados en la tabla de `status.md` §1 y en la verificación del changelog, que es
donde quedan como dato del proyecto.

**Qué pediría.** Corregir los tres lugares con la salida real. No cambia ninguna decisión, pero el
valor de esa tabla es que se le pueda creer sin re-medirla.

---

### 9 · BAJA · `sdd/testing.md` dice "Front: 90 tests" en el mismo bloque donde actualizó el back

**Dónde:** `sdd/testing.md:13`

El comentario del back se actualizó a `# Back: 330 tests` y el del front siguió en
`# Front: 90 tests de logica pura`, con 166 corriendo. Más abajo el mismo archivo tiene la línea
`Estado medido el 2026-10-17 tras T16: 151 tests del back + 48 del front OK`, que es histórica y
está bien fechada; esta no.

---

### 10 · BAJA · La numeración de la cola de `status.md` quedó rota, y su ítem 1 habla de otra tanda

**Dónde:** `sdd/status.md` §5

Al sacar `T4-F19b` de la cola la numeración quedó **1, 2, 4, 5**. Y el ítem 1 sigue diciendo *"La
revisión independiente ya está hecha y corregida; lo único que falta para el `done` de R16 es su
OK"*, que era cierto para T18 y no para esta tanda — la revisión independiente de F19b es este
documento, y recién existe ahora. El encabezado de §5 (*"Cerró el 2026-10-19: `T4-F19a` y la tanda
T18 entera"*) tampoco menciona F19b.

---

### 11 · BAJA · La tarjeta dice que C5 lo demuestra `test_pedido_hostil.py`, y los tests entraron en otro archivo

**Dónde:** `sdd/cards/T4-F19b-variantes-desde-el-panel.md:58` contra
`backend/tests/test_pedido_personalizado.py:101-128`

Los dos tests nuevos (`test_un_tamano_borrado_lo_dice_con_sus_palabras` y
`test_el_tamano_de_otro_producto_sigue_diciendo_lo_suyo`) están bien escritos y pasan; están en
`test_pedido_personalizado.py`, no donde la tarjeta los anunció. Es rastreabilidad, no
comportamiento: la tabla de la tarjeta es lo que alguien va a leer para encontrarlos.

---

### 12 · INFO · El back que está corriendo es anterior al cambio de `_variante`

**Dónde:** proceso 42588/25008, `backend/app.py`, arrancado **19/10/2026 10:06:45** ·
`backend/services/renglon_del_pedido.py` modificado **10:30:34**

El reloader no recargó. Contra el servidor en vivo, un `variant_id` borrado todavía contesta el
mensaje **viejo**:

```
-- A) variant_id 3 (BORRADO) con el nombre que vio el cliente
   (400, '{"error":"Ese tamaño no es de «Cheesecake de Frutos Rojos»."}')
```

Contra el working tree, sobre una copia de la base real, contesta el nuevo:

```
-- C5: variant_id 3, que ella borro (el carrito viejo)
  borrado id=3: HTTP 400 -> {"error":"Ese tamaño ya no está disponible. Abrí el producto y elegí uno de los que hay."}
  inexistente id=9999: HTTP 400 -> {"error":"Ese tamaño ya no está disponible. Abrí el producto y elegí uno de los que hay."}
```

**No es un bug del código** y C5 pasa. Lo anoto porque cualquier verificación del back hecha en el
navegador después de las 10:30 está medida sobre código viejo, y conviene reiniciarlo antes de la
próxima vuelta por el navegador.

---

### 13 · INFO · El cartel del nombre repetido lo muestra en minúsculas

**Dónde:** `front/.../variantes.ts:52-56`

`nombres` se arma con `.toLowerCase()` y el mensaje interpola ese valor, así que si ella escribió
"8 Porciones" el cartel dice *«8 porciones»*. Cosmético.

---

### 14 · INFO · A favor: el `SAWarning` que marcó la review de T18 ya no está

La corrida del back no emite ni un `SAWarning`. El autoflush disparado desde
`renglon_del_pedido.py:146` que el reviewer de T18 dejó anotado como INFO desapareció.

---

## Lo que sí aguantó

Esto es lo que probé a propósito para romperlo y no se rompió.

**ADR-029 parte 3, los ids** — lo central de la tarjeta:

```
antes de guardar:   [(1, '8 porciones', '14200.00', 0), (2, '12 porciones', '20000.00', 1)]
tras guardado #1:   [(1, '8 porciones', '14200.00', 0), (2, '12 porciones', '20000.00', 1)]
tras guardado #2:   [(1, '8 porciones', '14200.00', 0), (2, '12 porciones', '20000.00', 1)]
PUT sin la clave variants (C2): [(1, '8 porciones', '14200.00', 0), (2, '12 porciones', '20000.00', 1)]
PUT variants=[] -> HTTP 200; quedo: []
```

**Y el panel no tiene el camino de "guardar dos veces" que podría mover ids**: `guardarProducto`
llama a `resetProducto()` al terminar, así que para volver a guardar hay que apretar "Editar" otra
vez, y eso recarga los ids reales desde el servidor (`conAviso` → `recargar` → `cargar`). Una fila
nueva sin id no se guarda dos veces sin id.

**Los ids ajenos**, que es el agujero de ADR-029 parte 1 en el panel:

```
variante del alfajor: id=3
PUT a la torta con el id del alfajor -> HTTP 400 {'error': 'one or more variants do not belong to this product'}
  el alfajor quedo: [(3, 'Unidad', '800.00', 0)]
  la torta quedo:   [(1, '8 porciones', '14200.00', 0), (2, '12 porciones', '20000.00', 1)]
PUT con id inexistente -> HTTP 400 {'error': 'one or more variants do not belong to this product'}
PUT con id = -1 -> HTTP 400 {'error': 'one or more variants do not belong to this product'}
```

El panel **no lo adopta**: el id ajeno no se reusa ni se inventa una variante nueva en silencio, y
la fila del otro producto queda intacta.

**C4 en el back**, los tres disfraces del campo que falta:

```
  nombre solo espacios       -> 400 {'error': 'each variant needs name and price'}
  sin price                  -> 400 {'error': 'each variant needs name and price'}
  price null                 -> 400 {'error': 'each variant needs name and price'}
  sort_order texto           -> 400 {'error': 'sort_order must be an integer'}
  variants no lista          -> 400 {'error': 'variants must be a list'}
  coma decimal '14200,50'    -> 400 {'error': 'variant price must be a valid number'}
```

**El resumen del checkout (C6 y los dos bugs del navegador).** Carrito con tres renglones del
Cheesecake — dos tamaños vivos y uno con el `variant_id` 3 que ya se borró —, a 375px:

```
Tu pedido
Cheesecake de Frutos Rojos / 2 8 porciones  / Relleno: Dulce de leche / $ 28.400
Cheesecake de Frutos Rojos / 1 20 porciones / Relleno: chocolate      / $ 28.000
Cheesecake de Frutos Rojos / 1 12 porciones / Relleno: Dulce de leche / $ 19.800
Subtotal $ 76.200 · Envío $ 2.500 · Total $ 78.700
```

Cada renglón a **su** precio (no al base de $14.200), el subtotal cierra, el tamaño y el relleno se
ven, y la consola del navegador quedó en **0 errores** — la key repetida ya no se reporta.

**C7 a 375px**, con el editor abierto sobre el Cheesecake:

```
{ viewport: 375, scrollW: 360, clientW: 360, diff: 0, filas: 2, desbordan: [] }
{ viewport: 375, scrollW: 360, clientW: 360, diff: 0, filas: 3 }
```

**El editor abre cargado** al apretar "Editar" sobre una torta con tamaños (el bug del `useState`
que el handback dice haber arreglado):

```
filas: [ {Nombre del tamaño 1: '8 porciones'}, {Precio del tamaño 1: '14200'},
         {Nombre del tamaño 2: '12 porciones'}, {Precio del tamaño 2: '19800'} ]
```

**La lista del panel ya no muestra el precio que no se cobra:**

```
Cheesecake de Frutos Rojos → "8 porciones: $ 14.200 · 12 porciones: $ 19.800 · Relleno"
Brownie Tentacion          → "$ 8.300 por unidad"
```

**Ningún otro lugar de la pantalla muestra el precio base donde va el del tamaño.** Barrí
`item.price` y `product.price` en todo el front y los revisé uno por uno: `ProductPage.tsx:176` es
el precio **de la variante** dentro del selector (correcto); `ListaDeProductos.tsx:68` y
`HomePage.tsx:65` son las ramas de "sin tamaños" (correcto); `ProductsTab.tsx:108` es el input del
formulario. Lo que lista renglones usa `precioDelRenglon` en los cuatro casos
(`CartDrawer:54`, `CarritoPage:47`, `ResumenDelPedido:56`, `subtotalDelCarrito`), y las tarjetas y
la portada usan `precioDesde` con el "desde" visible. El único que queda fuera es `OrdersPage`, y
ahí el monto **es** el correcto (`unit_price` del servidor); lo que falta es el nombre del tamaño
(hallazgo 4).

**La base de desarrollo quedó con sus datos intactos**, que es lo que el handback promete y yo
también:

```
pedidos: 7
variantes: [(1, 2, '8 porciones', 14200), (2, 2, '12 porciones', 19800)]
productos: 5
```

Todas las escrituras de mis sondas fueron contra bases temporales propias o contra una **copia** de
`bakery.db` en mi carpeta temporal. El único request que le mandé al servidor en vivo fue el del
hallazgo 12, que dio 400 y no creó nada. `git status --short` quedó exactamente igual que al abrir
(más este archivo).

**Lo único que se movió, y lo digo porque el md5 cambió:** el contador de visitas, por mis propias
cargas de página. Diff fila por fila contra el respaldo que saqué antes de empezar:

```
--- page_view: 13 -> 13 filas
   (11, '2026-10-19', '/admin',     'tactil', 1) -> (11, '2026-10-19', '/admin',     'tactil', 2)
   (12, '2026-10-19', '/ingresar',  'tactil', 2) -> (12, '2026-10-19', '/ingresar',  'tactil', 3)
```

Ninguna otra tabla cambió una fila: ni `order`, ni `order_item`, ni `product`, ni
`product_variant`. Es lo que `useContarVisitas` hace cada vez que alguien abre la página, así que
no lo revertí: sobrescribir un SQLite que el servidor tiene abierto es más riesgoso que dos
visitas de más en el contador de desarrollo.

---

## El handback: ¿exagera o miente?

**No miente.** Los cuatro números grandes (330 back, 166 front, lint limpio, build verde) son
exactos salvo los 408,21 KB, y lo que declara como encontrado en el navegador existe y está
arreglado: el resumen del checkout cobraba el precio base, la key se repetía, el editor quedaba
cerrado, la portada decía un precio no comprable. Verifiqué los cuatro.

**Exagera en dos lugares, los dos chicos:**

- *"Test Files 16 passed (16)"* son 15 (hallazgo 8). Es una salida pegada que no se corresponde con
  la corrida.
- La sección 5, "Riesgos", lista tres y los tres son ciertos — pero son **los tres más cómodos**.
  El tope de 12 está; el precio con decimales está; el "último que guarda gana" está. Lo que no
  está es que **el back no valida el signo ni el mínimo del precio, ni el largo del nombre, ni la
  unicidad, y se cae con 500 ante un `NaN`**, en la tarjeta cuyo encabezado dice *"acá se verifica
  que no se lo pueda esquivar desde el panel"*. No es una mentira: es el control que la tarjeta
  prometió verificar y no se verificó.

Y una cosa a favor que el handback **no** se cuelga: haber dejado el camino de escritura del panel
sin ningún churn de ids, incluido el detalle de que `resetProducto()` obliga a recargar los ids
antes de un segundo guardado. Eso lo probé de tres maneras y no lo pude romper desde la pantalla.

---

## Alcance de lo que NO revisé

- **No apreté "Guardar" ni "Pedir por WhatsApp" en el navegador.** Lo primero, para no escribir en
  `instance/bakery.db`; lo segundo porque el entorno me bloqueó el click. El resultado es que C1
  (persistencia) y el último paso de C6 los verifiqué **por API y contra una copia de la base
  real**, no apretando el botón. El handback dice haberlos hecho en el navegador; no tengo motivo
  para dudarlo, y lo que medí es consistente con lo que reporta.
- **C7 a 390px no lo re-medí** en esta sesión: el token de admin del navegador venció a mitad de
  camino y no tengo las credenciales de `backend/.env` (la lectura del archivo me fue denegada).
  375px —que es el caso más apretado— sí lo medí, con dos y con tres filas.
- **Ni accesibilidad ni teclado** del editor más allá de los `aria-label` y el `aria-expanded`, que
  están puestos.
- **Nada de migraciones**: esta tarjeta no agrega ninguna.
- **No revisé concurrencia** más allá de leer el riesgo que el handback declara (dos admins
  editando a la vez). Con un solo admin, de acuerdo en que no aplica.
- **No medí performance** del `GET /api/products` con los 200 tamaños que el back acepta
  (hallazgo 7); solo conté los bytes del nombre largo (hallazgo 5).
- **No volví sobre ADR-029 parte 1 y 2** más allá de lo que toca el panel: ya las revisó la review
  de T18 y no cambiaron en esta tanda.

---

## Lo mínimo para un `APPROVED`

1. **Hallazgo 1** (`NaN` → 500) y **hallazgo 2** (`Infinity` en el JSON público): se cierran con un
   `is_finite()` en `parse_decimal`, que además cubre el `price` base.
2. **Hallazgo 3**: el mínimo del precio en el back, y que el cartel *"Se va a cobrar"* del front
   mida lo que se va a guardar.
3. **Hallazgo 4**: la key y el nombre del tamaño en `OrdersPage`.
4. **Hallazgo 8**: los tres números, en el handback, `status.md` y el changelog.

Los hallazgos 5, 6, 7, 9, 10 y 11 los dejaría anotados como deuda con su línea en `status.md` si se
decide no tocarlos ahora — pero el 5 y el 7 (unicidad del nombre) son de la misma familia que
ADR-030 y van a volver.
