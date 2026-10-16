# features.md · Andres Bakery

**Versión:** 0.1.0 · **Última actualización:** 2026-10-16

Estados (§5 del master): Specified 20% → Planned 40% → Tasked 60% → In Progress 80% → Complete 100%.

## A · Lo que ya existe y funciona (heredado, sin SDD)

| ID | Feature | Estado | Nota |
|---|---|---|---|
| F01 | Registro e ingreso con JWT | Complete | `AuthContext` + `/api/auth/*`. Token en `localStorage` (ver `security.md` N1) |
| F02 | Carta pública de productos | Complete | `ShopPage`, precio plano sin unidades ni cantidad |
| F03 | Carrito | Complete | `CartContext` + `CartDrawer` |
| F04 | Alta de orden con datos de entrega | Complete | el total lo calcula el servidor |
| F05 | Mis pedidos | Complete | `OrdersPage` |
| F06 | Panel de admin | Complete | 5 pestañas: resumen, productos, recetas, pedidos, historia |
| F07 | Checkout Mercado Pago | **Blocked** | implementado y testeado con fake; sin credenciales no corre (ADR-002) |
| F08 | Contacto por mail | Complete | `/api/contact`, usado por el "Soporte guiado" |
| F09 | Texto "sobre mí" editable | Complete | `/api/site/about`, pestaña "historia" del panel |
| F10 | Carrusel del hero | Complete | con slides de fallback en el código |
| F11 | CRUD de recetas | Complete | **se jubila** por ADR-001 |
| F12 | CRUD de ingredientes | **Orphan** | el back lo expone entero, el front no lo usa. Lo revive ADR-001 |

## B · Lo que pidió el humano el 2026-10-16

| ID | Feature | Estado | Tarea | Depende de |
|---|---|---|---|---|
| F13 | Partir `App.tsx` en módulos ≤300 líneas | **Complete** | T1 | — (R05, FIJA) |
| F14 | Tokens de diseño + estética pixel pastel | **Complete** | T2 | F13 |
| F15 | 4 temas estacionales con selector persistido | **Complete** | T2 | F14 |
| F16 | `Product` absorbe la receta (modelo nuevo) | Planned | T3 | ADR-010 (migraciones) |
| F17 | Precio por unidad: `unit_label`, `min_qty`, `qty_step` | Planned | T3 | F16 |
| F18 | Selector de cantidad con total en vivo ("5 brownies = $X") | Planned | T6 | F17 |
| F19 | Variantes de tamaño para lo que se vende entero | Planned | T3 | F16 |
| F20 | Ingredientes relacionales visibles en la carta | Planned | T4+T6 | F16, revive F12 |
| F21 | Etiquetas que crea ella (sin TACC, vegano…) + filtro | Planned | T3+T6 | F16 |
| F22 | Retiro / envío por producto + zona y costo de una sola fuente | Planned | T9 | F16 |
| F23 | Pedido por WhatsApp (`wa.me` con mensaje armado por el back) | Planned | T7 | F16 |
| F24 | Cartilla de Andrea: historia, foto, cómo llegó a ser repostera | **In Progress** | T8 | la página existe en `/historia`; falta **su texto y su foto** |
| F25 | Ficha de producto con descripción larga, ingredientes y etiquetas | Planned | T6 | F20, F21 |
| F26 | Link de salida a PedidosYa | **Deferred** | T7 | todavía no tiene tienda; la quiere a futuro (ADR-008) |
| F27 | Higiene: borrar `front/api/*.js`, sacar `stripe`, crear `.env` | **Complete** | T0 | — |
| F28 | Receta paso a paso publicada en la ficha (`Product.steps`) | Planned | T3+T6 | F16 (ADR-001 enmendada) |

## B2 · Pedido del humano el 2026-10-16 (segunda tanda, por dictado)

Todavía **sin tarea asignada**: entran al backlog, no al código, hasta decidir el orden y las preguntas abiertas (R04/R08).

