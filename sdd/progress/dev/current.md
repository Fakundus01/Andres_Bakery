# T4-F19a + T18 + T4-F19b · Tortas a pedido, y F19 cerrada

**Rama:** `dev` · **Features:** F19 (la mitad que importaba), F57, F58, F59
**ADR:** 029, 030, 031, **032** y **033** (los dos últimos, nuevos de hoy) · **Versión:** 0.13.0
**Estado:** las cuatro tarjetas **implementadas y verdes**, verificadas en el navegador, **sin
commitear** (R01). Falta la **revisión independiente** (R30/R31), que es lo único que separa esto
de un `done`.

> Si esta sesión se corta: el commit anterior (`ddaf6f0`) dejó T6-F20 cerrado. Todo lo de hoy está
> en el árbol de trabajo, con los cuatro comandos en verde y la base de desarrollo migrada a `0008`
> (respaldo en `instance/bakery.db.respaldo-pre-0006`).

---

## Lo que pidió el humano, y lo que cambió a mitad de camino

El pedido fue "run de la app, commit, y terminemos la sección de tortas", con el detalle de qué
tenía que tener: la chef edita los gustos predeterminados, el cliente elige bizcocho y relleno, y
lo personalizado va por un textarea donde además puede subir imágenes de ejemplo.

Se preguntaron cuatro cosas antes de escribir código (R04) y las cuatro se respondieron:

| Lo que no cerraba | Lo que se decidió |
|---|---|
| F58 depende de `T4-F19a` | **F19a primero**, y de paso cierra el agujero de plata |
| ¿Qué fotos van a Cloudinary? | **Las dos**, con fallback a disco (ADR-032) |
| ¿Cómo sube la foto? | **La valida el back y la sube él**, firmado. Nunca el navegador |
| "el usuario puede elegir los que aparezcan" | **La chef elige por torta**, como ya decía ADR-031 |

**Y a mitad del ciclo entró un recorte que cambió el diseño:** *"solo es para el tag «tortas
personalizadas», para lo otro no"*. Quedó en **ADR-033**, y es lo que hace que una docena de cookies
no se personalice. La puerta es la etiqueta y **no** la presencia de grupos: si fuera por los grupos,
asignarle "Relleno" por error a las cookies las sacaría de la venta.

## Las cuatro tarjetas

| # | Tarjeta | Estado |
|---|---|---|
| 1 | [`T4-F19a-la-variante-se-cobra`](../../cards/T4-F19a-la-variante-se-cobra.md) | ✅ implementada |
| 2 | [`T18-F57-grupos-de-opciones`](../../cards/T18-F57-grupos-de-opciones.md) | ✅ implementada |
| 3 | [`T18-F58-el-cliente-arma-su-torta`](../../cards/T18-F58-el-cliente-arma-su-torta.md) | ✅ implementada, con el recorte de ADR-033 |
| 4 | [`T18-F59-foto-de-referencia`](../../cards/T18-F59-foto-de-referencia.md) | ✅ implementada, con Cloudinary de ADR-032 |

`T4-F19b` (cargar variantes desde el panel) **sigue sin una línea escrita**.

## Base medida antes de empezar

| Check | Base | Después |
|---|---|---|
| Tests del back | 228 OK | **307 OK** |
| Tests del front | 90 OK | **124 OK** |
| Migración | `0005` | **`0008`** |
| Último ADR | 031 | **033** |
| Build | 381,91 KB | **402,04 KB** |

## El rojo, medido rompiendo los controles a propósito (R29)

El código se escribió antes de los tests —y conviene decirlo, porque R29 pide al revés—, así que el
rojo se midió como pide la regla para un guard nuevo: **rompiendo el control una vez**.

```
--- con los dos controles apagados ---
FAIL: test_la_variante_de_otro_producto_no_compra_la_torta_barata
      AssertionError: ValidationError not raised        <- cobra de menos
ERROR: test_un_sabor_de_un_grupo_que_no_es_del_producto_no_entra
      KeyError en grupos[group_id]                      <- 500, no 400
Ran 17 tests · FAILED (failures=1, errors=1)
```

El segundo dice algo que conviene anotar: **sin la verificación, el sabor ajeno no entra "mal", hace
reventar el endpoint con un 500** — la clase de bug con la que arranca `saneado.py`. Con los dos
controles puestos: 17 OK.

Y el de la etiqueta (ADR-033) se midió igual, al revés: al poner la puerta, **7 tests de los que ya
estaban se pusieron rojos** porque usaban un producto sin etiquetar. Eso es la regla nueva
funcionando; se actualizaron a la fábrica `create_producto_personalizable`.

## Lo que apareció construyendo, y no estaba en ninguna tarjeta

- **`models.py` pasó las 300 líneas** (R05) y se partió en paquete (`catalogo`, `pedidos`, `sitio`,
  `usuarios`) con un `__init__` que mantiene la puerta: ningún import cambió. Igual `lib/types.ts`.
- **El asistente de IA se iba a romper con Cloudinary prendido**: leía la foto del disco a mano, así
  que una foto en Cloudinary le habría hecho decir "primero subí la foto" sobre una foto subida.
  Ahora la lee el almacén.
- **La tarjeta de un producto que se arma dice "Elegir y pedir"** y lleva a la ficha: agregarlo
  desde la tarjeta mandaba un pedido que el servidor rechaza.
- **`nombre_para_guardar` salió a `saneado`**: los grupos y los sabores tienen la misma unicidad
  normalizada que los ingredientes, sin copiar la función.

## Verificación en navegador — hecha el 2026-10-19

