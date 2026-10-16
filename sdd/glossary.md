# glossary.md · Andres Bakery

**Versión:** 0.1.0 · **Última actualización:** 2026-10-16

Vocabulario del dominio. Existe porque la clienta no es técnica y porque varios términos llegaron por dictado de voz y se aclararon acá.

| Término | Qué significa en este proyecto |
|---|---|
| **Producto** | La entidad vendible. Desde ADR-001 incluye lo que antes era "receta": ingredientes, descripción, etiquetas y precio. |
| **Receta** | Antes era una entidad del modelo (`Recipe`). **Se jubila como tabla** por ADR-001: cuando Andrea dice "cargar mis recetas" se refiere a cargar **productos**. Lo que sí sobrevive es el contenido — los ingredientes (relacionales) y los pasos (`Product.steps`) se publican en la ficha del producto. |
| **Unidad** (`unit_label`) | De qué se habla cuando se dice "1": una unidad, una docena, una porción, un kilo. Lo escribe ella. |
| **Mínimo** (`min_qty`) | La cantidad más chica que se puede pedir. Ej.: brownies por 6. |
| **Paso** (`qty_step`) | De cuánto en cuánto se puede pedir. Ej.: `min_qty=6`, `qty_step=6` ⇒ 6, 12, 18. |
| **Variante** | Un tamaño de algo que se vende entero: "torta 8 porciones", "torta 12 porciones". Tiene su propio precio. |
| **Etiqueta** (`Tag`) | Un atributo visible y filtrable que ella crea: "sin TACC", "vegano", "sin lactosa". Es **su declaración**, el software no la certifica. |
| **sin TACC** | Sin Trigo, Avena, Cebada ni Centeno: cómo se rotula apto para celíacos en Argentina. Es **una etiqueta más**, no un campo propio (confirmado el 2026-10-16; había llegado por dictado como "sin tag"). |
| **Andrea** | La repostera, dueña del negocio y única usuaria del panel. La "cartilla de presentación" de la landing es la suya. |
| **Zona de entrega** | El área donde ella entrega, con un costo fijo (`DELIVERY_FEE`). Hoy "Villa Maipú" y $2500 por default. |
| **Retiro** | El cliente lo busca por el domicilio de ella (`PICKUP_ADDRESS`). No paga envío. |
| **Canal** (`channel`) | Por dónde entró el pedido: `whatsapp` (v1) o `mercado_pago` (apagado). |
| **PedidosYa** | Plataforma de delivery. Acá es **solo un link de salida**: no se integra (ADR-008). |
| **Soporte guiado** | El widget de chat del front. Es un árbol de respuestas fijas que termina en un mail; **no** es IA. |
| **Tema** | Una de las 4 paletas estacionales. Se elige en el header y se guarda en el navegador. |
| **Token (de diseño)** | Una variable CSS con nombre semántico (`--color-acento`). No confundir con el **token de sesión** (el JWT). |
| **Stardew Valley** | El videojuego cuya estética pixel pastel se toma como referencia. Su arte **no se usa**: el look se hace con CSS propio (ADR-003). |
