import { API_VERSION } from "../constants.js";
import { joinApiUrl } from "../config.js";
import { TokenManager } from "../auth/tokenManager.js";

function buildUrl(baseUrl, path, query = {}) {
  const url = new URL(joinApiUrl(baseUrl, path));

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function parseBody(response, responseType = "json") {
  if (response.status === 204) {
    return null;
  }

  if (responseType === "text") {
    return response.text();
  }

  if (responseType === "buffer") {
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export class ApiClient {
  constructor(config) {
    this.config = config;
    this.tokenManager = new TokenManager(config);
  }

  async request(path, {
    method = "GET",
    auth = true,
    query,
    body,
    headers,
    responseType = "json"
  } = {}) {
    const url = buildUrl(this.config.apiBaseUrl, path, query);

    const perform = async (accessToken) => {
      const requestHeaders = {
        "Accept": "application/json",
        "X-API-Version": API_VERSION,
        ...headers
      };

      if (auth && accessToken) {
        requestHeaders.Authorization = `Bearer ${accessToken}`;
      }

      if (body !== undefined) {
        requestHeaders["Content-Type"] = "application/json";
      }

      return fetch(url, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    };

    const accessToken = auth ? await this.tokenManager.getValidAccessToken() : null;
    let response = await perform(accessToken);

    if (auth && response.status === 401) {
      const refreshed = await this.tokenManager.refreshAccessToken();
      response = await perform(refreshed.accessToken);
    }

    const parsedBody = await parseBody(response, responseType);

    if (!response.ok) {
      const errorMessage =
        typeof parsedBody === "string"
          ? parsedBody
          : parsedBody?.message || JSON.stringify(parsedBody);

      throw new Error(`API ${method} ${path} failed (${response.status}): ${errorMessage}`);
    }

    return parsedBody;
  }
}
