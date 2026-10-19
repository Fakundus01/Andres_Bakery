# Review · T4-F19a + T18 (F57, F58, F59) · Tortas a pedido

**Rol:** `reviewer` funcional (R27, R30, R31) · **Fecha:** 2026-10-19 · **Rama:** `dev`
**Tarjetas:** [`T4-F19a`](../../cards/T4-F19a-la-variante-se-cobra.md) ·
[`T18-F57`](../../cards/T18-F57-grupos-de-opciones.md) ·
[`T18-F58`](../../cards/T18-F58-el-cliente-arma-su-torta.md) ·
[`T18-F59`](../../cards/T18-F59-foto-de-referencia.md)
**Informe revisado:** [`current.md`](current.md) · **ADR:** 029, 030, 031, **032**, **033**
**No implementé nada de esto.** No toqué una línea de código ni de tests del repo; todo lo que
corrí vive en mi carpeta temporal.

## Veredicto

**`CHANGES_REQUESTED`** — 14 hallazgos (**1 ALTA**, 3 MEDIA, 6 BAJA, 4 INFO).

Lo primero, porque es lo que más pesa: **el camino secuencial de las cuatro tarjetas hace lo que
dice**. El precio sale de la base y nunca del request; la variante de otro producto da 400 y no
crea el pedido; la opción de un grupo ajeno da 400 y no revienta con un 500; la puerta de la
etiqueta (ADR-033) rechaza nota, sabores y foto con un 400 explicado en los seis disfraces que le
probé; la URL de la foto solo pasa si la emitimos nosotros, y las once variantes hostiles que le
mandé —`https://` externa, `../`, un hex inexistente, otra extensión, `javascript:`, `data:`, un
cloud de Cloudinary ajeno— dieron 400 JSON. Los cuatro comandos dan los números exactos que
promete `current.md`. Las tres migraciones van y vuelven sobre una copia de la base real.

Lo que no cierra es **una cosa grave y tres que son deuda disfrazada de hecho**:

1. **La cuota de disco no aguanta la concurrencia** (hallazgo 1). Es un endpoint **público** sin
   sesión, el control está escrito como `check-then-act`, y seis requests simultáneos con cuota
   para una foto escribieron **las seis**: 3.678 bytes sobre una cuota de 641. El criterio H3 de
   F59 dice textual *"y **no** se escribe"*, y `security.md:144` dice que esto **cierra D18**.
   Es exactamente el mismo bug que el reviewer de T6-F20b encontró en la unicidad del
   ingrediente: el control vive en una mirada, no en una restricción.
2. **ADR-029 parte 3 está escrita como decisión tomada y no existe en el código** (hallazgo 2).
   Hoy no se alcanza porque el panel todavía no sabe editar variantes; el próximo paso que
   `current.md` anuncia es justo `T4-F19b`, que la va a alcanzar.
3. **Un nombre cuyo normalizado queda vacío saca 500 con HTML** en los dos endpoints nuevos
   (hallazgo 3). Es el mismo agujero que ADR-030 dice haber cerrado, copiado a `option_service`.
4. **Tres callejones sin salida del carrito** (hallazgo 4), y el más probable —la foto barrida a
   las 24 horas— le dice a la persona *"volvé a subirla"* en una pantalla donde no se puede subir.

---

## Lo que re-ejecuté (salida literal)

### Back — `backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q`

```
----------------------------------------------------------------------
Ran 307 tests in 75.946s

OK
```

**307 OK, coincide con `current.md`.** La corrida escupe el ruido preexistente de siempre
(`ResourceWarning: unclosed database`, `DeprecationWarning: datetime.utcnow()`) y dos
`SAWarning` **nuevos**, de hoy, que vale la pena anotar:

```
backend\services\renglon_del_pedido.py:146: SAWarning: Object of type <OrderItem> not in session,
add operation along 'Product.order_items' will not proceed (This warning originated from the
Session 'autoflush' process ...)
  grupos = {grupo.id: grupo for grupo in product.option_groups}
```

No falla nada —el `OrderItem` se agrega a la sesión seis líneas después— pero es un autoflush
disparado desde el medio del armado del renglón. Lo dejo como INFO (hallazgo 13), no como
hallazgo de comportamiento.

### Front — `npm --prefix front/Andres_Bakery run test`

```
> andres-bakery@0.0.0 test
> vitest run


 RUN  v5.0.5 C:/Users/Facundo/Estudio_Trabajo/Andres_Bakery/front/Andres_Bakery


 Test Files  12 passed (12)
      Tests  124 passed (124)
   Start at  09:23:00
   Duration  342ms (import 40%, transform 29%, tests 17%, worker 14%, environment 1%)
```

**124 OK, coincide.**

### Front — `npm --prefix front/Andres_Bakery run lint`

```
> andres-bakery@0.0.0 lint
> npm run lint:eslint && npm run typecheck


> andres-bakery@0.0.0 lint:eslint
> eslint .


> andres-bakery@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json
```

(sin salida = limpio)

### Front — `npm --prefix front/Andres_Bakery run build`

```
> andres-bakery@0.0.0 build
> tsc -b && vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 1846 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.19 kB │ gzip:   0.60 kB
dist/assets/index-CZm0Sm1Z.css   34.28 kB │ gzip:   6.97 kB
dist/assets/index-CsDccnCM.js   402.04 kB │ gzip: 120.94 kB
✓ built in 2.62s
```

**402,04 KB, coincide al centavo con lo que promete `current.md`.**

### Migraciones — ida y vuelta sobre una **copia** de la base real (B6, E8)

La base real (`instance/bakery.db`) **no se tocó**: copié el archivo a mi carpeta temporal y
apunté `DATABASE_URL` ahí.

