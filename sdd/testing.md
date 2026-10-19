# testing.md · Andres Bakery

**Versión:** 0.4.0 · **Última actualización:** 2026-10-19

## 1 · Cómo se corre (comandos reales, verificados el 2026-10-16)

Los mismos que `harness.config.json`. **Siempre desde la raíz del repo**: los imports del back son `backend.*`.

```bash
# Back: 339 tests, unittest (NO pytest: el venv no lo tiene)
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q

# Front: 90 tests de logica pura, Vitest (ADR-023)
npm --prefix front/Andres_Bakery run test

# Front: eslint + tsc (los dos proyectos de TS)
cd front/Andres_Bakery && npm run lint

# Front: build de producción
cd front/Andres_Bakery && npm run build
```

Estado medido el 2026-10-17 tras T16: **151 tests del back + 48 del front OK**, lint limpio, build en verde (366,59 KB de JS, 33,92 KB de CSS).

## 2 · Qué hay cubierto hoy

| Archivo | Qué cubre |
|---|---|
| `test_api.py` | endpoints de punta a punta sobre una app de test con SQLite temporal |
| `test_product_service.py` | alta/edición/borrado de productos, slug, unidades, etiquetas y variantes |
| `test_ingredient_service.py` | unicidad normalizada (acentos, mayúsculas, espacios; la ñ **no** se conflacta), topes de largo, tipos raros y el `PUT` (ADR-030) |
| `test_tag_service.py` | etiquetas: slug, color válido, orden y borrado sin tocar los productos |
| `test_quantity.py` | la regla de `min_qty`/`qty_step` ("se venden de a 6") |
| `test_slug.py` | `slugify` y el desempate cuando el slug ya existe |
| `test_env_file.py` | el lector de `.env` (ADR-015), incluida la precedencia del entorno |
| `test_order_service.py` | creación de órdenes, cálculo de total y envío |
| `test_payment_service.py` | checkout y webhook con un `FakeMercadoPagoClient` |
| `test_bootstrap_service.py` | creación del admin, **que arrancar no le pise la contraseña** (D13) y la siembra inicial |
| `test_profile_service.py` | el perfil y el CV: qué se guarda, qué se recorta y qué se descarta (ADR-017) |
| `test_image_file.py` | el validador/limpiador de imágenes: EXIF, chunks, políglotas, HEIC, WEBP, archivos cortados (ADR-018) |
| `test_option_service.py` | los grupos de sabores: unicidad normalizada del grupo y del sabor **dentro** del grupo, topes, que una opción de otro grupo no se toque por la ruta de este, y que borrar un grupo no rompa un pedido viejo (F57) |
| `test_pedido_personalizado.py` | el renglón: que **el tamaño elegido se cobre** y que el `variant_id` ajeno sea 400, los sabores validados contra los grupos de ESE producto, los `required`, la nota acotada a una línea, y dos rellenos distintos como dos renglones (F19a, F58) |
| `test_solo_las_tortas_se_personalizan.py` | la puerta de ADR-033: sin la etiqueta, `option_ids`, `note` y `reference_image` son 400, y un grupo obligatorio mal asignado **no** saca el producto de la venta |
| `test_foto_de_referencia.py` | la subida pública: nace provisoria, el tope más chico que el del panel, la cuota (507) y **las diez URLs que no se aceptan** como foto de referencia (F59) |
| `test_precio_del_producto.py` | lo que el back tiene que rechazar en un precio: `NaN`, `1e400`, cero, negativos, el tope de la columna, y que un producto **sin** precio siga pudiendo existir (review de T4-F19b) |
| `test_cuota_de_subidas.py` | la cuota bajo concurrencia (seis hilos con barrera contra una cuota de una) y el techo propio de cada puerta |
| `test_renglon_personalizado.py` | los sabores, la nota y la foto del renglón (F58); `test_pedido_personalizado.py` quedó con el tamaño (F19a) |
| `test_subida_publica.py` | el barrido de huérfanas (la provisoria vencida se va, la usada **nunca**), la firma de Cloudinary, la ruta pública por HTTP (429 con `Retry-After`, 413 con **su** tope, la del panel sigue admin-only) y **la cuota bajo concurrencia**: seis hilos con una barrera contra una cuota de una |
| `test_upload_service.py` | la subida: nombre generado, tope de tamaño, lo que no toca el disco, path traversal |
| `test_metrics_service.py` | normalización de rutas y dispositivos, contadores agregados y el resumen (ADR-019) |
| `test_ai_service.py` | el asistente con `FakeRecipeClient`: apagado, techo diario, recorte de la salida, SSRF (ADR-020) |
| `test_api_panel.py` | los endpoints nuevos de punta a punta: permisos, headers de seguridad, 503 de la IA |
| `imagenes_de_prueba.py` | un JPEG **real** (escrito por el encoder de Windows, en base64) y un PNG armado con CRC y zlib |
| `support.py` | `BackendServiceTestCase` (servicios) y `ApiTestCase` (app + cliente HTTP + login de admin), los dos con DB temporal por test en `backend/tests/.tmp/` |

