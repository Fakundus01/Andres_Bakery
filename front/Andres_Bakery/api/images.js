import { ApiClient } from "./client.js";

export class ImagesApi {
  constructor(client = new ApiClient()) {
    this.client = client;
  }

  search({ query, page } = {}) {
    return this.client.request("/images/search", {
      params: {
        q: query,
        page,
      },
    });
  }
}