```
--- estado inicial ---
0008 (head)
--- downgrade 0005 ---
INFO  [alembic.runtime.migration] Running downgrade 0008 -> 0007, El renglon se personaliza: opciones elegidas, nota y foto de referencia.
INFO  [alembic.runtime.migration] Running downgrade 0007 -> 0006, Los grupos de opciones y sus sabores (F57, ADR-031).
INFO  [alembic.runtime.migration] Running downgrade 0006 -> 0005, El renglon del pedido guarda el nombre de la variante que se vendio.
--- upgrade head ---
INFO  [alembic.runtime.migration] Running upgrade 0005 -> 0006, El renglon del pedido guarda el nombre de la variante que se vendio.
INFO  [alembic.runtime.migration] Running upgrade 0006 -> 0007, Los grupos de opciones y sus sabores (F57, ADR-031).
INFO  [alembic.runtime.migration] Running upgrade 0007 -> 0008, El renglon se personaliza: opciones elegidas, nota y foto de referencia.
--- current final ---
0008 (head)
```

Las tres van y vuelven limpias, con `batch_alter_table` donde hace falta (SQLite no sabe
`DROP COLUMN` solo). **Esta salida no estaba en `current.md`** y los criterios B6 y E8 la piden
pegada; queda pegada acá.

---

## Hallazgos

### 1 · La cuota de disco es un `check-then-act`: seis subidas simultáneas escriben las seis — **ALTA**

**Archivo:** `backend/services/almacen_de_imagenes.py:218-225` (`_exigir_espacio`), llamado desde
`guardar` en la línea 53.

```python
def _exigir_espacio(self, bytes_nuevos: int) -> None:
    cuota = self.cuota()
    if cuota <= 0:
        return
    if self.espacio_usado() + bytes_nuevos > cuota:   # <- mira
        raise StorageFullError(...)
    # ... y recién despues escribe y hace commit
```

Entre el `SELECT sum(bytes)` y el `INSERT` no hay nada: ni lock, ni transacción que sostenga la
suma, ni restricción en la base. Dos requests que llegan juntos ven los dos la misma suma vieja y
pasan los dos.

**Por qué es ALTA y no MEDIA.** Es el único control que acota el disco de un endpoint **público,
sin sesión**, que acepta 2 MB por archivo. El criterio H3 de `T18-F59` dice textual:

> | H3 | Pasada la cuota de disco ⇒ 507/400 explicado, y **no** se escribe | test |

y `sdd/security.md:144` lo da por cerrado:

> | Cuota total | ✅ **desde el 2026-10-19** (cierra **D18**): `UPLOAD_QUOTA_BYTES` se mide
> **antes** de escribir [...] y pasarse es un **507 explicado** |

El tope por IP (4/60s, 15/3600s) acota **una** IP, no el total: con N IPs la cuota es lo único
que queda, y es lo que no aguanta. Y con Cloudinary prendido cada request de más es además una
llamada HTTP que consume el plan free, que es justo el costo que ADR-032 dice estar controlando.

**Cómo lo reproduje.** Cuota puesta para una sola foto (631 bytes + 10), registro vaciado, seis
hilos con una `threading.Barrier(6)` para que salgan juntos:

```
--- cuota con dos requests casi simultaneos (check-then-act) ---
   registro vaciado; cuota alcanza para 1 foto
   6 hilos simultaneos, cuota para 1 -> status: [201, 201, 201, 201, 201, 201]
   filas=6 espacio_usado=3678 cuota=641  >>> se paso la cuota: True
```

Seis 201. **5,7× la cuota.** Para contraste, el camino secuencial sí anda —la misma app, de a una
subida, contesta `507` con `{"error": "No queda lugar para más fotos por ahora. Escribinos por
WhatsApp y lo resolvemos."}`—, que es lo que miden los tests de `test_subida_publica.py`.

**Qué pediría.** Lo mismo que ADR-030 punto 4 resolvió para el ingrediente: que la cuota la
sostenga algo que no sea una mirada. Alcanzan dos caminos, y el primero es el barato:

- Serializar la subida: `BEGIN IMMEDIATE` (o un `SELECT ... FOR UPDATE` el día que sea Postgres)
  alrededor de medir-escribir-registrar, así la segunda espera a la primera.
- O un contador con restricción: una fila única de `espacio_usado` que se actualiza con un
  `UPDATE ... WHERE usado + ? <= cuota` y se mira el `rowcount`.

Y un test que lo mida con hilos y barrera, como el que la review de T6-F20b dejó para la
unicidad. Si la decisión es aceptar el margen, que `security.md` lo diga: "cerrada en el camino
secuencial; bajo concurrencia el exceso es de hasta N× el tamaño máximo", no "✅ cierra D18".

**Alcance honesto.** No hace falta ser admin: es `POST /api/uploads/referencia` sin token. No hace
falta ser sofisticado: son requests paralelos normales. Lo que sí hace falta es que la cuota esté
cerca del tope para que se note; mientras sobre disco, el bug existe y no molesta. El techo del
daño lo pone `TOPES_FOTO_REFERENCIA` por IP, no la cuota.

---

### 2 · ADR-029 parte 3 está escrita como decisión tomada, y el código no la tiene — **MEDIA**

**Archivo:** `backend/services/product_service.py:130-148` (`_build_variants`), llamado desde
`_apply_relations` en la línea 116.

ADR-029 dice, como tercera de sus tres partes:

> 3. **Los ids de las variantes dejan de cambiar en cada guardado.** `_build_variants` pasa a
>    aceptar un `id` opcional y actualizar en lugar de reemplazar. Si no, cada edición del panel
>    invalida el `variant_id` que alguien tiene en su carrito de `localStorage`, y el 400 le cae
>    en el checkout.

`_build_variants` **no lee `id` en ningún momento**: arma `ProductVariant(...)` nuevos y
`_apply_relations` hace `product.variants = [...]` sobre una relación con
`cascade="all, delete-orphan"`. Las filas viejas se borran y las nuevas sacan ids nuevos.

**Cómo lo reproduje.** Un PUT del producto mandando los **mismos** ids que ya tenía:

```
=== HIPOTESIS ADR-029 parte 3: los ids de variante cambian al guardar ===
  variantes antes del guardado: {1: ('8 porciones', '14000.00'), 2: ('12 porciones', '19800.00')}
  PUT /api/products/5 (mandando los MISMOS ids) -> 200
  variantes despues:         {4: ('8 porciones', '14000.00'), 5: ('12 porciones', '19800.00')}
  >>> los ids cambiaron: True  (antes=[1, 2] despues=[4, 5])

  Y ahora el carrito viejo (variant_id=2) manda el pedido:
    pedido con el variant_id viejo del localStorage -> 400  err=Ese tamaño no es de «Torta de chocolate».
```