**Convención a respetar:** cada test crea su propia DB SQLite con nombre `uuid4()` y la borra al terminar. Los servicios externos se inyectan como fake (`FakeMercadoPagoClient`, `FakeRecipeClient`), nunca se llama a la API real — y con la IA eso además **no cuesta plata**.

**Una clase de tests no hereda de otra.** El arnés de la app de test vive en `support.py`, que `discover` no carga como módulo de tests. Cuando `test_api_panel` heredaba de `test_api`, unittest corría la suite entera del padre otra vez: 13 tests nuevos aparecían como 23.

**Las imágenes de los tests son reales, no bytes inventados.** El JPEG salió de un encoder de verdad y por eso trae su APP0 JFIF, que es justo lo que hay que tirar; el PNG se arma con `zlib` y CRC calculado. Una primera versión del fixture se escribió partiendo el base64 a mano y quedó corrupto: los tests fallaron hasta que el base64 se generó con código.

**Lo que NO cubren los tests y se verificó en el navegador (T3):** el salto de cantidades en la ficha (6 → 12 con un clic), el carrito leyendo el envío del back, el checkout con los pagos apagados hasta el pedido #4, y 390px sin desbordes en cinco rutas.

**Las migraciones también se prueban**: `0002` se corrió sobre una **copia** de la base real antes que sobre la real, en los dos sentidos (`upgrade` y `downgrade`) y desde una base vacía. Una migración que nunca se ejecutó no está probada.

**Lo que se verificó en navegador el 2026-10-18** (R07), para F20: que el selector liste y marque; que crear un ingrediente no borre lo escrito en el formulario; que escribir `azucar` **reuse** «Azúcar» (medido: 1 solo `POST /api/ingredients` en toda la sesión); que editar y guardar sin tocar ingredientes no se los lleve; que **Enter en el campo de ingrediente no guarde el producto** (medido: `0 POST /api/products`); y 375px y 390px con `scrollWidth - clientWidth = 0`.

**Lo que se verificó en navegador el 2026-10-17** (R07), no con tests: el giro por hover y que el dorso tenga su "Agregar"; la subida de una foto real de punta a punta (archivo elegido → guardado → servido → mostrado en el formulario y en la carta); el panel con sus gráficos; `/historia` con las redes; `/cv`; y 390px sin desbordes en cuatro rutas.

**Lo que enseñó la revisión del 2026-10-17 sobre estos mismos tests** (R30: el reviewer no solo corre la suite, la audita):

- **Un test puede pasar por el motivo equivocado.** El del WEBP afirmaba que el mensaje contenía `"JPG"`… y el mensaje genérico de "no es una imagen" también lo contiene. Con la rama del WEBP borrada, seguía verde. Ahora afirma `"WEBP"`.
- **Un `assertEqual` puede ser una tautología.** `assertEqual(list(carpeta.glob("*")) if carpeta.exists() else [], [])` comparaba `[]` contra `[]`, porque en ese test la carpeta nunca llega a crearse. Ahora dice `assertFalse(carpeta.exists())`, que es lo que se quería decir.
- **Afirmar ausencias no alcanza.** Todos los asserts sobre imágenes eran "no está el EXIF", "no está el `<script>`" — compatibles con un limpiador que mastique mal la imagen y devuelva un JPEG roto. Entró un **golden de bytes**: la foto limpia tiene que ser *exactamente* la original menos el segmento APP0, y lo que queda en disco tiene que ser *exactamente* lo que el validador aprobó.
- **Los bugs de concurrencia no se ven leyendo.** Las dos carreras (el contador de visitas y el de la IA) estaban en código que se lee perfecto. Se prueban forzando el interleaving, no esperando que ocurra.

