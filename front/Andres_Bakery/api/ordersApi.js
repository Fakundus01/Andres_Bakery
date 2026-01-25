import { backendRequest } from "./backendClient.js";

export const OrdersApi = {
  list(token) {
    return backendRequest("/api/orders", { token });
  },
  updateStatus(id, status, token) {
    return backendRequest(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: { status },
      token,
    });
  },
};