El `id` que manda el cliente se descarta en silencio y el carrito de quien estaba comprando queda
inservible, con el mismo mensaje que recibe un atacante.

**Por qué MEDIA y no ALTA.** Hoy **no se alcanza desde el panel**: `ProductsTab.tsx` ni siquiera
tiene campo de variantes —`grep -n variant` en todo `pages/admin/` devuelve una sola línea, y es
`OrdersTab.tsx:51`— así que `"variants" in data` es `False` en cada guardado real y las filas
quedan intactas. Lo verifiqué: `T4-F19b` *"sigue sin una línea escrita"*, como dice `current.md`.
Alcanzable hoy solo por API con token de admin.

Lo marco igual, y con esta severidad, porque **el próximo paso que `current.md` anuncia es
`T4-F19b`**: quien la implemente va a leer ADR-029 parte 3, va a ver que dice "pasa a aceptar un
`id` opcional", y va a dar por hecho que el back ya lo hace.

**Qué pediría.** Una de dos, pero explícita:

- Implementarlo: que `_build_variants` haga `update` cuando viene `id` y pertenece al producto, y
  borre solo lo que no vino. Con un test que guarde dos veces y afirme que los ids no se movieron.
- O corregir la ADR con la nota de "primera versión, corregida el …" que ya usan ADR-030 y
  ADR-031, y dejarlo como requisito **de `T4-F19b`** en la tarjeta, no en el aire.

---

### 3 · Un nombre cuyo normalizado queda vacío saca **500 con HTML** en los dos endpoints nuevos — **MEDIA**

**Archivo:** `backend/services/option_service.py:177-181` (`_buscar_grupo`), y el mismo patrón en
`_buscar_opcion` (183-189); el `raise` desnudo está en las líneas 72 y 135.

```python
def _buscar_grupo(self, name: str) -> OptionGroup | None:
    buscado = self._normalizado(name)
    if not buscado:
        return None          # <- el normalizado vacio nunca encuentra nada
    return OptionGroup.query.filter_by(normalized_name=buscado).first()
```

El rescate del `IntegrityError` (líneas 64-72) depende de que `_buscar_grupo` encuentre la fila
que acaba de chocar. Cuando el normalizado es `""` nunca la encuentra, hace `raise`, y el
`IntegrityError` sube hasta `json_endpoint` —que solo atrapa `ServiceError`— y sale como **500
con HTML en una API JSON**. Es, palabra por palabra, el hallazgo 1 de la review de T6-F20b
reaparecido en el módulo nuevo.

Un nombre así se consigue con caracteres de categoría Unicode `M` (marcas combinantes sueltas):
`nombre_para_guardar` los conserva —no están en `_INVISIBLES`— y `normalizar_nombre` los barre.

**Cómo lo reproduje.** Dos altas con marcas combinantes distintas (U+0301 y U+0302):

```
normalizacion de los dos nombres:
  entrada='́'  nombre_para_guardar='́'  normalizar_nombre=''
  entrada='̂'  nombre_para_guardar='̂'  normalizar_nombre=''

POST /api/option-groups name=U+0301 -> 201  ct=application/json
POST /api/option-groups name=U+0302 -> 500  ct=text/html; charset=utf-8
  body[:200]: b'<!doctype html>\n<html lang=en>\n<title>500 Internal Server Error</title>...'

POST .../options name=U+0301 -> 201
POST .../options name=U+0302 -> 500  ct=text/html; charset=utf-8

(control) POST /api/ingredients U+0301 -> 201 ; U+0302 -> 500 ct=text/html; charset=utf-8
```

Con el log del servidor al lado:

```
[2026-10-19 09:26:14,596] ERROR in app: Exception on /api/option-groups [POST]
[SQL: INSERT INTO option_group (name, normalized_name, sort_order, required, created_at) VALUES (?, ?, ?, ?, ?)]
[parameters: ('\u0302', '', 0, 1, '2026-10-19 12:26:14.596083')]
```

**La línea del control es dato, no instrucción, pero conviene leerla:** el bug **también está en
`/api/ingredients`**, que es código de T6-F20b y no de hoy. O sea: no lo trajo esta tanda, lo
heredó al copiar el patrón. Lo reporto junto porque se arregla en un lugar
(`saneado.normalizar_nombre` / el rescate) y porque dejarlo solo en los endpoints nuevos sería
arreglar la mitad.

Hay un tercer camino que **no** falla y vale anotarlo: el alta del grupo con las dos opciones
adentro (`{"name": "Bizcocho", "options": [U+0301, U+0302]}`) devuelve **201** y guarda **una**
sola opción, porque `_nombres_de_opciones` desduplica por normalizado antes de insertar. Ahí la
segunda desaparece en silencio, que es menos grave que un 500 pero tampoco es lo que pidió quien
la mandó.