**Lo que se verificó en navegador el 2026-10-17 (T15)**, con el mouse real y midiendo, no mirando: el giro por clic (ancho mínimo de la tarjeta durante la animación, y cero giros al cruzar la grilla); el menú de cuenta con y sin sesión; el panel lateral en sus dos modos, con mouse y con teclado; 11 rutas × 2 modos × 390/1280 px × con y sin sesión = **88 cargas limpias** sin desbordes ni errores de consola; las 4 escalas de letra contra el alto del header; y el sitio entero con `localStorage` reventado a propósito.

## 2b · Qué cubre el front (Vitest, ADR-023)

| Archivo | Qué cubre |
|---|---|
| `lib/iniciales.test.ts` | las iniciales del círculo de la cuenta, incluidos los emojis que antes se partían al medio |
| `lib/imagenes.test.ts` | cuándo una foto lleva adelante el host del back y cuándo no |
| `lib/cantidades.test.ts` | la regla de "se venden de a 6", espejo de `quantity.py`, con la propiedad de que lo que acomoda siempre es válido |
| `lib/sesionGuardada.test.ts` | leer, guardar y **borrar** la sesión, con el almacenamiento bloqueado y con un JSON roto |
| `components/charts/piezas.test.ts` | las marcas del eje (todas enteras) y el formato corto |
| `preferencias/sanear.test.ts` | lo que viene de `localStorage` no puede romper la pantalla |
| `pages/admin/altaDeIngrediente.test.ts` | el alta con una API falsa: el nombre que manda, el rescate cuando el alta falla, y que se quede con el nombre que devuelve el servidor |
| `lib/ingredientes.test.ts` | comparar nombres de ingredientes sin acentos ni mayúsculas, **conservando la ñ**, para no duplicar lo que ya existe (F20) |
| `lib/carrito.test.ts` | la identidad del renglón: dos tamaños son dos renglones, el orden de los sabores no, una coma en la nota sí, y **el precio del renglón sale de la variante** (F19a, F58) |
| `lib/variantes.test.ts` | los tamaños del panel: qué falta para poder guardar, el payload con los **ids** de los que ya estaban, el orden que sale de la pantalla y el aviso de lo que se borra (F19b) |
| `pages/admin/payloadDelProducto.test.ts` | la vuelta completa producto → formulario → payload, que es donde el texto de un `<input>` se vuelve plata |
| `lib/personalizacion.test.ts` | la puerta de la etiqueta (ADR-033), qué falta elegir, el espejo de la nota con el back, el precio "desde" de la tarjeta y la etiqueta que se llama igual pero no habilita |

**Entorno `node`, no `jsdom`:** nada de esto monta componentes. Lo visual se sigue verificando en el navegador (R07).

**El runner encontró un bug antes de terminar de instalarse:** el primer test del eje se puso rojo con máximo 4 —techo 5, línea del medio en 2,5, etiqueta "3"— y eso cambió el diseño del eje. Un runner que no encuentra nada el primer día es un runner mal apuntado.

**Lo que todavía NO se prueba acá:** componentes, hooks y todo lo que necesita un DOM. Eso sigue siendo navegador.

**Hueco que queda:** los **componentes** del front. La lógica pura ya está cubierta; lo que sigue sin red es que un componente renderice lo que debe. Entra con `jsdom` + Testing Library cuando haga falta, con su línea en `decisions.md` (R28).

## 3 · Estrategia

- **Back ⇒ tests automatizados** (R07). Todo servicio nuevo o modificado trae su test en el mismo ciclo.
- **Front ⇒ dos caminos.** La **lógica pura** va a Vitest (ADR-023): cuentas, formato, saneado de datos de entrada. Lo **visual y lo que necesita un navegador** —temas, contraste, 390px, que el panel se abra, que la tarjeta gire— se revisa en el navegador y se deja constancia en el handback. Si un bug se puede escribir como "esta función recibe X y tiene que devolver Y", es de Vitest.
- **TDD donde hay aritmética o reglas** (R29): rojo medido contra la base, no deducido. Precios, mínimos, pasos y totales entran por acá.
- **Loop cerrado** (R30): `done` necesita comando + salida literal + hash, y un reviewer que **re-ejecuta** y que no sea quien implementó.

## 4 · Los criterios de `spec.md`, mapeados

