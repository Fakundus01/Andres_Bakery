# T18-F59 · La foto de referencia

**Feature:** F59 · **Rama:** `dev` · **Tier (R12):** MEDIO · **ADR:** 031
**Depende de:** `T18-F58`
**Superficie (R27):** **N5 cambia de nivel** — deja de ser "solo admin sube archivos" y pasa a
**escritura pública de archivos**. Es la superficie más grande abierta hasta ahora. Lleva
`security-reviewer` **y** `pentester` (R31), y `security.md` se reclasifica con fecha.

## Lo que ya está, y lo que falta

Lo que **no** hay que construir: el validador. `services/image_file.py` ya valida por contenido,
reescribe sin metadatos, y `GET /uploads/<nombre>` la sirve inerte con `Content-Type` fijo y
`nosniff` (ADR-018). El nombre lo elige el servidor, así que no hay `../` que escape.

Lo que falta es **el perímetro**, y son cuatro cosas. Sin las cuatro, esta tarjeta no sale:

1. **Ruta pública separada** (`POST /api/uploads/referencia`), no sacarle el `@admin_required` a la
   de ella. Dos rutas, dos políticas.
2. **Tope por IP**, reusando `rate_limit` (ADR-026/028).
3. **Tamaño menor que los 4 MB del panel**, y **cuota de disco total** ⇒ cierra **D18**.
4. **Barrido de huérfanas** ⇒ cierra **D17** para estas fotos.

## Por qué la huérfana es el problema, y no un detalle

El cliente sube la foto **antes** de que el pedido exista. Si abandona el carrito —que es lo más
común que pasa en una tienda— esa foto queda en disco para siempre, subida por un anónimo. Hoy
**D17** dice que nada se borra nunca y **D18** que no hay cuota: con subida de admin eso era deuda;
con subida pública es un agujero con nombre y apellido.

La foto se marca como *provisoria* al subirse y se vuelve *del pedido* cuando el pedido se crea. Lo
provisorio que pasó su ventana se borra.

## El control que importa (R27)

```
El pedido NO acepta cualquier URL de foto: tiene que ser una que emitimos nosotros.
Formato /uploads/<32 hex>.<jpg|png> Y el archivo existiendo en disco.
```

Sin eso, el renglón del pedido es un lugar donde meter un link a cualquier cosa, y el panel de
Andrea y el mensaje de WhatsApp lo muestran con su firma. Mismo agujero que ADR-020 cerró en la IA.

## Criterios de aceptación

| # | Criterio | Lo demuestra |
|---|---|---|
| H1 | Un anónimo sube una foto y la ve en su pedido | navegador sin sesión |
| H2 | Más de N subidas por IP ⇒ 429 con `Retry-After` | `test_rate_limit.py` |
| H3 | Pasada la cuota de disco ⇒ 507/400 explicado, y **no** se escribe | test |
| H4 | `reference_image` con una URL externa (`https://…`), con `../`, con un hex que no existe, o con otra extensión ⇒ 400 | `test_pedido_hostil.py` |
| H5 | Un polígloto / HEIC / WEBP / archivo cortado se rechaza igual que en el panel | `test_image_file.py` (ya existe) |
| H6 | Una foto provisoria que nunca llegó a un pedido **se borra** en el barrido | test |
| H7 | Una foto **ya usada** por un pedido **no** se borra nunca en el barrido | test |
| H8 | La ruta de admin sigue siendo admin-only y con sus 4 MB | test |

## Lo que esta tarjeta NO resuelve, y hay que decirlo antes del deploy

**El disco de Render free no persiste** (F41, `status.md` §5). Estas fotos se pierden en cada
reinicio, igual que las de ella. Antes del deploy hay que decidir dónde viven —Cloudflare R2 o
Supabase Storage, los dos free— o la foto de referencia es una promesa que el servidor no cumple.

## Verificación (R30)

Las cuatro del proyecto. **Reiniciar el back antes de probar en el navegador.**
Rojo medido (R29): H4 primero, con una URL externa aceptada contra el código de hoy.
