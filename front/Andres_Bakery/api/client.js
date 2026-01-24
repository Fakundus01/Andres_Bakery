import { apiBaseUrl } from "./index.js";

export class ApiClient {
  constructor(
    baseUrl = apiBaseUrl,
    { defaultHeaders = {}, apiKey = import.meta.env.VITE_SPOONACULAR_KEY } = {},
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = defaultHeaders;
    this.apiKey = apiKey;
  }

  buildUrl(path, params = {}) {
    const url = new URL(path, this.baseUrl);
    const finalParams = {
      ...params,
      apiKey: this.apiKey,
    };

    Object.entries(finalParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  }

  async request(path, { method = "GET", params, body, headers } = {}) {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...this.defaultHeaders,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }
}