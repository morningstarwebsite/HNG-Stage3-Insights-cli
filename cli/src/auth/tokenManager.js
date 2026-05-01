import { joinApiUrl } from "../config.js";
import { API_VERSION } from "../constants.js";
import { clearCredentials, readCredentials, writeCredentials } from "../storage/credentials.js";
import { parseTokenResponse } from "./oauth.js";

const EXPIRY_BUFFER_MS = 30_000;

export function isExpired(expiresAt, now = Date.now()) {
  return !expiresAt || now >= Number(expiresAt) - EXPIRY_BUFFER_MS;
}

export class TokenManager {
  constructor(config) {
    this.config = config;
  }

  async requireCredentials() {
    const credentials = await readCredentials();

    if (!credentials) {
      throw new Error("You are not logged in. Run insighta login.");
    }

    return credentials;
  }

  async getValidAccessToken() {
    const credentials = await this.requireCredentials();

    if (!isExpired(credentials.expiresAt)) {
      return credentials.accessToken;
    }

    const refreshed = await this.refreshAccessToken(credentials);
    return refreshed.accessToken;
  }

  async refreshAccessToken(existingCredentials = null) {
    const credentials = existingCredentials || (await this.requireCredentials());

    if (!credentials.refreshToken) {
      await clearCredentials();
      throw new Error("Session expired and refresh token is missing. Run insighta login.");
    }

    const response = await fetch(joinApiUrl(this.config.apiBaseUrl, this.config.refreshPath), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Version": API_VERSION
      },
      body: JSON.stringify({ refresh_token: credentials.refreshToken })
    });

    if (!response.ok) {
      await clearCredentials();
      throw new Error("Session expired and refresh failed. Run insighta login.");
    }

    const payload = await response.json();
    const nextTokenSet = parseTokenResponse(payload);

    const merged = {
      ...credentials,
      ...nextTokenSet,
      refreshToken: nextTokenSet.refreshToken || credentials.refreshToken
    };

    await writeCredentials(merged);
    return merged;
  }
}