Panel: grupo "Relleno" creado con dos sabores · `CHOCOLATE` sobre `chocolate` **no duplicó** · la
etiqueta creada con el botón de la pestaña · puesta en la torta ⇒ la ficha ofrece tamaño, relleno,
textarea y foto, y el **box no ofrece nada** · la foto subió **sin sesión** · el pedido llegó con
`12 porciones` a **$19.800** (no $14.200), su relleno, su nota y su foto · el mensaje de WhatsApp los
nombra · `stored_image` marcó la foto como usada (`provisional=0`) · 375px y 390px con
`scrollWidth - clientWidth = 0` en la ficha, el carrito, la carta y el panel.

La base de desarrollo quedó como estaba: los dos pedidos de prueba y la foto de prueba se borraron a
mano (verificado: 7 pedidos, 0 renglones huérfanos, 0 opciones huérfanas). Quedan a propósito el
grupo "Relleno", sus sabores y la etiqueta.

## La revisión independiente, y qué rompió (R30/R31)

Dos revisores que **re-ejecutaron**: el funcional ([`review_T18.md`](review_T18.md),
`CHANGES_REQUESTED`, 14 hallazgos) y el de seguridad + pentester
([`security_review_T18.md`](security_review_T18.md), `CHANGES_REQUESTED`, 9, **ninguno CRÍTICA ni
ALTA**). Los dos confirmaron los cinco números del handback.

**Lo que aguantó**, y conviene no volver a probarlo: 22 formas de `variant_id` y ninguna pagó de
menos; el total nunca quedó por debajo de la suma de los renglones; 33 payloads contra la URL de la
foto y entraron solo las que emitimos nosotros; el tope por IP no se saltea con 10 headers de proxy
distintos; 30 combinaciones de credencial × ruta de admin dieron 401/403/422; y la puerta de la
etiqueta rechazó en seis disfraces.

**Lo que rompieron, corregido con su test:**

| Qué | Cómo quedó |
|---|---|
| La cuota se pasaba **5,7×** con seis subidas simultáneas (el `check-then-insert` de ADR-030, en otro archivo) | se reserva la fila y después se verifica la suma, con candado; test con hilos y barrera |
| **Los ids de variante se movían en cada guardado** — ADR-029 parte 3 estaba escrita como hecha sin estarlo. Con rowid reusado, un carrito de $14.000 salió como pedido de 12 porciones | `_build_variants` actualiza en lugar de reemplazar, y el carrito manda el **nombre como testigo** |
| Una sola cuota para las dos puertas: el anónimo la llenaba y Andrea recibía 507 | `REFERENCE_UPLOAD_QUOTA_BYTES`, y un mensaje por puerta |
| Dos **500 con HTML** en una API JSON (normalizado vacío; body que no es objeto) | 400 explicado, y el del body venía de antes de esta tanda |
| El contador de la nota prometía 300 y el back recortaba hasta 198 | el front cuenta lo que el back mide |
| Tres callejones sin salida del carrito | "Cambiar lo elegido" en el renglón |
| La carta mostraba un precio que no se podía comprar | dice **"desde $X"** con tamaños |

**Y una que salió del test del arreglo:** `normalizar_nombre` no recortaba las puntas, así que un
nombre de dos marcas y un espacio normalizaba a `" "`. Era **otra divergencia con el front**, que
hace `trim()` — el espejo que ADR-030 dice sostener.

## Lo que FALTA, y no es menor

1. **Cloudinary nunca se vio andar**: no hay credenciales (B8). Lo que está probado es la firma, la
   decisión de destino y la validación de la URL; la llamada HTTP real no se ejercita nunca, que es
   la misma deuda que D20 tiene con Anthropic.
2. **El barrido se dispara al subir**, no por reloj: si nadie sube nada por un mes, lo provisorio de
   ese mes espera. Lo acota la cuota, no el tiempo.
3. **Un anónimo puede guardar bytes arbitrarios** dentro de un PNG válido (hasta 2 MB). No es
   ejecutable ni es XSS; es almacenamiento opaco. La salida real es reencodear los píxeles, que es
   el precio de no tener `Pillow` (D16/D19). Queda anotado en `security.md`, sin maquillar.
4. **`tag_service` compara el nombre exacto** y no el normalizado (**D28**): dos etiquetas que se
   llaman igual y solo una habilita. El panel ahora nombra la parecida, pero el back no lo frena.

## T4-F19b · implementada el 2026-10-19, después del commit de T18

Lo último que le faltaba a F19 desde T3: los tamaños se cargan **desde el panel**. El detalle está
en [`handback_T4-F19b.md`](handback_T4-F19b.md), y lo que importa de ahí es lo que **salió del
navegador y ningún test vio**:

- **El resumen del checkout cobraba el precio base**: una torta de 20 porciones de $28.000 mostrada
  en $14.200 en su renglón, con el total correcto al lado. Era el agujero de F19a en el único
  archivo que no se había tocado, y **las dos revisiones de T18 no lo vieron**.
- **Dos renglones del mismo producto compartían la key de React**, con su error en consola. Recién
  fue posible cuando el carrito pudo tener dos tamaños de la misma torta.
- El editor quedaba cerrado al apretar "Editar", y la portada decía un precio que no se puede
  comprar.

Verde: back **330 OK**, front **166 OK**, lint y build limpios. En el navegador: tamaño cargado, los
ids sin moverse, comprado sin sesión a $28.000, borrado con su aviso, y 375/390px sin desborde.

## PRÓXIMO PASO

Revisión independiente de `T4-F19b` (R30) ⇒ OK humano ⇒ commit. Después, de la cola: **F41
(deploy)**, que depende de las credenciales de Cloudinary (B8) y de `ProxyFix` (D25).