| V | Cómo se verifica | Tipo |
|---|---|---|
| V1 · ningún archivo >300 líneas | `find src -name '*.tsx' -o -name '*.ts' \| xargs wc -l \| sort -rn \| head` + `npm run lint` + `npm run build` | automatizable |
| V2 · temas: cambian todo, persisten, contraste AA | navegador: los 4 temas × recarga; contraste con DevTools o `axe` | navegador |
| V3 · 5 × precio sin pedir al servidor | test de la función de total + navegador (pestaña Network vacía) | unit + navegador |
| V4 · mínimo 6 no deja pedir 3 | test de servicio: `POST /api/orders` con qty 3 ⇒ 400 y no se crea fila | automatizado |
| V5 · etiqueta visible y filtrable | test de API del filtro + navegador | automatizado + navegador |
| V6 · WhatsApp con detalle y total, orden en DB | ✅ `test_mensaje_whatsapp` (el renglón se calcula con el `unit_price` guardado, aunque el producto cambie de precio después) + `test_pedido_whatsapp` + navegador: pedido #6 real sin sesión | automatizado + navegador |
| V7 · el total lo calcula el servidor | ya cubierto por `test_order_service.py`; **no puede volverse rojo** | automatizado |
| V8 · panel operable en 375px | navegador, viewport de iPhone SE | navegador |
| V9 · los tests siguen verdes tras la migración | el comando de §1 | automatizado |
| V11 · una foto subida no conserva metadatos | `test_image_file` + `test_upload_service` leen **los bytes del archivo guardado** | automatizado |
| V12 · lo que devuelve el modelo no entra crudo | `test_ai_service`: un borrador con `tags`, `precio` y `sql` sale con las siete claves de siempre | automatizado |
| V13 · las visitas no identifican a nadie | `test_metrics_service` compara las **columnas de la tabla** contra la lista esperada | automatizado |
| V15 · dos visitas simultáneas no le dan 500 a nadie | `test_metrics_service` fuerza el choque contra el índice único | automatizado |
| V16 · la foto limpia es la original menos sus metadatos, byte a byte | `test_image_file`: golden de bytes, no ausencia de strings | automatizado |
| V17 · el invitado puede comprar sin cuenta | `test_api_pedido_whatsapp`: `POST /api/orders/whatsapp` **sin token** devuelve 201 y la fila queda con `user_id = None`. La misma llamada contra `/api/orders` da 401: esa era la pared | automatizado |
| V18 · el envío no lo decide el cliente | `test_pedido_whatsapp` manda `shipping_amount` en `0`, `-5000` y basura: el total siempre sale con la tarifa configurada | automatizado |
| V19 · el tope por IP corta de verdad | `test_api_pedido_whatsapp`: el cuarto pedido del minuto da **429** con `Retry-After` y **no** se guarda. Visto en rojo sacándole el decorador a la ruta: `AssertionError: 429 != 201` (R29) | automatizado |
| V20 · la ruta pública no contesta 500 ante basura | `test_pedido_hostil`: nueve formas de mandar un campo del tipo equivocado, todas 400 y **sin fila a medias**. Rojo medido contra `5446f6b`: 21 fallas y 13 errores | automatizado |
| V21 · el mensaje entero entra en el tope | `test_pedido_hostil`: con nombre, dirección y notas al máximo, el mensaje queda bajo 2000 y conserva total y entrega. Antes: 6176 | automatizado |
| V22 · equivocarse con el formulario no deja a nadie sin comprar | `test_api_pedido_whatsapp`: cinco 400 seguidos y el sexto pedido, bueno, sale 201 | automatizado |
| V23 · el panel muestra al invitado | `pedidos.test.ts`: nombre, teléfono y «sin cuenta». Antes la tarjeta decía «undefined» | automatizado |
| V14 · el techo de gasto de la IA sobrevive a un reinicio | `test_ai_service`: una **instancia nueva** del servicio (= otro worker) sigue topada. Visto rojo contra el código viejo | automatizado |

## 5 · Cobertura mínima para dar algo por `done`

1. Servicio nuevo o tocado del back ⇒ su test, verde.
2. Los **213** del back y los **72** del front, verdes (V9). Un test que había pasado y ahora no, bloquea.
3. `npm run lint` y `npm run build`, limpios (V1).
4. Si se tocó algo visible ⇒ revisado en navegador, en celular y en escritorio, y dicho en el handback.
5. Si el cambio toca precios, mínimos o totales ⇒ el rojo se vio primero (R29).

## 6 · Tests que estaban mal, y qué enseñaron

**Lo que 166 tests verdes no vieron, lo vio la consola del navegador (2026-10-19).** Con los
tamaños cargables desde el panel, el carrito pudo tener por primera vez **dos renglones del mismo
producto**, y ahí aparecieron dos cosas que ningún test cubría: el resumen del checkout cobraba el
**precio base** en cada renglón (una torta de $28.000 mostrada en $14.200, con el total correcto al
lado) y los dos renglones **compartían la key de React**. El segundo lo gritó la consola; el primero
se vio al leer la pantalla. La lección no es "falta un test": es que el caso **recién se volvió
posible** con esta tanda, y la pantalla de confirmar un pedido se mira con los ojos antes de
confiarle plata a nadie.

