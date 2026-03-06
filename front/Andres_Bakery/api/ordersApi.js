import { backendRequest } from "./backendClient.js";

export const OrdersApi = {
  list(token) {
    return backendRequest("/api/orders", { token });
  },
  create(payload, token) {
    return backendRequest("/api/orders", {
      method: "POST",
      body: payload,
      token,
    });
  },
  updateStatus(id, status, token) {
    return backendRequest(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: { status },
      token,
    });
  },
};
