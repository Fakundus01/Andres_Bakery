# changelog.md · Andres Bakery

Semver `MAJOR.MINOR.PATCH` (R13). No se borra nada: lo viejo queda.

---

## [0.3.0] · 2026-10-16 · T2 estetica pixel pastel + 4 temas, y la cartilla de Andrea

**Agregado — el motor de temas (F15, ADR-005).** `theme/tokens.css` con las 4 paletas estacionales en nombres **semanticos** (`--color-acento`, nunca `--rosa-300`), `ThemeProvider` que escribe `data-theme` en `<html>` y lo persiste en `localStorage` con try/catch (en ventana privada el tema igual funciona, solo no sobrevive la recarga), `useTheme` y un `ThemeSwitcher` de 4 botones en el header. Default **primavera**. Tailwind 4 lee los tokens desde `@theme`, asi que `bg-superficie` y `text-tinta` son utilidades de Tailwind de verdad y cambiar `data-theme` repinta todo sin recargar.

**Agregado — la estetica (F14, ADR-003).** Cero assets: el pixel sale de CSS propio. Recuadros con borde de 4px **sin esquinas** (los cuatro `box-shadow` planos, el truco clasico de UI de 8 bits), sombras duras sin blur, botones que se hunden al apretarlos, fondo de papel cuadriculado con `repeating-linear-gradient`, y tipografia **Pixelify Sans** solo en titulos y precios — el cuerpo va en **Nunito** porque una pixel font en parrafos largos es ilegible en celular.

**Las fotos de comida quedan limpias.** El pixel va en el marco, no en el producto: destruir una foto de una torta no ayuda a venderla. El hero dejo de ser una imagen al 45% bajo un velo oscuro y paso a ser una **caja de dialogo**: foto entera arriba, panel solido abajo.

**Agregado — la cartilla de Andrea (F24).** Ruta `/historia` y link "Andrea" en el menu. Ficha tipo hoja de personaje: foto enmarcada, nombre, oficio, zona y como se le encarga. **No se invento ninguna biografia.** La historia sale de `/api/site/about`, que ella ya edita desde Panel → Contenido. Si ese texto esta vacio aparece un recuadro punteado que dice exactamente que falta y quien lo completa, y **se borra solo** cuando ella escribe. Hoy se ve el texto generico que siembra `BootstrapService`, que no es de ella: **F24 sigue bloqueada por su texto y su foto**.

**Cambiado — un pase mecanico sobre los 25 archivos** del front: 333 reemplazos que sacaron radios, blur y sombras blandas, y mapearon la paleta vieja (`stone-950`, `orange-500`, `emerald-50`…) a los tokens. Control final con grep: **cero** restos de la paleta anterior.

**Dos bugs mios en ese pase, encontrados y corregidos:** el `` final de la regex no matchea despues de `]`, asi que sobrevivieron todos los `rounded-[32px]`; y la normalizacion de espacios aplasto la indentacion dentro de template literals en dos archivos, que se reescribieron a mano.

**Desviacion declarada de `design.md` §B2:** la variante **oscura** de cada estacion no se hizo. El pedido era pastel, el pastel es claro, y ocho paletas duplican el trabajo de contraste sin que nadie lo haya pedido. `prefers-color-scheme` hoy no se consulta: el default es primavera siempre.

**Medido** — 19 tests del back OK, eslint + tsc limpios, build verde: **296 KB JS** y **27 KB CSS**, que bajo de 41 porque los tokens borraron utilidades repetidas. Verificado en navegador: home, tienda, `/historia` y el panel admin renderizando, cambio de estacion repintando todo, y el tema sobreviviendo a la recarga.

---

## [0.2.0] · 2026-10-16 · T0 higiene + T1 partir `App.tsx`

**Borrado** — `front/Andres_Bakery/api/` entera: 13 `.js` y un `README.txt`, 316 lineas sin una sola referencia desde `src/`. Verificado antes de borrar, no asumido. La idea que proponia ese README (traer ingredientes y fotos de Spoonacular/Edamam/TheMealDB/Unsplash) quedo anotada en `features.md` §C para no perderla.

**Sacado** — `stripe==8.7.0` de `requirements.txt`: ningun `.py` del back lo importa, los pagos van por `urllib` directo a Mercado Pago.

**Cambiado** — `backend/.env.example` deja de llevar el mail real de Andrea y la password `admin123` como defaults, y documenta `WHATSAPP_PHONE` y `PAYMENTS_ENABLED` (ADR-002). El mail real **ya quedo en el historial de git**: esto frena la hemorragia, no la borra.

**Agregado** — `backend/.env` local (gitignored) con un `JWT_SECRET_KEY` de verdad, y `front/Andres_Bakery/.env.example` trackeado.

**Destrackeado** — `front/Andres_Bakery/.env` estaba versionado contra lo que declara el propio `.gitignore`. El archivo sigue en disco.

**Partido (T1)** — `App.tsx` paso de **1604 lineas a 17**. Refactor mecanico, sin cambio de comportamiento:

- `App.tsx` solo providers + router · `layout/` AppShell, SiteHeader, SiteFooter
- `pages/` Home, Shop, Checkout, Orders, Login, Register · `pages/admin/` AdminPage + 5 pestañas
- `components/` HeroCarousel, ProductCard, CartDrawer, SupportChat · `components/ui/` los 11 helpers de presentacion con barrel
- `lib/` constants.ts, format.ts, ui-types.ts

Archivo mas grande ahora: `AdminPage.tsx` con **233 lineas**. R05 cumplida.

**Desviaciones del arbol de `design.md` §B1**, chicas y a la vista: se sumaron `lib/constants.ts` y `lib/ui-types.ts` (los datos y tipos compartidos necesitaban casa propia), `components/ui/index.ts` como barrel, y `admin/RecipesTab.tsx`, que nace ya marcada para jubilarse en T3 por ADR-001.

**Un cambio que NO es mecanico**, y por eso se declara: el primer slide del hero decia `"Edici?n especial"` — un caracter roto que se veia en pantalla. Quedo `"Edición especial"`.

**Medido** — 19 tests del back OK, eslint + tsc limpios, build verde (292 KB JS · 41 KB CSS, contra 291 · 41 antes: mismo bundle). **La app se corrio de verdad**: back en `:5000` sirviendo la DB real, front en `:5174`, home y tienda renderizando y el carrito abriendo. Unico error de consola: `favicon.ico` 404, preexistente.

**Sin tocar** — el back, salvo `requirements.txt` y `.env.example`. Y el cambio del widget de soporte de `right-6` a `left-6` que estaba sin commitear: se preservo tal cual en `components/SupportChat.tsx`.

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
