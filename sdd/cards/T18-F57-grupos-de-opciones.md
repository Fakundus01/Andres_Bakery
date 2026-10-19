# T18-F57 · Los grupos de opciones y sus sabores

**Feature:** F57 · **Rama:** `dev` · **Tier (R12):** MEDIO · **ADR:** 031
**Depende de:** nada · **Va antes de** `T18-F58`
**Superficie (R27):** N1 (panel admin). No toca plata ni archivos.

## Por qué

La chef define **qué se puede elegir**; el cliente elige de eso. Esta tarjeta construye la mitad de
ella: los grupos ("Relleno", "Cobertura") con su lista de sabores, y a qué productos aplican.

Es la misma forma que ya tienen las etiquetas y los ingredientes —globales, reusables, enganchadas
por producto— y a propósito: el panel ya sabe hacer esto y Andrea ya sabe usarlo.

## El modelo

```
OptionGroup        name("Relleno") · sort_order · required(bool)
  └─ 1..n ─▶ Option    name("Dulce de leche") · sort_order
Product ──m2m──▶ OptionGroup      (qué grupos aplican a esta torta)
```

`required` es lo que decide si la torta se puede pedir sin elegir ese grupo. Una torta sin relleno
elegido no es un pedido que ella pueda cumplir.

## Zona de archivos

```
backend/models.py                             (+ OptionGroup, Option, product_option_groups)
backend/migrations/versions/0005_opciones_de_producto.py   (nuevo)
backend/services/option_service.py            (nuevo)
backend/routes/options.py                     (nuevo)
backend/services/serializers.py               (el producto expone sus grupos)
backend/services/product_service.py           (+ option_group_ids en _apply_relations)
backend/tests/test_option_service.py          (nuevo)
front/.../lib/types.ts · lib/api.ts
front/.../pages/admin/OpcionesTab.tsx         (nuevo)
front/.../pages/admin/AdminPage.tsx           (la pestaña nueva)
front/.../pages/admin/ProductsTab.tsx         (qué grupos usa este producto)
```

**Ojo con `0005`:** `T4-F19a` también declara una migración `0005`. La que entre segunda se renumera
a `0006`; el orden lo decide cuál se implemente primero (hoy: F19a).

## Decisiones ya tomadas (ADR-031)

- **Globales, no por producto.** "Relleno" se escribe una vez.
- **Unicidad del nombre como en los ingredientes:** normalizada, sin acentos ni mayúsculas,
  **conservando la ñ**, y decidida en el back (ADR-030). No se repite el error de F20.
- **Borrar un grupo que está en uso avisa en cuántos productos está**, igual que los ingredientes.

## Criterios de aceptación

| # | Criterio | Lo demuestra |
|---|---|---|
| E1 | Crear un grupo con sus opciones, reordenarlas, renombrarlas y borrarlas desde el panel | navegador |
| E2 | Asignar grupos a un producto y que persista (`GET /api/products/<id>` los devuelve) | navegador + red |
| E3 | Dos grupos con el mismo nombre normalizado ⇒ no se duplica (ADR-030) | `test_option_service.py` |
| E4 | Topes de largo con 400 explicado, igual que los ingredientes | idem |
| E5 | Todo el CRUD es admin-only: sin token 401, con token de usuario común 403 | idem |
| E6 | El `GET` público devuelve los grupos de un producto, sin datos de más | idem |
| E7 | Borrar un grupo no rompe los pedidos viejos (guardan nombres, no FK) | idem |
| E8 | Migración probada para arriba y para abajo sobre una copia de la base real | salida pegada |
| E9 | 375px y 390px sin desborde, con la pestaña nueva | navegador |

## Verificación (R30)

```
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
npm --prefix front/Andres_Bakery run test
npm --prefix front/Andres_Bakery run lint
npm --prefix front/Andres_Bakery run build
backend/.venv/Scripts/python.exe -m flask --app backend.app db upgrade
```

**Después de tocar el back, reiniciar el proceso antes de probar en el navegador** (`testing.md` §6).
