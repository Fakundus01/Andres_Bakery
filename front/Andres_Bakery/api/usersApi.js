import { backendRequest } from "./backendClient.js";

export const UsersApi = {
  list(token) {
    return backendRequest("/api/users", { token });
  },
};
