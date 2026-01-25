import { backendRequest } from "./backendClient.js";

export const AuthApi = {
  register(name, email, password) {
    return backendRequest("/api/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
  },
  login(email, password) {
    return backendRequest("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },
  me(token) {
    return backendRequest("/api/auth/me", { token });
  },
};