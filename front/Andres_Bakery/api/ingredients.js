import { ApiClient } from "./client.js";

export class IngredientsApi {
  constructor(client = new ApiClient()) {
    this.client = client;
  }

  search({ query, number = 10, sort = "popularity" } = {}) {
    return this.client.request("/food/ingredients/search", {
      params: {
        query,
        number,
        sort,
      },
    });
  }

  getById(id, { amount, unit } = {}) {
    return this.client.request(`/food/ingredients/${id}/information`, {
      params: {
        amount,
        unit,
      },
    });
  }
}