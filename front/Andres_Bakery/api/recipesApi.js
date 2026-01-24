import { backendRequest } from "./backendClient.js";

export const RecipesApi = {
  list() {
    return backendRequest("/api/recipes");
  },
  getById(id) {
    return backendRequest(`/api/recipes/${id}`);
  },
  create(data, token) {
    return backendRequest("/api/recipes", { method: "POST", body: data, token });
  },
  update(id, data, token) {
    return backendRequest(`/api/recipes/${id}`, {
      method: "PUT",
      body: data,
      token,
    });
  },
  remove(id, token) {
    return backendRequest(`/api/recipes/${id}`, { method: "DELETE", token });
  },
};