**El test del arreglo encontró un bug más grande que el arreglo (2026-10-19).** Cerrando el 500 que
daba un nombre cuyo normalizado quedaba vacío, un caso del test —dos marcas combinantes separadas
por un espacio— no levantaba el error esperado: `normalizar_nombre` usaba `split(" ")` en vez de
`split()`, así que no recortaba las puntas y devolvía `" "`, que es verdadero. O sea: **el back no
espejaba al front**, que hace `trim()`, y el espejo es justo lo que ADR-030 dice sostener. El caso
del test era de borde; la divergencia que destapó, no.

**Un control nuevo se prueba rompiéndolo (2026-10-19).** El código de F19a/F58 se escribió antes de
sus tests, al revés de lo que pide R29. El rojo se midió como pide la regla para un guard nuevo:
apagando el control una vez. Lo que mostró no era lo esperado y es lo valioso: sin la verificación
de que la variante sea del producto, el test **cobra de menos**; pero sin la de las opciones, el
pedido con un sabor ajeno **no entra mal, revienta con un 500** (`KeyError` al armar el nombre del
grupo). O sea: el control no estaba solo evitando un dato raro, estaba evitando una caída. Un test
que solo mira el 400 no lo habría contado.

**Una regla nueva se nota en los tests que ya estaban (2026-10-19).** Al poner la puerta de la
etiqueta (ADR-033), 7 tests que pasaban se pusieron rojos: usaban productos sin etiquetar. Eso no
era un problema de los tests, era la regla funcionando. Se actualizaron con una fábrica
(`create_producto_personalizable`) en vez de parchear cada caso, para que el próximo test de
personalización no tenga que acordarse de la etiqueta.

**`DATABASE_URL` es la variable, y equivocarse apunta a la base real (2026-10-19).** Probando la migración `0005` se corrió un `downgrade` pasando `SQLALCHEMY_DATABASE_URI` —que `config.py` **no** lee— creyendo que iba contra una copia. Fue contra `instance/bakery.db`: la bajó a `0003` y escribió el mail placeholder en 3 pedidos que lo tenían en NULL. Se restauró hacia adelante y se verificó fila por fila. La regla: **un comando de migración que no nombra `DATABASE_URL` apunta a la base real.** Y antes de tocar migraciones, copiar la base.


**Una prueba en el navegador contra un servidor viejo no prueba nada (2026-10-19).** El arreglo de la unicidad del ingrediente "falló" en el navegador y el duplicado entró igual. El código estaba bien: el proceso de Flask venía de antes del cambio, y **no recarga solo** desde que `debug=True` se apagó en la review de T7. La regla que queda: después de tocar el back, se reinicia **antes** de creerle a una prueba en el navegador — y si el resultado contradice a un test unitario que pasa, el sospechoso número uno es el proceso, no el código.


Dos del 2026-10-17 (T7). Ninguno era un bug del código: eran tests que medían otra cosa de la que decían.

**El tiempo falso tiene que ser distinto en cada paso.** El test de la ventana deslizante del limitador registraba dos intentos seguidos con el reloj congelado y después esperaba que, pasado el minuto, se liberara **un** lugar. Se liberaban los dos: las dos marcas tenían el mismo instante. El test fallaba con el código correcto. La versión buena separa los intentos diez segundos, que es lo que hace que la ventana *se deslice* en vez de vaciarse de golpe.

**Un tope de prueba demasiado chico prueba otra cosa.** El test del recorte del mensaje usaba un tope de 60 caracteres esperando "entra el primer producto y el resto se resume". Con 60 no entraba ni el primero —el aviso del resto ocupa 57— así que el mensaje salía resumiendo los cuatro y la cuenta no daba. Con 100 el test mide lo que dice. Lección: cuando el caso de borde depende de dos largos, hay que calcular el número, no elegirlo a ojo.

**Un test con una fecha fija adentro es una bomba de tiempo.** Los dos tests del resumen de métricas fijaban `hoy = date(2026, 10, 17)` y creaban el pedido con el default `utcnow()`. Pasaron todo el día y se pusieron rojos solos **a las 00:01 UTC**, sin que nadie tocara ese código. El arreglo no es mover la fecha: es que el dato del test traiga su propia fecha (`create_order(..., created_at=...)`), así el test no depende de cuándo se corre.
