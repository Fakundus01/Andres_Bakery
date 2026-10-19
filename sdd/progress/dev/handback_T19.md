# HANDBACK · T19-F60 · El pop-up en todas las pestañas, y borrar pregunta

**Rama:** `dev` · **Versión:** 0.15.0 · **ADR:** 035 (nuevo) · **Fecha:** 2026-10-19
**Estado:** implementado, **cuatro comandos en verde**, **visto en el navegador** (1920px y 390px,
detalle en [`current.md`](current.md)), **revisado** por un reviewer independiente que re-ejecutó
([`review_T19.md`](review_T19.md): `CHANGES_REQUESTED`, 16 hallazgos) y **corregido**. Falta el OK
humano y el commit (R01).

> Este handback se escribió **antes** de la verificación en navegador y decía tres veces que no
> estaba hecha. El reviewer lo marcó como su único hallazgo ALTA —mandaba a repetir trabajo ya
> hecho— y tenía razón: queda corregido acá.

## Hecho

Lo que se pidió: *"si vamos a usar un pop-up en algún lugar, creo que tendríamos que hacer eso mismo
en otros lugares"*. ADR-034 había dejado el pop-up en una sola pestaña y lo había dicho; ahora son
todas.

| Pestaña | Antes | Ahora |
|---|---|---|
| La carta | pop-up (ADR-034) | igual, + pregunta antes de borrar |
| Etiquetas | formulario al costado, lista angosta | lista a todo el ancho con el uso de cada una, formulario en pop-up |
| Gustos | la tarjeta **era** el editor (renombrar en el lugar) | la tarjeta muestra; un pop-up por alta y otro por grupo |
| Tu perfil | tres paneles en una página larguísima | tres resúmenes, cada uno con su pop-up |
| Tu historia | textarea + preview al lado | preview en la página, texto en pop-up (con la preview adentro) |
| Pedidos | un `<select>` de estado | sin cambios: no hay formulario que abrir |

**Y lo que no estaba en ningún criterio:** en la carta y en las etiquetas, **borrar borraba de
una**. Sin preguntar, con el botón al lado del de editar, sin vuelta atrás. Los grupos y los
ingredientes sí preguntaban, cada uno con su texto a mano. Ahora hay un solo cartel
(`ConfirmarBorrado`) y un solo texto (`lib/borrados.ts`), y el cartel **también se usa en celular**:
la razón para no usar pop-up en celular es el teclado virtual, y acá no se escribe nada.

**Archivos nuevos (11)** y dos partidos por R05: `GrupoDeOpciones.tsx` (272 líneas) se fue a
`TarjetaDeGrupo` + `EditorDeGrupo`, y `PerfilTab.tsx` (259) a sus tres secciones.

## Tests · comando + salida literal @ `3859f33`

El rojo **se midió** (R29). La primera versión de `lib/borrados.ts` interpolaba el número sin
mirarlo, que es exactamente lo que ya estaba escrito a mano en los dos componentes:

```
> vitest run
     × nunca escribe «de los 1 productos» 13ms
     × concuerda el género: la etiqueta se borra «la», el grupo «lo» 6ms
     × con un solo producto habla en singular 3ms
     × sin productos no inventa un producto 2ms
     × un número que no debería llegar no se escribe igual 2ms
     × cuenta de a uno por producto 3ms
AssertionError: etiqueta con 1: expected 'Si lo borrás sale de los 1 productos …' not to match /l[oa]s 1 /
AssertionError: expected 'Si lo borrás sale de los 3 productos …' to contain 'la tienen'
AssertionError: expected 'Si lo borrás sale de los 0 productos …' not to contain 'productos que'
AssertionError: expected 'Si lo borrás sale de los -1 productos…' not to match /-1|NaN|1\.5/
AssertionError: expected 'Está en 0 productos' to be 'No lo usa ningún producto'
 Tests  6 failed | 170 passed (176)
```

En verde, los cuatro comandos de `harness.config.json`:

```
npm --prefix front/Andres_Bakery run test
 Test Files  16 passed (16)
      Tests  179 passed (179)

backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
Ran 343 tests in 88.247s
OK

npm --prefix front/Andres_Bakery run lint
> andres-bakery@0.0.0 lint
> npm run lint:eslint && npm run typecheck

> andres-bakery@0.0.0 lint:eslint
> eslint .

> andres-bakery@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json

npm --prefix front/Andres_Bakery run build
dist/assets/index-BGqUa8zx.css   36.15 kB │ gzip:   7.33 kB
dist/assets/index-BXgwu90u.js   420.71 kB │ gzip: 126.17 kB
✓ built in 2.97s
```

El back no cambió una línea de Python: 343 OK es el mismo número de antes, y corrió igual para que
el `done` no se apoye en una suposición (R16). Los 179 del front son los 176 de la primera vuelta
más **3 que pidió la revisión**: el grupo sin usos también tranquiliza sobre los pedidos viejos, la
coma del arrastre, y un conteo de `1e21` que salía en notación exponencial.

La salida de `lint` de arriba es **literal**. En la primera versión de este handback estaba resumida
a mano y el reviewer lo contó como hallazgo: R29 pide la salida, no un resumen de la salida.

**R05:** ningún archivo del proyecto pasa las 300 líneas (medido con `wc -l` sobre `backend/` sin
`.venv` y `front/.../src`).

## MDs

`decisions.md` (ADR-035), `changelog.md` (0.15.0), `status.md` (0.15.0, dos filas nuevas y §5
reordenada), `features.md` (B4 + F60), `testing.md` (la lección del texto con plural),
`cards/T19-F60-popups-en-todo-el-panel.md` (nueva).

