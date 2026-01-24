import { ApiClient } from "./client.js";

export class RecipesApi {
  constructor(client = new ApiClient()) {
    this.client = client;
  }

  search({
    query,
    cuisine,
    diet,
    maxReadyTime,
    number = 12,
    offset = 0,
    addRecipeInformation = true,
  } = {}) {
    return this.client.request("/recipes/complexSearch", {
      params: {
        query,
        cuisine,
        diet,
        maxReadyTime,
        number,
        offset,
        addRecipeInformation,
      },
    });
  }

  getById(id, { includeNutrition = false } = {}) {
    return this.client.request(`/recipes/${id}/information`, {
      params: {
        includeNutrition,
      },
    });
  }

  getRandom({ tags, number = 1 } = {}) {
    return this.client.request("/recipes/random", {
      params: {
        tags,
        number,
      },
    });
  }
}