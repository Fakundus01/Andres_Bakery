# T6-F20b · La unicidad del ingrediente vive en el back

**Feature:** F20 (lo que falta para cerrarla de verdad) · **Rama:** `dev` · **Tier (R12):** MEDIO
**Depende de:** `T6-F20-ingredientes` (hecho) · **Superficie (R27):** N1, panel admin
**Nace de:** la revisión de `T6-F20` — un hallazgo del security-reviewer y uno que salió probando el arreglo en el navegador.

## Por qué, con el caso medido

El panel compara nombres **normalizados** (sin acentos, sin mayúsculas); el back los compara
**exactos** (`Ingredient.query.filter_by(name=name)`). Mientras el front vea la lista completa, el
duplicado no entra. En cuanto la lista local está vieja, entra:

```
panel cargado con [Azúcar, Nuez pecan, Test]
        ↓  alguien crea "Coco rallado" en otra pestaña (o desde la API)
Andrea escribe "coco rallado" y aprieta Enter
        ↓  el front no lo ve en su lista → POST
        ↓  el back compara exacto: "coco rallado" ≠ "Coco rallado" → 201
lista final: [Azúcar, Coco rallado, Nuez pecan, Test, coco rallado]
```

Reproducido en el navegador el 2026-10-18, no deducido. **El front solo puede evitar los duplicados
que ve.** La unicidad tiene que estar donde está la restricción.

Y en el mismo módulo, del security-reviewer: `create` y `update` **no limitan el largo de nada**.
SQLite no hace cumplir el `String(120)` del modelo, así que entraron **4.000.000 de caracteres** en
`Ingredient.name` y el `GET /api/ingredients` —que es **público**— los devolvió con
`Content-Length: 4000033`. Necesita credencial de admin.

> **Corregido el 2026-10-19:** esta tarjeta decía «el costo lo pagan los anónimos: cada visitante se
> descarga esos MB». No era cierto y no estaba verificado — la única pantalla que llama a
> `GET /api/ingredients` es el panel. Es la misma clase de bug que parió `saneado.py` en T7, en un módulo
al que ese arreglo nunca llegó.

## Zona de archivos

```
backend/services/ingredient_service.py        (unicidad normalizada + saneado)
backend/tests/test_ingredient_service.py      (NUEVO: este servicio nunca tuvo tests)
front/Andres_Bakery/src/lib/ingredientes.ts   (si el criterio de normalización se comparte)
```

## Criterios de aceptación

| # | Criterio | Lo demuestra |
|---|---|---|
| D1 | `POST` de "coco rallado" con "Coco rallado" ya en la base **no crea una fila nueva**: devuelve la existente | `test_ingredient_service.py` |
| D2 | Lo mismo con acentos: "azucar" contra "Azúcar" | idem |
| D3 | La ñ **no** se conflactúa: "Piña" y "Pina" son dos ingredientes | idem |
| D4 | `name` de más de 120 caracteres ⇒ 400 explicado, no una fila de 4 MB | idem |
| D5 | `unit` de más de 40 ⇒ 400; `name`/`unit` que no son texto ⇒ **400, no 500 con HTML** | idem |
| D6 | El `PUT` tiene los mismos topes que el `POST` | idem |
| D7 | El caso del navegador de arriba, repetido a mano, ya no duplica | navegador |

## Decisión pendiente para el humano

**¿Qué devuelve el `POST` cuando el ingrediente ya existe normalizado?** Dos caminos:

- **(a) 200 con la fila existente** ("conseguir o crear"). El panel lo marca y listo; nadie ve un
  error por algo que no es un error. Cambia el contrato: hoy devuelve 201.
- **(b) 400 nombrando el que ya está** ("ya existe como «Azúcar»"). Más explícito, pero obliga al
  front a manejar el caso igual que hoy.

Recomiendo **(a)**: desde el panel, "agregar un ingrediente que ya existe" es exactamente la misma
intención que "marcarlo", y hacerle leer un error a Andrea por eso es ruido.

## Verificación (R30)

```
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q   # base: 213 OK
npm --prefix front/Andres_Bakery run test                                        # base: 88 OK
```

Rojo medido (R29): D1 y D4 contra el código de hoy. D4 tiene que mostrar la fila gigante entrando,
no un error de import.
