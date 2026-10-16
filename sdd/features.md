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
| F14 | Tokens de diseño + estética pixel pastel | Planned | T2 | F13 |
| F15 | 4 temas estacionales con selector persistido | Planned | T2 | F14 |
| F16 | `Product` absorbe la receta (modelo nuevo) | Planned | T3 | ADR-010 (migraciones) |
| F17 | Precio por unidad: `unit_label`, `min_qty`, `qty_step` | Planned | T3 | F16 |
| F18 | Selector de cantidad con total en vivo ("5 brownies = $X") | Planned | T6 | F17 |
| F19 | Variantes de tamaño para lo que se vende entero | Planned | T3 | F16 |
| F20 | Ingredientes relacionales visibles en la carta | Planned | T4+T6 | F16, revive F12 |
| F21 | Etiquetas que crea ella (sin TACC, vegano…) + filtro | Planned | T3+T6 | F16 |
| F22 | Retiro / envío por producto + zona y costo de una sola fuente | Planned | T9 | F16 |
| F23 | Pedido por WhatsApp (`wa.me` con mensaje armado por el back) | Planned | T7 | F16 |
| F24 | Cartilla de Andrea: historia, foto, cómo llegó a ser repostera | **Specified** | T8 | su texto y su foto |
| F25 | Ficha de producto con descripción larga, ingredientes y etiquetas | Planned | T6 | F20, F21 |
| F26 | Link de salida a PedidosYa | **Deferred** | T7 | todavía no tiene tienda; la quiere a futuro (ADR-008) |
| F27 | Higiene: borrar `front/api/*.js`, sacar `stripe`, crear `.env` | **Complete** | T0 | — |
| F28 | Receta paso a paso publicada en la ficha (`Product.steps`) | Planned | T3+T6 | F16 (ADR-001 enmendada) |

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

- **F24** · ✅ el nombre es **Andrea** y la cartilla es suya. ❌ **falta su historia escrita y una foto** → `material-cliente/`.
- **F21** · ✅ confirmada **"sin TACC"** como etiqueta. El resto de su lista real sigue sin estar, pero el diseño es genérico (ADR-006) y no depende de eso para construirse.
- **F28** · ✅ confirmado: publica ingredientes **y** pasos.
- **F26** · ✅ resuelto: todavía no tiene tienda en PedidosYa ⇒ diferida.
- **F22** · ❌ falta la zona de entrega y el costo reales, y si cambian por producto.
- **F23** · ❌ falta el número de WhatsApp. No bloquea construir (sale de `WHATSAPP_PHONE`), sí bloquea probarlo de verdad.
- Retención y borrado de datos personales (`security.md` N2): ❌ sin definir.
