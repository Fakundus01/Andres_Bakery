# testing.md · Andres Bakery

**Versión:** 0.2.0 · **Última actualización:** 2026-10-17

## 1 · Cómo se corre (comandos reales, verificados el 2026-10-16)

Los mismos que `harness.config.json`. **Siempre desde la raíz del repo**: los imports del back son `backend.*`.

```bash
# Back: 151 tests, unittest (NO pytest: el venv no lo tiene)
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q

# Front: eslint + tsc (los dos proyectos de TS)
cd front/Andres_Bakery && npm run lint

# Front: build de producción
cd front/Andres_Bakery && npm run build
```

Estado medido el 2026-10-17 tras T10-T14: **151 tests OK**, lint limpio, build en verde (360,12 KB de JS, 30,71 KB de CSS).

## 2 · Qué hay cubierto hoy

| Archivo | Qué cubre |
|---|---|
| `test_api.py` | endpoints de punta a punta sobre una app de test con SQLite temporal |
| `test_product_service.py` | alta/edición/borrado de productos, slug, unidades, etiquetas y variantes |
| `test_tag_service.py` | etiquetas: slug, color válido, orden y borrado sin tocar los productos |
| `test_quantity.py` | la regla de `min_qty`/`qty_step` ("se venden de a 6") |
| `test_slug.py` | `slugify` y el desempate cuando el slug ya existe |
| `test_env_file.py` | el lector de `.env` (ADR-015), incluida la precedencia del entorno |
| `test_order_service.py` | creación de órdenes, cálculo de total y envío |
| `test_payment_service.py` | checkout y webhook con un `FakeMercadoPagoClient` |
| `test_bootstrap_service.py` | creación del admin, **que arrancar no le pise la contraseña** (D13) y la siembra inicial |
| `test_profile_service.py` | el perfil y el CV: qué se guarda, qué se recorta y qué se descarta (ADR-017) |
| `test_image_file.py` | el validador/limpiador de imágenes: EXIF, chunks, políglotas, HEIC, WEBP, archivos cortados (ADR-018) |
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

**Lo que se verificó en navegador el 2026-10-17** (R07), no con tests: el giro por hover y que el dorso tenga su "Agregar"; la subida de una foto real de punta a punta (archivo elegido → guardado → servido → mostrado en el formulario y en la carta); el panel con sus gráficos; `/historia` con las redes; `/cv`; y 390px sin desbordes en cuatro rutas.

**Lo que enseñó la revisión del 2026-10-17 sobre estos mismos tests** (R30: el reviewer no solo corre la suite, la audita):

- **Un test puede pasar por el motivo equivocado.** El del WEBP afirmaba que el mensaje contenía `"JPG"`… y el mensaje genérico de "no es una imagen" también lo contiene. Con la rama del WEBP borrada, seguía verde. Ahora afirma `"WEBP"`.
- **Un `assertEqual` puede ser una tautología.** `assertEqual(list(carpeta.glob("*")) if carpeta.exists() else [], [])` comparaba `[]` contra `[]`, porque en ese test la carpeta nunca llega a crearse. Ahora dice `assertFalse(carpeta.exists())`, que es lo que se quería decir.
- **Afirmar ausencias no alcanza.** Todos los asserts sobre imágenes eran "no está el EXIF", "no está el `<script>`" — compatibles con un limpiador que mastique mal la imagen y devuelva un JPEG roto. Entró un **golden de bytes**: la foto limpia tiene que ser *exactamente* la original menos el segmento APP0, y lo que queda en disco tiene que ser *exactamente* lo que el validador aprobó.
- **Los bugs de concurrencia no se ven leyendo.** Las dos carreras (el contador de visitas y el de la IA) estaban en código que se lee perfecto. Se prueban forzando el interleaving, no esperando que ocurra.

**Lo que se verificó en navegador el 2026-10-17 (T15)**, con el mouse real y midiendo, no mirando: el giro por clic (ancho mínimo de la tarjeta durante la animación, y cero giros al cruzar la grilla); el menú de cuenta con y sin sesión; el panel lateral en sus dos modos, con mouse y con teclado; 11 rutas × 2 modos × 390/1280 px × con y sin sesión = **88 cargas limpias** sin desbordes ni errores de consola; las 4 escalas de letra contra el alto del header; y el sitio entero con `localStorage` reventado a propósito.

**Hueco grande:** **cero tests de front**. No hay runner instalado, y la lista de lógica pura que lo pide ya es larga: `iniciales` (el reviewer encontró el bug de los emojis **leyendo**, no corriendo nada), `ejeY`, `formatoCorto`, `urlDeImagen`, `sanear` de las preferencias y `acomodarCantidad`. Son todas funciones sin React ni red: un runner y media hora las cubre. **Entra Vitest cuando el humano lo apruebe** — es dependencia nueva y pide su ADR (R28). Dos bugs de este ciclo —el eje que etiquetaba "1" dos veces y el texto de 5px en celular— se encontraron **mirando la pantalla**, que es exactamente lo que un test hubiera atrapado antes.

## 3 · Estrategia

- **Back ⇒ tests automatizados** (R07). Todo servicio nuevo o modificado trae su test en el mismo ciclo.
- **Front ⇒ navegador** (R07). Las verificaciones visuales (temas, contraste, 375px) se revisan en el navegador y se deja constancia en el handback. Se suma Vitest + Testing Library solo para la lógica pura que lo amerite (cálculo de totales, armado del mensaje de WhatsApp, `min_qty`/`qty_step`): es lógica con aritmética y conviene tenerla medida, no mirada. Dependencia nueva ⇒ ADR previo (R28).
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
| V6 · WhatsApp con detalle y total, orden en DB | test del armado del mensaje (importes = los de la DB) + navegador | automatizado + navegador |
| V7 · el total lo calcula el servidor | ya cubierto por `test_order_service.py`; **no puede volverse rojo** | automatizado |
| V8 · panel operable en 375px | navegador, viewport de iPhone SE | navegador |
| V9 · los tests siguen verdes tras la migración | el comando de §1 | automatizado |
| V11 · una foto subida no conserva metadatos | `test_image_file` + `test_upload_service` leen **los bytes del archivo guardado** | automatizado |
| V12 · lo que devuelve el modelo no entra crudo | `test_ai_service`: un borrador con `tags`, `precio` y `sql` sale con las siete claves de siempre | automatizado |
| V13 · las visitas no identifican a nadie | `test_metrics_service` compara las **columnas de la tabla** contra la lista esperada | automatizado |
| V15 · dos visitas simultáneas no le dan 500 a nadie | `test_metrics_service` fuerza el choque contra el índice único | automatizado |
| V16 · la foto limpia es la original menos sus metadatos, byte a byte | `test_image_file`: golden de bytes, no ausencia de strings | automatizado |
| V14 · el techo de gasto de la IA sobrevive a un reinicio | `test_ai_service`: una **instancia nueva** del servicio (= otro worker) sigue topada. Visto rojo contra el código viejo | automatizado |

## 5 · Cobertura mínima para dar algo por `done`

1. Servicio nuevo o tocado del back ⇒ su test, verde.
2. Los 151 existentes, verdes (V9). Un test que había pasado y ahora no, bloquea.
3. `npm run lint` y `npm run build`, limpios (V1).
4. Si se tocó algo visible ⇒ revisado en navegador, en celular y en escritorio, y dicho en el handback.
5. Si el cambio toca precios, mínimos o totales ⇒ el rojo se vio primero (R29).
