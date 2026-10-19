/** Los DTO de la API, en modulos por tema.
 *
 *  Era un solo archivo y paso las 300 lineas al entrar los grupos de opciones
 *  (R05). Se parte igual que `lib/api.ts`: este `index` mantiene la puerta,
 *  asi que los `from "../lib/types"` de todo el front siguen resolviendo y
 *  ningun import cambio.
 */

export type * from "./catalogo";
export type * from "./pedidos";
export type * from "./sitio";