**Qué pediría.** Que un nombre cuyo normalizado queda vacío sea un **400 explicado** ("Ese
nombre no tiene letras ni números") antes de intentar el `INSERT`, en `option_service._nombre` y
en el de los ingredientes. Y, de paso, que `json_endpoint` atrape `IntegrityError` y conteste
JSON: hoy cualquier restricción que nadie previó sale como HTML en una API JSON, y eso el front
no lo sabe leer.

**Alcance honesto.** **Hace falta token de admin** en los tres endpoints, así que el daño es
"Andrea pega algo raro y ve un error feo" y un log con stacktrace. Probabilidad baja: no es algo
que se escriba con el teclado a propósito. Lo que lo sube de BAJA a MEDIA es que es el criterio
central de ADR-030 copiado mal, y que ya costó una review entera.

---

### 4 · Tres callejones sin salida del carrito: el servidor dice 400 y la pantalla no deja arreglarlo — **MEDIA**

**Archivos:** `backend/services/renglon_del_pedido.py:196-213` (`_foto`), `138-167` (`_opciones`),
`104-117` (`_rechazar_personalizacion`) · del lado de la pantalla,
`front/Andres_Bakery/src/pages/CarritoPage.tsx:63-70` y `components/CartDrawer.tsx:61-68`, que
**muestran** la foto, los sabores y la nota del renglón pero no ofrecen cambiarlos.

El carrito vive en `localStorage` y guarda la personalización entera: `variante`, `opciones`,
`nota`, `fotoDeReferencia`. Tres cosas que pasan solas invalidan ese renglón, y las tres caen
como un 400 en el checkout, que `useCheckout.ts:115` muestra tal cual con `getErrorMessage`.

**Cómo lo reproduje.** Los tres, en el mismo script:

```
--- el dead-end: la foto se barre y el carrito ya la tiene ---
  foto subida: /uploads/3380e3e0f442f7f9531d30db65b3f4dd.jpg
  tras el barrido, la fila sigue? False
  el carrito (localStorage) manda el pedido con esa foto -> 400
    {'error': 'Esa foto no está en el servidor. Volvé a subirla y mandá el pedido de nuevo.'}

--- el otro dead-end: Andrea borra el grupo/la opcion que el carrito tiene ---
  DELETE del grupo -> 200
  el carrito manda el option_id borrado -> 400
    {'error': 'Una de las opciones elegidas no es de «Torta».'}

--- y si la etiqueta se le saca al producto, con el carrito ya armado ---
  pedido con la nota que el cliente ya habia escrito -> 400
    {'error': '«Torta» no se pide personalizado: los sabores y la foto son solo para las tortas a pedido.'}
```

**El primero es el probable, y por mucho.** `REFERENCE_UPLOAD_TTL_HOURS` son 24 horas y la propia
tarjeta F59 dice que abandonar el carrito es *"lo más común que pasa en una tienda"*. Quien eligió
su torta un martes a la noche y volvió el jueves tiene la foto barrida, el carrito intacto en
pantalla **mostrando la miniatura** (que ahora es una imagen rota), y un mensaje que le dice
*"Volvé a subirla"* en una pantalla donde **no hay forma de subir nada**: el control de foto vive
en `Personalizacion.tsx`, dentro de la ficha del producto. La única salida real es borrar el
renglón y rearmar la torta desde cero, y el mensaje no lo dice.

Los otros dos necesitan que Andrea toque el panel mientras alguien tiene el carrito armado —menos
probable, pero el mensaje al menos nombra el producto.

**Qué pediría**, en orden de lo que más resuelve por lo que menos cuesta:

1. Que el carrito pueda **arreglarse ahí**: un "Cambiar la foto" en el renglón, o un link
   "Rearmar esta torta" que lleve a la ficha con lo elegido precargado. Esto cubre los tres casos.
2. Mientras eso no esté: que el mensaje diga qué hacer de verdad —"Volvé a la ficha de «Torta» y
   elegí la foto otra vez"— y que nombre el producto, como ya hacen los otros dos.
3. Y considerar subir `REFERENCE_UPLOAD_TTL_HOURS` a 72: el costo de 48 horas más de fotos
   provisorias es chico al lado de un carrito que se rompe durante la noche.

**Alcance honesto.** El primer caso **no necesita admin ni nada raro**: pasa solo, con el reloj.
No es un agujero de seguridad —el 400 es correcto, la foto realmente no está— es un camino de
compra que termina en una pared. No está cubierto por ningún criterio de las cuatro tarjetas, que
es justo por lo que nadie lo probó.

---

### 5 · El tope de la nota recorta en silencio, y el espejo con el front no cierra — **BAJA**

**Archivos:** `backend/services/renglon_del_pedido.py:191-193` (`_nota`) → `saneado.texto` con
`tope=300` · del otro lado, `front/.../pages/producto/Personalizacion.tsx:98` (`maxLength={300}`)
y `:103` (el contador `{nota.length}/{TOPE_NOTA}`).

`saneado.texto` convierte cada salto de línea en `" · "` —tres caracteres donde había uno— y
**recién después** recorta a 300. El textarea cuenta los caracteres crudos. Resultado: el
contador dice "300/300" y el back guarda algo más corto que lo que la persona escribió, sin
avisarle.

**Cómo lo medí.** 300 caracteres exactos, variando cuántos saltos de línea llevan:

```
    0 saltos de linea en 300 chars -> el back guarda 300 y pierde los ultimos 0 chars del cliente
    2 saltos de linea en 300 chars -> el back guarda 300 y pierde los ultimos 4 chars del cliente
   10 saltos de linea en 300 chars -> el back guarda 300 y pierde los ultimos 20 chars del cliente
   50 saltos de linea en 300 chars -> el back guarda 300 y pierde los ultimos 100 chars del cliente
   99 saltos de linea en 300 chars -> el back guarda 300 y pierde los ultimos 198 chars del cliente
```

Una nota escrita como lista —*"colores: rosa y blanco\ncartel: Feliz cumple Mía\nsin nueces"*, que
es exactamente cómo la gente describe una torta— pierde el final. Y lo que se pierde es el final,
que en una descripción de diseño es donde suele estar lo importante.

**Qué pediría.** Que el tope se mida sobre el texto **ya limpio**, como ADR-030 punto 3 ya
corrigió para `nombre_para_guardar` por esta misma razón (*"`texto` recorta ANTES de que
midamos"*). Si no entra, o se recorta avisando, o el front manda menos. Lo que no puede pasar es
que el contador prometa 300 y el servidor guarde otra cosa.

**Alcance honesto.** No es plata ni seguridad; es que a Andrea le llega una nota cortada y nadie
se enteró. El criterio G5 dice *"Nota de 10.000 caracteres ⇒ **se acota**"*, y eso **sí** se
cumple (lo verifiqué: 10.000 → 300, y los saltos quedan en `" · "` como pide la tarjeta). El
problema no es el recorte, es que el front promete un número que no es el del servidor.

---

### 6 · La carta muestra el precio base aunque no se pueda comprar a ese precio — **BAJA**

**Archivo:** `front/Andres_Bakery/src/components/ProductCard.tsx:122` →
`{formatCurrency(product.price)}`.

F19a cerró el agujero de *"el cliente ve $14.000 y Andrea cobra $6.000"*. Queda su espejo: la
tarjeta de la carta sigue mostrando `product.price` incluso cuando el producto se vende por
tamaños y el más chico cuesta más. El botón ya dice bien **"Elegir y pedir"** y lleva a la ficha
(bien resuelto, hallazgo del lado positivo), pero el número grande de la tarjeta es el base.

**Cómo lo verifiqué, y por qué es BAJA.** En la base real de hoy **no se ve**, porque el precio
base y la variante más chica coinciden:

```
{'id': 2, 'name': 'Cheesecake de Frutos Rojos', 'price': 14200, 'vid': 1, 'vname': '8 porciones', 'vprice': 14200}
{'id': 2, 'name': 'Cheesecake de Frutos Rojos', 'price': 14200, 'vid': 2, 'vname': '12 porciones', 'vprice': 19800}
```

Y lo confirmé contra la app corriendo: `GET /api/products/2` devuelve `price: 14200.0` con la
variante más chica en `14200.0`. O sea: **nada de esto está roto hoy**. Lo que no hay es nada que
lo garantice: la coincidencia la mantiene Andrea a mano, y en cuanto cargue una torta con base
$6.000 y variantes desde $14.000, la carta promete un precio que la ficha no respeta. Y
`T4-F19b` —cargar variantes desde el panel— es justo lo que hace probable esa carga.

**Qué pediría.** Que la tarjeta de un producto con variantes muestre **"desde $X"** con el mínimo
de las variantes, o directamente el mínimo. Son dos líneas en `ProductCard` y una función pura en
`carrito.ts` que se puede testear.

---

### 7 · El botón "crear la etiqueta" puede crear una etiqueta **decorativa** — **BAJA**

**Archivos:** `front/.../pages/admin/useOpcionesDelPanel.ts:71`
(`tagsApi.create({ name: NOMBRE_TAG_PERSONALIZABLE }, token)`) · del lado del back,
`backend/services/tag_service.py` con `unique_slug`.

La puerta de ADR-033 es el **slug** `tortas-personalizadas`. `unique_slug` desempata agregando un
sufijo, así que una etiqueta creada cuando el slug ya está ocupado sale con un slug que no abre
nada — y en el panel se ve con el nombre correcto.

**Cómo lo reproduje:**

```
--- el boton del panel crea la etiqueta: que slug sale ---
  POST /api/tags 'tortas personalizadas' -> 201 {'id': 1, 'slug': 'tortas-personalizadas'}
  POST /api/tags 'Tortas Personalizadas' (otra grafia) -> 201 {'id': 2, 'slug': 'tortas-personalizadas-2'}
  POST /api/tags el mismo nombre otra vez -> 400 {'error': 'tag already exists'}
```

La segunda etiqueta se llama "Tortas Personalizadas", se ve idéntica en la lista, y ponérsela a
una torta **no habilita nada**. Reproducible también en el orden que sí se va a dar en la
práctica: renombrar la etiqueta buena y después apretar el botón.

Hay dos cosas que lo mitigan, y son del implementador: `TagsTab.tsx:106` muestra el slug
(`/tortas-personalizadas-2`) al lado de cada etiqueta, así que el decoy **se ve** si se mira; y
la unicidad de nombre exacto frena el caso más obvio. Lo que no frena es la otra grafía — que es,
literalmente, el bug que ADR-030 cerró para los ingredientes y que ADR-031 dice heredar.

**Qué pediría.** Que el botón del panel sea idempotente contra el **slug**, no contra el nombre:
buscar `slug == TAG_PERSONALIZABLE` primero y, si está, usar esa; y que `tag_service` compare el
nombre normalizado como ya hacen ingredientes y grupos (la propia ADR-030 lo deja anotado como
*"lo que esto no arregla"*).

**Alcance honesto.** Admin-only y necesita una secuencia de dos pasos. Probabilidad baja, pero el
síntoma es el peor posible: *"le puse la etiqueta y no pasa nada"*, sin un solo error en los logs.

---

### 8 · La cuota es compartida con un balde que pierde — **BAJA**

**Archivo:** `backend/services/almacen_de_imagenes.py:188-195` (`espacio_usado`).

`espacio_usado()` suma **todas** las filas de `stored_image`, de los dos `kind`. Y ADR-032 dice,
de frente, que para las fotos de producto D17 sigue abierta: *"cambiar la foto de un producto
deja la anterior"*. Las dos cosas juntas significan que cada vez que Andrea reemplaza una foto de
producto, la cuota de 500 MB **de la que depende la subida del cliente** baja para siempre. El
final del camino es un 507 "No queda lugar para más fotos por ahora" para los clientes, causado
por fotos que ya nadie usa.

Lo verifiqué leyendo el código y con el barrido: una fila `kind="product"`, vieja y no
provisoria, sobrevive el barrido (correcto) y sigue contando para la cuota.

```
   antes: [('reference', True), ('reference', False), ('product', False)]
   barridas=1  despues: [('reference', False), ('product', False)]
   la de producto (vieja, no provisoria) sigue: True
```

**Qué pediría.** No arreglar D17 acá —no es de esta tanda— pero sí que la deuda diga esto: o dos
cuotas separadas por `kind`, o una nota en `costs.md`/`security.md` de que la cuota del cliente se
consume con cada foto de producto reemplazada. Hoy `security.md:143` dice que D17 está "a
medias"; lo que no dice es que la mitad que falta se come la cuota de la mitad que anda.

---

### 9 · El 413 de la ruta pública dice "4 MB" cuando su tope es 2 MB — **BAJA**

**Archivo:** `backend/config.py:87` (`MAX_CONTENT_LENGTH = UPLOAD_MAX_BYTES + 512 * 1024`), que
es global a las dos rutas, contra `upload_service.py:62-67` (`max_bytes_referencia`, 2 MB).

Un archivo de entre 2 y 4,5 MB da el 400 correcto de la ruta pública. Uno de más de 4,5 MB lo
corta Werkzeug antes, con el mensaje del tope de **admin**:

```
  publica con 3 MB                      -> 400 ct=application/json err=La imagen pesa mas de 2 MB. Sacale peso o elegi otra.
  publica con 5 MB (pasa MAX_CONTENT_LENGTH) -> 413 ct=application/json err=El archivo pesa mas de 4 MB.
  admin con 5 MB (pasa MAX_CONTENT_LENGTH)   -> 413 ct=application/json err=El archivo pesa mas de 4 MB.
```

Lo bueno: **es JSON y no HTML** —el `413` está manejado, que es más de lo que suele estar— y el
contador del tope por IP **cuenta igual el 413** (lo medí: desde una IP nueva, cuatro envíos
gigantes dan 413 y el quinto ya da 429), así que no sirve de bypass del limitador.

Lo que queda es el mensaje: la persona lee "más de 4 MB" sobre una ruta que acepta 2. **Qué
pediría:** que el `413` diga el tope de la ruta que lo recibió, o un texto neutro ("El archivo es
demasiado grande").

---

### 10 · El criterio B3 pide 400 para `variant_id: "8"` y el servidor lo acepta — **BAJA**

**Archivo:** `backend/services/saneado.py:210-225` (`entero`), llamado desde
`renglon_del_pedido.py:130`.

El criterio B3 de `T4-F19a` dice:

> | B3 | `variant_id` inexistente, negativo, `"8"`, `null`, `{}` ⇒ 400 explicado en castellano |

Cuatro de los cinco se cumplen. El quinto no: `saneado.entero` acepta la cadena numérica **a
propósito** (su docstring lo justifica para el teléfono escrito como número), así que `"8"` entra
como `8`.

```
  variant_id=inexistente 999999  -> 400  err=Ese tamaño no es de «Torta de chocolate».
  variant_id=negativo -1         -> 400  err=«variant_id» tiene que estar entre 1 y 2147483647.
  variant_id=string "1"          -> 201   <- el criterio pide 400
  variant_id=null                -> 201   <- correcto, es B4
  variant_id=dict {}             -> 400  err=«variant_id» tiene que ser un numero entero.
  variant_id=lista []            -> 400  err=«variant_id» tiene que ser un numero entero.
  variant_id=float 2.9           -> 400  err=«variant_id» tiene que ser un numero entero.
  variant_id=True                -> 400  err=«variant_id» tiene que ser un numero entero.
  variant_id=10**30              -> 400  err=«variant_id» tiene que estar entre 1 y 2147483647.
```

**No es un agujero**: la cadena se convierte a entero y después pasa igual por la verificación
`variante.product_id == product.id`, que es el control que importa. `True` y `2.9` sí dan 400,
que es lo que `saneado.entero` existe para frenar.

**Qué pediría:** una de las dos, pero coherente — o el criterio se corrige en la tarjeta
("`"8"` se acepta como 8, a propósito"), o `entero` se vuelve estricto para los ids y laxo solo
donde hace falta. Prefiero lo primero: el comportamiento está bien pensado, el criterio está mal
escrito.

---

### 11 · El `GET /api/option-groups` público devuelve **todos** los grupos, no los de un producto — **INFO**

**Archivo:** `backend/routes/options.py:10-18`.

El criterio E6 dice *"El `GET` público devuelve los grupos **de un producto**, sin datos de más"*.
Lo implementado es una lista global sin auth:

```
$ curl -s http://127.0.0.1:5000/api/option-groups
[{"id":1,"name":"Relleno","options":[{"id":1,"name":"Dulce de leche","sort_order":0},
{"id":2,"name":"chocolate","sort_order":1}],"required":true,"sort_order":0}]
```

La parte "sin datos de más" **sí** se cumple: `Serializer.option_group` deja afuera
`normalized_name` y `created_at`, y lo verifiqué contra el serializador. Y los grupos de un
producto **también** llegan, por `GET /api/products/<id>`, que es lo que usa la ficha. Lo que la
lista global agrega es que cualquiera vea los grupos que todavía no se asignaron a nada — nombres
de sabores que ella publica igual. `contracts.md:245` lo documenta tal cual
(*"Público porque lo necesita la ficha"*), así que es una decisión tomada, no un descuido; lo
anoto solo porque el criterio E6 está escrito de otra manera.

---

### 12 · ADR-033 **sobreestima** el riesgo del renombre de la etiqueta — **INFO**

ADR-033 cierra con:

> si alguien renombra la etiqueta desde el panel, el slug cambia y la personalización deja de
> ofrecerse sin un solo error en los logs.

**No es así, y conviene que quede escrito**, porque es una preocupación menos. `tag_service.py:56`
mueve el slug **solo si se lo piden explícito** (`if data.get("slug")`), y el formulario de
etiquetas del panel manda `name`, `color_token` y `sort_order` — no `slug`. Reproducido:

```
  PUT renombrando la etiqueta -> 200
  etiquetas ahora: [(2, 'Tortas Personalizadas', 'tortas-personalizadas-2'),
                    (1, 'Tortas a pedido', 'tortas-personalizadas')]
```

La etiqueta renombrada a "Tortas a pedido" **sigue habilitando** la personalización. El riesgo
real del espejo es el del hallazgo 7 (una etiqueta nueva con slug desempatado) y el de borrarla,
no el del renombre. Pediría corregir el párrafo de ADR-033 con la nota de "corregido el …" que
las ADR vecinas ya usan.

---

### 13 · Dos `SAWarning` nuevos de autoflush en el armado del renglón — **INFO**

**Archivo:** `backend/services/renglon_del_pedido.py:146`.

```
backend\services\renglon_del_pedido.py:146: SAWarning: Object of type <OrderItem> not in session,
add operation along 'Product.order_items' will not proceed
  grupos = {grupo.id: grupo for grupo in product.option_groups}
```

El `OrderItem` se construye en la línea 77 con `order=order, product=product` —lo que lo engancha
a dos relaciones— y se agrega a la sesión en la 91; en el medio, la línea 146 dispara un autoflush
al leer `product.option_groups`. No rompe nada (el pedido se graba bien, 307 tests verdes), pero
es ruido nuevo en cada corrida y el tipo de cosa que un día esconde un flush parcial. Pediría
`db.session.add(item)` apenas se construye, o leer los grupos antes de construirlo.

---

### 14 · Lo que probé y **no** pude reproducir (sospechas, marcadas como tales) — **INFO**

Las dejo escritas para que nadie las vuelva a buscar, y marcadas como lo que son:

- **Dos pedidos con la misma foto.** Da `201` y `201`: una foto subida se puede adjuntar a N
  pedidos. Lo miré buscando un agujero y no lo es —es la foto de quien la subió, y `es_referencia`
  exige `kind == "reference"`, así que **no** se puede adjuntar una foto de producto de Andrea—
  pero conviene saber que está permitido.
- **`usePersonalizacion.ts:32`** tiene `product?.variants` (un array) en las dependencias del
  `useEffect` que resetea nota, foto y sabores. Si el producto se refetchea con un array nuevo, lo
  que la persona escribió se borra. No lo pude reproducir: en `ProductPage` el producto viene de
  un estado estable y el efecto no se vuelve a disparar. **Sospecha, no hallazgo.**
- **`marcar_usada` sin commit propio.** Lo revisé buscando una foto que quede marcada como usada
  después de un pedido que falló: no pasa, porque la marca viaja en la transacción del pedido y el
  rollback la deshace, así que el barrido se la lleva igual. Está bien hecho.
- **`X-Forwarded-For` para evadir el tope por IP.** No evade: el limitador usa `REMOTE_ADDR`.

---

## Lo que **sí** aguantó (para no volver a probarlo)

Esto lo probé con intención de romperlo y no se rompió. Sirve como inventario de lo que no hay que
volver a mirar.

**Plata (N3), que es lo que más importa:**

- El precio **nunca** llega del request. Pedido con `variant_id` de 12 porciones → `201` y
  `total: 19800.0`, con `unit_price` leído de la fila.
- `variant_id` de **otro producto** (una variante de $100 contra una torta de $19.800) → `400`
  *"Ese tamaño no es de «Torta de chocolate»"*, **y no se crea el pedido**. B2 cumplido.
- El mensaje de WhatsApp lo arma el servidor con los importes de la base y nombra el tamaño:
  `- 1 x Torta de chocolate (12 porciones): $19.800` + `  Relleno: Dulce de leche`. B5 cumplido.
- Un id inexistente y un id ajeno dan **el mismo** mensaje, a propósito: no se filtra qué ids hay.

**La frontera de la feature (ADR-031), nueve variantes hostiles, nueve 400 JSON:**

| Lo que mandé | Respuesta |
|---|---|
| `option_ids` de un grupo ajeno al producto | 400 · *Una de las opciones elegidas no es de «…»* |
| sin `option_ids` con un grupo `required` | 400 · *Falta elegir: Relleno.* |
| `option_ids: []` con un grupo `required` | 400 · *Falta elegir: Relleno.* |
| dos opciones del **mismo** grupo | 400 · *Elegí una sola opción de «Relleno».* |
| la misma opción repetida | 400 · *Elegí una sola opción de «Relleno».* |
| `option_ids` con **500 ids** | 400 · *Hay demasiadas opciones elegidas en un producto.* |
| `option_ids: "3"` (no lista) | 400 · *Las opciones elegidas tienen que venir como lista.* |
| `[null]`, `[{}]`, `[[1]]` | 400 · *«option_id» tiene que ser un numero entero.* |

**Ninguna sale con 500**, que es exactamente el riesgo que `current.md` dice haber medido rompiendo
el control (`KeyError en grupos[group_id]`). El control está y funciona.

**La puerta de la etiqueta (ADR-033), en seis disfraces:** un producto sin la etiqueta rechaza con
400 explicado `option_ids`, `note`, `reference_image`, `note: "   "` (solo espacios), `note: 0` y
`note: false`. Y acepta con 201 lo que debe aceptar: el producto pelado, `option_ids: []` con
`note: ""` (que es lo que el front manda cuando no hay nada), y `variant_id` **de su propia
variante** — que es lo que ADR-033 dice que no depende de la etiqueta. La puerta está donde dice
estar.

**La URL de la foto (el control que importa de F59), once variantes, once 400 JSON:** `https://`
externa, `../../etc/passwd`, un hex de 32 que no existe, `.svg`, `javascript:`, `data:`, un cloud
de Cloudinary **ajeno**, un dict, una lista, un número, y una URL de 10.000 caracteres. El
`_forma_de_cloudinary` que exige que el cloud sea el nuestro está bien pensado y funciona.

**El perímetro de la subida pública:**

- Un anónimo sube sin sesión → `201`, y la fila nace `kind=reference provisional=True`.
- La ruta de admin **sigue siendo admin-only**: sin token `401`, con token `201`. H8 cumplido.
- Tope por IP (H2), medido de a uno: `201 201 201 201` y después `429` con `Retry-After: 60`, en
  JSON. Y el `413` cuenta para el tope, así que no sirve de bypass.
- El validador por contenido no se saltea por la ruta nueva: un `.txt` → *"El archivo no es una
  imagen JPG ni PNG"*; un JPG truncado → *"El JPG no tiene marca de final"*; sin archivo →
  *"No llego ningun archivo"*. Todos 400 JSON.
- Barrido (H6/H7): la provisoria vencida se borra **del disco y del registro**; la provisoria ya
  usada por un pedido **no se toca**; la de producto tampoco. Los tres casos, verificados.

**El mensaje de WhatsApp con lo nuevo adentro (G7):** 10 tortas personalizadas, cada una con una
nota de ~290 caracteres, su relleno y su foto → **1.095 caracteres, tope 1.500**, con `Total:` y
los datos de contacto presentes al final. `_recortar` corta de a productos y el pie sobrevive, que
es lo que la tarjeta pide.

**El carrito como lógica pura:** `carrito.test.ts` es nuevo y tiene 27 casos (de los 124 totales,
repartidos en 12 archivos), y cubre lo que importa de B8/B9/G8 — dos tamaños = dos renglones, dos rellenos = dos renglones, el orden de
los sabores no cuenta, una coma en la nota sí, y **una nota con dos puntos no puede fingir la clave
de otro renglón** (el `JSON.stringify` en vez del `${a}:${b}` es la decisión correcta y está
testeada). El carrito viejo sin variante cae en la forma "sin nada" y sigue funcionando, sin subir
`CART_STORAGE_KEY`, como decide la tarjeta.

**Y lo que me gustó, porque no entra en ninguna tabla:** la tarjeta de un producto que se arma dice
**"Elegir y pedir"** y lleva a la ficha en vez de mandar un pedido que el servidor va a rechazar.
Es el detalle que `current.md` lista como "apareció construyendo" y es el que separa esto de una
feature que funciona en los tests y frustra en la pantalla.

---

## ¿`current.md` exagera o miente?

**Casi nada, y eso es poco común.** Punto por punto:

| Lo que dice | Lo que medí |
|---|---|
| 307 OK en el back | **307 OK** ✅ |
| 124 OK en el front | **124 OK** ✅ |
| Build 402,04 KB | **402,04 KB** ✅ al centavo |
| Migración en `0008` | **`0008 (head)`** ✅, y va y vuelve limpia sobre una copia de la base real |
| `T4-F19b` sin una línea escrita | ✅ verificado: `grep variant` en `pages/admin/` da una sola línea, y es de `OrdersTab` |
| Cloudinary nunca se vio andar (B8) | ✅ lo dice él mismo, y es cierto: `CLOUDINARY_API_SECRET` está vacío en `backend/.env`, así que todo corre por el camino de disco |
| El barrido se dispara al subir, no por reloj | ✅ lo dice él mismo; confirmado en `upload_service.py:51` |
| La base quedó como estaba: «7 pedidos, 0 renglones huérfanos, 0 opciones huérfanas» | ✅ exacto: `order=7`, `order_item=8`, `order_item_option=0`, `stored_image=0`, y quedan a propósito el grupo "Relleno" con sus dos sabores y la etiqueta puesta en el producto 2. Las 4 etiquetas tienen slugs distintos: **no** hay etiqueta decoy (hallazgo 7) en la base real |

Lo que sí **falta o está dicho de más**, y son tres cosas:

1. **`security.md:144` dice que la cuota «cierra D18» con un ✅**, y `handback_T18.md:20` repite la
   misma afirmación (*"Cuota total (cierra **D18**)"*), así que la corrección va en los dos lados.
   No lo cierra: lo cierra en el
   camino secuencial y se pasa 5,7× bajo concurrencia (hallazgo 1). Es la misma clase de frase que
   el reviewer anterior tuvo que corregir en ADR-030 (*"el título de la tarjeta decía que la
   unicidad vivía en el back y era mentira: vivía en una mirada"*). Esta dice que la cuota vive en
   el registro, y vive en una mirada.
2. **ADR-029 parte 3 está escrita en presente como algo hecho** y no existe (hallazgo 2).
   `current.md` no la nombra entre lo que falta.
3. **ADR-033 afirma un riesgo que no existe** (hallazgo 12): renombrar la etiqueta desde el panel
   no mueve el slug. Exagerar un riesgo cuesta menos que esconderlo, pero cuesta: alguien va a
   gastar una tarjeta en mitigarlo.

Y una cosa que `current.md` **no** reclama y conviene decir igual: la sección "El rojo, medido
rompiendo los controles a propósito (R29)" dice que el código se escribió antes de los tests y lo
dice de frente. Eso es lo que corresponde, y la medición del rojo con los dos controles apagados
es creíble: la reproduje de otra manera (los nueve ataques a `option_ids` sin un solo 500) y da lo
que dice.

---

## Alcance: lo que **no** revisé

- **El navegador.** No reabrí la app para repetir la verificación visual: ni los 375px/390px con
  `scrollWidth - clientWidth = 0` (B7, G9, G10, E9), ni el CRUD de la pestaña de opciones a mano
  (E1), ni el `CHOCOLATE` sobre `chocolate` desde el panel. Confirmé que las dos puntas están
  arriba (`back:200`, `front:200`) y que `GET /api/products/2` de la app corriendo devuelve la
  etiqueta, el grupo y las dos variantes —o sea: el cableado que la ficha necesita está—, pero la
  pantalla misma no la miré. **Lo de `current.md` sobre el navegador queda sin verificar
  independientemente.**
- **Seguridad y pentest.** R31 pide `security-reviewer` **y** `pentester` además de esto (N3 plata
  + N5 escritura pública). Esta review es la funcional. No hice análisis de XSS sobre la nota y el
  nombre del sabor renderizados en el panel, ni CSRF, ni timing, ni el polígloto/HEIC/WEBP de H5
  más allá de comprobar que la ruta nueva usa el mismo validador.
- **Cloudinary de verdad.** Sin credenciales (B8). No ejercité la firma SHA-1 contra el servicio
  real, ni el borrado remoto del barrido, ni qué pasa si Cloudinary contesta 500 en medio de un
  pedido. Es la deuda que `current.md` declara, y la comparto como no verificada.
- **Carga y volumen.** No medí qué pasa con 60 opciones × varios grupos en la ficha, ni el costo
  de `espacio_usado()` (un `SUM` por subida) con miles de filas.
- **El AI service** tocado hoy (`ai_service.py`, que ahora lee la foto por el almacén). Lo leí
  de pasada; no lo probé.
- **`OpcionesTab.tsx` / `useOpcionesDelPanel.ts` / `GrupoDeOpciones.tsx`** como pantalla. Miré el
  payload que arman y el back que los recibe, no la interacción.

## Higiene

Todo lo que corrí vive en
`C:\Users\Facundo\AppData\Local\Temp\claude\C--Users-Facundo-Estudio-Trabajo-Andres-Bakery\0a9fc113-d3b7-4119-82ce-a16b9b4f6d9d\scratchpad`
(cuatro scripts, sus bases SQLite y sus carpetas de subidas). **No agregué ni modifiqué un solo
archivo del repo salvo este informe.** La base real se usó en modo lectura: para las migraciones
copié `instance/bakery.db` a la carpeta temporal y apunté `DATABASE_URL` ahí, así que
`instance/bakery.db` sigue en `0008` y con los mismos datos. Las bases de los probes del back son
SQLite temporales, nunca la de desarrollo.
