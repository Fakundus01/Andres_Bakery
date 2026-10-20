/** La carta: productos, etiquetas e ingredientes. */
import type {
  Ingredient,
  OptionChoice,
  OptionGroup,
  Product,
  ProductWritePayload,
  Tag,
} from "../types";
import { apiRequest } from "./cliente";

export const productsApi = {
  list(filtros: { tag?: string; soloDisponibles?: boolean } = {}) {
    const query = new URLSearchParams();
    if (filtros.tag) {
      query.set("tag", filtros.tag);
    }
    if (filtros.soloDisponibles) {
      query.set("available", "1");
    }
    const sufijo = query.toString();
    return apiRequest<Product[]>(`/api/products${sufijo ? `?${sufijo}` : ""}`);
  },
  getBySlug(slug: string) {
    return apiRequest<Product>(`/api/products/${encodeURIComponent(slug)}`);
  },
  create(product: ProductWritePayload, token: string) {
    return apiRequest<{ id: number }>("/api/products", {
      method: "POST",
      body: product,
      token,
    });
  },
  update(id: number, product: ProductWritePayload, token: string) {
    return apiRequest<{ status: string }>(`/api/products/${id}`, {
      method: "PUT",
      body: product,
      token,
    });
  },
  remove(id: number, token: string) {
    return apiRequest<{ status: string }>(`/api/products/${id}`, {
      method: "DELETE",
      token,
    });
  },
};

export const tagsApi = {
  list() {
    return apiRequest<Tag[]>("/api/tags");
  },
  create(tag: { name: string; color_token?: string; sort_order?: number }, token: string) {
    return apiRequest<{ id: number; slug: string }>("/api/tags", {
      method: "POST",
      body: tag,
      token,
    });
  },
  update(id: number, tag: Partial<Tag> & { sort_order?: number }, token: string) {
    return apiRequest<{ status: string }>(`/api/tags/${id}`, {
      method: "PUT",
      body: tag,
      token,
    });
  },
  remove(id: number, token: string) {
    return apiRequest<{ status: string }>(`/api/tags/${id}`, {
      method: "DELETE",
      token,
    });
  },
};

export const ingredientsApi = {
  list() {
    return apiRequest<Ingredient[]>("/api/ingredients");
  },
  /** 201 si lo creó, 200 si ya existía con ese nombre (ADR-030). Las dos
   *  devuelven `{id}`, que es lo único que necesita el panel. */
  create(ingrediente: { name: string; unit?: string | null }, token: string) {
    return apiRequest<{ id: number; name?: string }>("/api/ingredients", {
      method: "POST",
      body: ingrediente,
      token,
    });
  },
  update(id: number, ingrediente: { name?: string; unit?: string | null }, token: string) {
    return apiRequest<{ status: string }>(`/api/ingredients/${id}`, {
      method: "PUT",
      body: ingrediente,
      token,
    });
  },
  remove(id: number, token: string) {
    return apiRequest<{ status: string }>(`/api/ingredients/${id}`, {
      method: "DELETE",
      token,
    });
  },
};

/** Los grupos de sabores que define la chef (F57, ADR-031).
 *
 *  El `GET` es publico porque la ficha del producto necesita saber que se
 *  puede elegir; el resto es solo de ella.
 */
export const optionGroupsApi = {
  list() {
    return apiRequest<OptionGroup[]>("/api/option-groups");
  },
  /** 201 si lo creó, 200 si ya existía con ese nombre (ADR-030/031). */
  create(
    grupo: { name: string; required?: boolean; sort_order?: number; options?: string[] },
    token: string,
  ) {
    return apiRequest<OptionGroup>("/api/option-groups", {
      method: "POST",
      body: grupo,
      token,
    });
  },
  update(
    id: number,
    grupo: { name?: string; required?: boolean; sort_order?: number },
    token: string,
  ) {
    return apiRequest<{ status: string }>(`/api/option-groups/${id}`, {
      method: "PUT",
      body: grupo,
      token,
    });
  },
  remove(id: number, token: string) {
    return apiRequest<{ status: string }>(`/api/option-groups/${id}`, {
      method: "DELETE",
      token,
    });
  },
  crearOpcion(
    groupId: number,
    opcion: { name: string; price_delta?: number; sort_order?: number },
    token: string,
  ) {
    return apiRequest<OptionChoice>(`/api/option-groups/${groupId}/options`, {
      method: "POST",
      body: opcion,
      token,
    });
  },
  /** El nombre y el recargo van juntos: son la misma fila (F61). */
  editarOpcion(
    groupId: number,
    optionId: number,
    cambios: { name?: string; price_delta?: number },
    token: string,
  ) {
    return apiRequest<{ status: string }>(
      `/api/option-groups/${groupId}/options/${optionId}`,
      { method: "PUT", body: cambios, token },
    );
  },
  borrarOpcion(groupId: number, optionId: number, token: string) {
    return apiRequest<{ status: string }>(
      `/api/option-groups/${groupId}/options/${optionId}`,
      { method: "DELETE", token },
    );
  },
};