| ID | Feature | Estado | Depende de |
|---|---|---|---|
| F29 | Navegación: menos ítems arriba **o** drawer lateral, elegible | Specified | F30 si se hace configurable |
| F30 | Pantalla de **Configuración**: tema, tipografía, tamaño de letra, posición del nav | Specified | F14-F15 (ya hechas) |
| F31 | **Tres roles explícitos**: invitado (sin login), cliente (con login), admin (Andrea) | Specified | define qué ve y qué puede cada uno |
| F32 | Catálogo con pestaña/vista propia de cliente, separada de la mirada de admin | Specified | F31 |
| F33 | Tarjetas de la carta que **se dan vuelta**: frente foto + precio, dorso descripción e ingredientes | Specified | F20, F25 |
| F34 | Carrito con **vista propia** (`/carrito`), no solo el panel lateral | Specified | — |
| F35 | Rehacer el "Soporte guiado": hoy tapa la pantalla, los botones se mueven solos y no es un chat | Specified | — |
| F36 | Contacto por **WhatsApp** desde soporte, para quien no quiere comprar online | Specified | F23, `WHATSAPP_PHONE` |
| F37 | **Placeholder de PedidosYa**: dónde encontrarla, aunque todavía no tenga tienda | Specified | ADR-008 |
| F38 | **Responsive** revisado de punta a punta | Specified | se verifica por vista, no "en general" |
| F39 | Login/Register **a la derecha del todo**, con icono y lugar fijo | Specified | F29 |
| F40 | Más vistas propias en vez de todo en una: carrito, ficha de producto, configuración | Specified | F32, F34 |
| F41 | **Deploy**: el front a Vercel | Specified | necesita ADR: el back Flask+SQLite **no vive en Vercel** |

**Lo que se midió del soporte actual (F35), no opinión:** ocupa el alto completo del viewport y tapa el header; la fila de respuestas rápidas está debajo del historial, así que **cada mensaje la empuja y terminás tocando otro botón** (pasó en la prueba: clic en "Medios de pago", respondió "Pedidos personalizados"); hay dos barras de scroll anidadas; y es un FAQ de 3 botones más un formulario de contacto disfrazado de conversación.

## C · Fuera de v1 (y por qué)

| Feature | Por qué no |
|---|---|
| Traer pedidos de PedidosYa al panel | sin API pública autogestionada (ADR-008) |
| WhatsApp Business API oficial | costo + verificación de negocio (`costs.md`) |
| Subida de fotos desde el panel | hoy es `image_url`; habilitar subida activa N5 de seguridad |
| Cupones y descuentos | nadie lo pidió |
| Reseñas de clientes | nadie lo pidió, y trae moderación |
| Notificaciones push | la conversación ya está en WhatsApp |
| Traer ingredientes y fotos de APIs externas (Spoonacular, Edamam, TheMealDB, Unsplash) | era una propuesta escrita en `front/api/README.txt`, borrado en T0. Andrea carga su propia carta y una foto de stock no vende **su** producto. Queda anotado acá para no perder la idea |

## D · Lo que todavía no puedo especificar

Bloqueado por datos que no invento (R04). Actualizado el 2026-10-16 con las respuestas del humano:

- **F24** · ✅ la página existe (`/historia`), con ficha, zona y CTA a la carta. ❌ **falta su historia escrita y una foto** → `material-cliente/`. Hoy el sitio muestra el texto genérico que sembró `BootstrapService` ("Somos un emprendimiento familiar…"), **que no es de ella**: cuando lo reemplace desde Panel → Contenido, la página se completa sola. Si lo borra, aparece un recuadro punteado que dice qué falta.
- **F21** · ✅ confirmada **"sin TACC"** como etiqueta. El resto de su lista real sigue sin estar, pero el diseño es genérico (ADR-006) y no depende de eso para construirse.
- **F28** · ✅ confirmado: publica ingredientes **y** pasos.
- **F26** · ✅ resuelto: todavía no tiene tienda en PedidosYa ⇒ diferida.
- **F22** · ❌ falta la zona de entrega y el costo reales, y si cambian por producto.
- **F23** · ❌ falta el número de WhatsApp. No bloquea construir (sale de `WHATSAPP_PHONE`), sí bloquea probarlo de verdad.
- Retención y borrado de datos personales (`security.md` N2): ❌ sin definir.