## Git

**Sin commitear** (R01). Es el primer cambio después de `3859f33`.

## Costo

Una sola vuelta, un solo rol (leader-implementer, modelo alto). Sin subagentes: es una tanda de
pantalla, acotada a `front/.../pages/admin` y dos archivos de `lib`/`components`. **Falta el
reviewer independiente** (R30), y no lo puede hacer quien implementó.

## Lo que corrigió la revisión (R30)

El reviewer re-ejecutó los cuatro comandos y verificó **uno por uno** los números de este handback
—176/16 tests, los 10 nuevos, 343 del back, hashes y bytes del build, 11 archivos nuevos, las 272 y
259 líneas de los dos archivos partidos—: coincidieron. De los 16 hallazgos, **1 ALTA (de
documentación, la de arriba), 7 MEDIA y 8 BAJA**. Se corrigieron **los 7 MEDIA y 5 BAJA**:

| # | Hallazgo | Arreglo |
|---|---|---|
| 2 | Escape adentro del editor **cerraba el pop-up entero** en vez de cancelar el renombre | `stopPropagation()` en las dos ramas cuando hay algo que cancelar; el Escape "vacío" sigue cerrando |
| 3 | Se había perdido la **X de cancelar** el renombre, y el `onBlur` guardaba al cerrar: no había forma de abandonar un nombre tipeado | volvió la X, y **se quitó el `onBlur`**: el nombre se guarda con Enter o con el tilde, y el pop-up lo dice |
| 4 | El alta de grupo **se reabría con lo tipeado y cancelado** | el formulario se monta solo mientras el pop-up está abierto |
| 5 | `textoDeUso` decía "No **lo** usa ningún producto" **también para las etiquetas** | "No **está** en ningún producto", sin género, con su test |
| 6 | Si el guardado fallaba, **el pop-up se cerraba igual** y lo tipeado se perdía | `conAviso` devuelve si salió bien y el pop-up cierra solo entonces (producto y etiqueta) |
| 7 | **"Cerrar" no cancelaba** en perfil ni en historia: lo editado quedaba en el estado y el próximo guardado lo persistía | se guarda una copia al abrir y cerrar la devuelve; el botón dice **"Cerrar sin guardar"** |
| 8 | El comentario de `Modal.tsx` seguía diciendo "solo se usa en pantallas grandes", que ADR-035 invirtió | corregido, con la excepción del cartel de borrado dicha |
| 9 | Dos textos perdidos en la mudanza: *"Los pedidos viejos no cambian"* del grupo sin usos, y **la coma** de "que lo tienen, con todos sus sabores" | los dos volvieron, con un test cada uno |
| 10 | `autoFocus` muerto en el alta de grupo | borrado: el `<dialog>` ya enfoca lo primero al abrir |
| 11 y 12 | Un comentario que explicaba un mecanismo que no era el que protege, y otro que citaba un archivo borrado | reescritos |
| 13 | *"Las que ya tenés"* desapareció de la lista de etiquetas | vuelve en celular, donde la lista va abajo del formulario |
| 14 | La salida de `lint` de este handback no era literal | pegada literal |
| 15 | Un conteo mayor o igual a `1e21` salía como "1e+21" | `isSafeInteger` en vez de `isInteger`, con test |

**El 16 no se corrigió, y es una decisión:** la tarjeta del grupo perdió el checkbox de
"obligatorio" —ahora se tilda abriendo el pop-up—. El reviewer mismo dice que no es un bug, porque
ADR-035 decidió "la tarjeta muestra, el editor edita"; lo anotó porque es **la única acción del
panel que se volvió más cara** y no estaba dicha en ninguna parte. Queda dicha acá y en el ADR.

**Y 10 sospechas que verificó y estaban bien**, que es lo que le da peso al resto: `contarEtiquetas`
no puede contar doble, `enteroPositivo` aguanta `-1`, `NaN`, `1.5`, `Infinity`, `-0` y `"3"`, no hay
fuga de estado entre grupos, `onConfirmar` no corre con `aBorrar === null`, confirmar dos veces no
borra dos veces, ningún pop-up quedó sin título accesible, el Enter del cartel no borra, ningún id
de `<form>` duplicado, ningún import muerto, y el cartel entra a 390px.

## Riesgos, los dos que quedan

1. **El editor del grupo guarda cada cosa cuando la hacés**, no al cerrar: renombrar, marcar
   obligatorio y agregar un sabor son tres llamadas distintas al back. Por eso su pie dice "Listo" y
   no "Guardar cambios" — es honesto, pero es una tercera forma de guardar en el mismo panel.
   Unificarlo pide que el back acepte el grupo entero en un PUT (otra tarjeta).
2. **El perfil guarda entero.** Editar solo las redes y apretar "Guardar mi perfil" manda también la
   ficha y el CV. Siempre fue así; lo que cambia es que ahora se edita por partes, así que se dice
   en el pie de los tres pop-ups. Lo que **sí** cambió con la revisión: cerrar sin guardar ahora
   deshace lo editado, salvo una **foto ya subida** (el archivo queda en el servidor: deuda D17).

## Próximo paso propuesto

**El commit, con el OK del humano** (R01). Lo demás que pedía R30 está hecho: navegador, reviewer
independiente que re-ejecutó, y sus hallazgos corregidos con sus tests.

Lo que **no** se volvió a mirar en el navegador después de los arreglos: son de teclado (Escape), de
estado al reabrir y de texto, y los cubren los tests o son de una línea. Si el humano quiere, se
levanta el front de nuevo y se miran los cuatro caminos tocados.
