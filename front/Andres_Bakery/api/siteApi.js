import { backendRequest } from "./backendClient.js";

export const SiteApi = {
  getAbout() {
    return backendRequest("/api/site/about");
  },
  updateAbout(content, token) {
    return backendRequest("/api/site/about", {
      method: "PUT",
      body: { content },
      token,
    });
  },
};
