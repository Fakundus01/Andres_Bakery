import { backendRequest } from "./backendClient.js";

export const AuthApi = {
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