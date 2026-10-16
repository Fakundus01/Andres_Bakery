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
