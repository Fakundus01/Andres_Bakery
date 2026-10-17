# testing.md · Andres Bakery

**Versión:** 0.1.0 · **Última actualización:** 2026-10-16

## 1 · Cómo se corre (comandos reales, verificados el 2026-10-16)

Los mismos que `harness.config.json`. **Siempre desde la raíz del repo**: los imports del back son `backend.*`.

```bash
# Back: 70 tests, unittest (NO pytest: el venv no lo tiene)
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q

# Front: eslint + tsc (los dos proyectos de TS)
cd front/Andres_Bakery && npm run lint

# Front: build de producción
cd front/Andres_Bakery && npm run build
```

Estado medido el 2026-10-16 tras T3: **70 tests OK**, lint limpio, build en verde (326,85 KB de JS, 29,22 KB de CSS).

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
| `support.py` | `BackendServiceTestCase`: app + DB temporal por test en `backend/tests/.tmp/` |

**Convención a respetar:** cada test crea su propia DB SQLite con nombre `uuid4()` y la borra al terminar. Los servicios externos se inyectan como fake (ver `FakeMercadoPagoClient`), nunca se llama a la API real.

**Lo que NO cubren los tests y se verificó en el navegador (T3):** el salto de cantidades en la ficha (6 → 12 con un clic), el carrito leyendo el envío del back, el checkout con los pagos apagados hasta el pedido #4, y 390px sin desbordes en cinco rutas.

**Las migraciones también se prueban**: `0002` se corrió sobre una **copia** de la base real antes que sobre la real, en los dos sentidos (`upgrade` y `downgrade`) y desde una base vacía. Una migración que nunca se ejecutó no está probada.

**Hueco grande:** **cero tests de front**. No hay runner instalado.

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

## 5 · Cobertura mínima para dar algo por `done`

1. Servicio nuevo o tocado del back ⇒ su test, verde.
2. Los 70 existentes, verdes (V9). Un test que había pasado y ahora no, bloquea.
3. `npm run lint` y `npm run build`, limpios (V1).
4. Si se tocó algo visible ⇒ revisado en navegador, en celular y en escritorio, y dicho en el handback.
5. Si el cambio toca precios, mínimos o totales ⇒ el rojo se vio primero (R29).
