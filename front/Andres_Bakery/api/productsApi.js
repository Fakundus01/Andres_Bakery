import { backendRequest } from "./backendClient.js";

export const ProductsApi = {
  list() {
    return backendRequest("/api/products");
  },
  create(data, token) {
    ensureAdminToken(token);
    return backendRequest("/api/products", { method: "POST", body: data, token });
  },
  update(id, data, token) {
    ensureAdminToken(token);
    return backendRequest(`/api/products/${id}`, {
      method: "PUT",
      body: data,
      token,
    });
  },
  remove(id, token) {
    ensureAdminToken(token);
    return backendRequest(`/api/products/${id}`, { method: "DELETE", token });
  },
};

const ensureAdminToken = (token) => {
  if (!token) {
    throw new Error("Necesitás iniciar sesión como admin para esta acción.");
  }
};
