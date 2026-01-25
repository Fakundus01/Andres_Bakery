import { backendRequest } from "./backendClient.js";

export const BackendIngredientsApi = {
  list() {
    return backendRequest("/api/ingredients");
  },
  create(data, token) {
    ensureAdminToken(token);
    return backendRequest("/api/ingredients", {
      method: "POST",
      body: data,
      token,
    });
  },
  update(id, data, token) {
    ensureAdminToken(token);
    return backendRequest(`/api/ingredients/${id}`, {
      method: "PUT",
      body: data,
      token,
    });
  },
  remove(id, token) {
    ensureAdminToken(token);
    return backendRequest(`/api/ingredients/${id}`, {
      method: "DELETE",
      token,
    });
  },
};

const ensureAdminToken = (token) => {
  if (!token) {
    throw new Error("Necesitás iniciar sesión como admin para esta acción.");
  }
};
