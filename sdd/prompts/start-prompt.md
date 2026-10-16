# start-prompt.md · Andres Bakery

## 1 · Prompt de arranque sintética (la que pide R15)

Reconstruye el contexto como si el proyecto hubiera nacido con SDD. Es la que se pega al abrir una sesión nueva en un agente que no conoce el proyecto.

```
Proyecto: Andres Bakery — carta web de una repostera de Villa Maipú (General
San Martín, Buenos Aires) que hoy vende solo por mensajes privados. El objetivo
es que el precio se autoatienda y que ella mantenga la carta sola.

Equipo: yo solo (Facundo, desarrollador) + Andrea, la repostera, que no es
técnica y es la única usuaria del panel. Branches: dev → main.

Stack (ya decidido, ADR-009, no se discute): Flask 3 + SQLAlchemy + JWT +
SQLite en el back; React 19 + TypeScript + Vite + Tailwind 4 en el front.
El back está separado en capas: routes/ delgadas → services/ con la lógica →
models.py. Respetá ese patrón.

IA en el producto: no.
Modo: ESTRICTO · FULL · WEB. Reglas apagadas: ninguna.
Nivel: PRO.

El SDD está en sdd/. Leé sdd/SDD-COMPACT.md y sdd/custom.md al arrancar.
Para planear: sdd/spec.md + sdd/features.md + sdd/status.md.
Para implementar: sdd/design.md + sdd/contracts.md + sdd/testing.md.
Las decisiones ya tomadas están en sdd/decisions.md (ADR-001 a ADR-010): no
las re-discutas, y si encontrás que una está mal, frená con un bloque DRIFT
(R25) en vez de arreglarla en silencio.

Cosas del proyecto que no se deducen leyendo el código:
- App.tsx tiene 1604 líneas y R05 (FIJA) manda ≤300. Partirlo es prerrequisito
  de cualquier trabajo de front (ADR-004).
- El back usa unittest, NO pytest, y el venv no tiene pytest. Se corre desde la
  raíz del repo porque los imports son backend.*
- El esquema nace de db.create_all(), que no hace ALTER TABLE. Agregar una
  columna no se aplica sobre instance/bakery.db (ADR-010).
- Product.ingredients (m2m con Ingredient) y todo el CRUD de /api/ingredients
  existen y nadie los usa. ADR-001 los pone a trabajar.
- El checkout solo tiene camino Mercado Pago y sin credenciales tira
  ConfigurationError. Por eso v1 pide por WhatsApp (ADR-002).
- front/Andres_Bakery/api/*.js es código muerto: nada en src/ lo referencia.

Trabajá por ciclos y cerrá cada uno con HANDBACK (R30).
```

## 2 · Cómo se hizo este `sdd/` (trazabilidad)

| Paso | Qué se hizo | Cuándo |
|---|---|---|
| 1 | Análisis del repo: estructura, 15 commits de git log, convenciones del back y del front | 2026-10-16 |
| 2 | Checks reales corridos, no asumidos: 19 tests OK, lint limpio, build verde | 2026-10-16 |
| 3 | Cuestionario socrático (R04): 4 decisiones de raíz contestadas por el humano | 2026-10-16 |
| 4 | Investigación de PedidosYa en la web antes de prometer nada (ADR-008) | 2026-10-16 |
| 5 | Generación de este `sdd/` reflejando **lo que existe**, no lo deseable | 2026-10-16 |
| 6 | Presentación al humano y espera del OK (R08/R15) | 2026-10-16 |

**Lo que NO se hizo:** tocar código de la aplicación. R15 lo prohíbe hasta el OK.

## 3 · Preguntas abiertas (R04: no se adivinan)

### Contestadas el 2026-10-16

Los dos primeros eran términos deformados por el dictado de voz; se citaron y se preguntaron, no se adivinaron:

1. ~~"sin tag, con tag"~~ → **"sin TACC"**, y es **una etiqueta más** del sistema, no un campo propio (ADR-006).
2. ~~"ese pedido de tener reset"~~ → **"recetas"**.
3. La clienta es **Andrea**; la cartilla de presentación de la landing es la suya.
4. **PedidosYa:** todavía no tiene tienda, la quiere a futuro ⇒ F26 diferida.
5. **Ingredientes o pasos:** **ambas**. `Product` se queda con los dos (ADR-001 enmendada, F28).

### Abiertas

6. **La historia escrita de Andrea y una foto** → bloquean F24. Van a `material-cliente/`.
7. **El número de WhatsApp** → sale de `WHATSAPP_PHONE`, así que no bloquea construir T7, sí probarlo de verdad.
8. **Zona de entrega y costo reales**, y si cambian por producto → F22.
9. **El resto de las etiquetas que usa Andrea** → no bloquea: ADR-006 las hace genéricas y las crea ella.
10. **Retención y borrado de datos personales** (`security.md` N2, Ley 25.326).
