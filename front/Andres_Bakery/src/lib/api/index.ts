/** La puerta publica de `lib/api`.
 *
 *  Existe para que partir el archivo no obligara a tocar los 20 lugares que
 *  importan de `../../lib/api`: siguen resolviendo aca.
 */

export { API_URL, ApiError, EVENTO_SESION_VENCIDA } from "./cliente";
export type { DetalleSesionVencida } from "./cliente";
export { productsApi, tagsApi, ingredientsApi } from "./catalogo";
export { ordersApi, paymentsApi, contactApi } from "./pedidos";
export { authApi, siteApi, uploadsApi, metricsApi, aiApi, usersApi } from "./sitio";
