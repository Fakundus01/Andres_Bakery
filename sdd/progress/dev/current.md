# current.md · rama `dev`

**Última actualización:** 2026-10-24 · **Versión de la hoja:** 0.17.1 · **Último commit:** `7271583`

## En vuelo

**T24 · El botón «Ver carrito» estaba muerto en celular** — implementado, verde en los cuatro
comandos, medido en el navegador, **esperando reviewer independiente** (R30: lo implementó un
agente y no puede verificarse a sí mismo). Todo el detalle en
[`handback_T24.md`](handback_T24.md).

### Qué pasó, en una línea

El botón del carrito de la barra inferior **no recibía ni uno de sus 675 puntos** a 320, 360 y
390 px: lo tapaba entero el contenedor fijo del panel de Ayuda. El 5,3 % que veníamos persiguiendo
desde T23 **se lo robaba a un botón que ya estaba muerto** — de haber arreglado sólo eso, la
medición habría dicho «0 % robado» sobre un botón que no funcionaba.

| | Antes | Después |
|---|---|---|
| Puntos robados a 390 px, sin avisos | **675/675** | **0/660 = 0 %** |
| El centro llega al botón | No, en 320/360/390/430 | **Sí, en los seis anchos** |
| Clic real de mouse | el drawer no abría | abre |

El arreglo es `pointer-events-none` en el contenedor y `pointer-events-auto` en el panel —el mismo
patrón que `RegionDeAvisos.tsx` ya usaba desde T23—, razonado en **ADR-039**. Se eligió sobre
reubicar porque **reubicar arregla una instancia y no la clase**: el próximo clickeable que cayera
en esos 340×44 px volvía a morir en silencio.

### Lo que lo cuida

`src/lib/capasFijas.ts` + su test no son un test de este botón: son un **guard que recorre todos
los `.tsx`** y marca cualquier contenedor `fixed` sin `pointer-events-none`. Dos rojos vistos y
pegados, no deducidos. Declarado: prueba la **declaración**, no la geometría.

### Estado del árbol

**Commiteado** como `0758e55` el 2026-10-24, con OK del dueño, y revisado después por un reviewer
independiente (`review_T24.md`): `CHANGES_REQUESTED`, 3 ALTA y 2 MEDIA, **ninguna pidiendo tocar
código**. Las cinco están corregidas en los MDs. La base de desarrollo quedó **fila por fila como
estaba** —verificado con un diff de las 19 tablas, dos veces— y los servidores apagados.

> **ALTA 3 del review, y es la más instructiva de las tres:** la versión anterior de este archivo
> **se commiteó diciendo «Nada commiteado» y apuntando al commit anterior**, citando además un
> «DRIFT 3» que la propia corrección ya había cerrado. Y pasó **en el mismo archivo donde, cuatro
> párrafos más abajo, se acababa de escribir que `current.md` se actualiza al commitear "porque si
> no, miente justo cuando más se lo necesita"**. Escribir la regla y romperla en el mismo
> documento, el mismo día. La lección operativa es que **`current.md` se escribe después del
> commit, no antes**: mientras se escriba antes, va a decir «nada commiteado» para siempre.

## Lo que sigue abierto

- **El 5,3 % de la X**, ahora medido sobre un botón vivo: **36/660 = 5,45 %** con un aviso en
  pantalla. Los 36 son la X; el residual sin avisos es **0 %**.

  > **Corregido el 2026-10-24 (ALTA 2 del review de T24):** acá decía «51/675 = 7,6 %, de los que
  > 36 son la X y 15 el borde del layout». Los 15 no son el borde: son **el artefacto de la grilla**: 15 puntos en **una sola columna**, en `x = rect.right`, que **no está sobre el botón** — `elementFromPoint(350,798)` da el botón y `(351,798)` da el panel de al lado. Los puntos reales sobre el botón son **660**. El
  > residual post-arreglo es **0 %**, y el número de referencia para la próxima tarjeta es
  > **5,45 %**, no 7,6 %. La frase equivocada se había propagado **correctamente a los cuatro
  > lugares** donde vivía, que es el reverso exacto del defecto que venimos persiguiendo: el
  > barrido funcionó y lo que se propagó estaba mal.
- **D29 a D35** en `status.md`. D33 quedó corregida: afirmaba que el desborde «no se puede arreglar
  desde la interfaz», y sí se puede — lo imposible es cambiar el precio dejando el nombre largo.
- **T21-F62 · El descuento vive en la etiqueta** es la próxima de la cola. **Toca plata (N2)**, así
  que por R27 pide **security-reviewer además del funcional**.

## Deuda de método, declarada

Este archivo estaba en **T20-F61 / 0.16.0** y decía que el último commit era `4146ea3`. Es
justamente el archivo que R30 manda leer para retomar tras un corte, y estaba mandando a un estado
viejo: T20 ya está commiteado y su registro completo vive en
[`handback_T20.md`](handback_T20.md) y [`review_T20.md`](review_T20.md), que es donde corresponde.
Lo señaló el DRIFT 3 del handback de T24. **La lección es que `current.md` se actualiza
*después* de commitear, no antes y no al empezar lo siguiente** — si no, miente justo cuando más
se lo necesita, que es exactamente lo que volvió a pasar en la corrección misma (ALTA 3).
