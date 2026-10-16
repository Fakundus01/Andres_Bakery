# changelog.md · Andres Bakery

Semver `MAJOR.MINOR.PATCH` (R13). No se borra nada: lo viejo queda.

---

## [0.1.0] · 2026-10-16 · SDD aplicado (brownfield, R15)

**Agregado** — carpeta `sdd/` completa sobre un repo que tenía 4 meses de código y ningún SDD:

- Núcleo del paquete copiado: `SDD-MASTER.md`, `SDD-COMPACT.md`, `GUIDE.md`, `custom.md`, `scenarios.md`, `teams.md`, `models.md`, `harness.md`, `orchestration.md`, `loops.md`.
- MDs del proyecto escritos desde el análisis del repo: `spec.md`, `design.md`, `diagram.md`, `contracts.md`, `features.md`, `testing.md`, `security.md`, `costs.md`, `decisions.md`, `status.md`, `glossary.md`, este changelog.
- `prompts/start-prompt.md` con la prompt de arranque sintética que exige R15.
- Espejos `AGENTS.md` y `CLAUDE.md` en la raíz (R22), `harness.config.json` con los comandos reales (R30), `.gitattributes` con `merge=union` para el changelog.
- `material-cliente/` con su estructura, vacía: ahí va lo que aporte la clienta, tal como llegue.

**Decidido** — ADR-001 a ADR-010 en `decisions.md`. Las cuatro que vinieron del cuestionario del humano: una sola entidad vendible, WhatsApp como canal principal, pixel solo con CSS, 4 temas estacionales.

**Enmendado el mismo día**, con las respuestas a las preguntas abiertas y antes de escribir código:

- **ADR-001 enmendada:** Andrea publica ingredientes **y** receta paso a paso ⇒ `Product` suma `steps`. `Recipe` igual se jubila como tabla. Nace F28 y el criterio V10; el supuesto S3 de `spec.md` quedó anulado.
- **ADR-006 confirmada:** "sin TACC" es una etiqueta más, no un campo propio. El término había llegado deformado por dictado de voz como "sin tag" y se verificó antes de modelarlo (R04).
- **ADR-008 precisada:** Andrea todavía no tiene tienda en PedidosYa ⇒ F26 pasa a **Deferred**.
- La clienta tiene nombre en los MD: **Andrea**. Falta su historia escrita y una foto (F24 sigue bloqueada por material, no por código).

**Aprobado por el humano el 2026-10-16** (R01/R08/R28): este `sdd/`, su commit, y **ADR-010 pasa de Propuesta a Vigente** — `Flask-Migrate` entra como dependencia en T3. B6 destrabado.

**Medido** — no deducido: 19 tests del back en verde, lint y build del front limpios.

**Sin tocar** — ni una línea de código de la aplicación. R15 lo prohíbe hasta el OK de este `sdd/`.

### Estado del repo al momento de aplicar el SDD

- 15 commits, el último `2914c1d "Codex 10.0"` del 2026-03-08. Siete meses de inactividad.
- Rama `dev`, adelantada respecto de `main`.
- Un cambio sin commitear en `App.tsx`: el widget de soporte pasó de `right-6` a `left-6`.
- `front/Andres_Bakery/src/App.tsx` con 1604 líneas, contra el máximo de 300 de R05.
