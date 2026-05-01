import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { config as loadDotEnv } from "dotenv";
import { CONFIG_FILE, INSIGHTA_DIR } from "./constants.js";

loadDotEnv({ path: path.join(process.cwd(), ".env") });

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    throw new Error(`Failed to parse JSON file at ${filePath}: ${error.message}`);
  }
}

export function getInsightaHomeDir() {
  return path.join(os.homedir(), INSIGHTA_DIR);
}

export async function loadConfig() {
  const homeDir = getInsightaHomeDir();
  const fileConfig = await readJsonIfExists(path.join(homeDir, CONFIG_FILE));

  const apiBaseUrl = process.env.INSIGHTA_API_BASE_URL || fileConfig.apiBaseUrl;

  return {
    apiBaseUrl,
    oauthAuthorizePath:
      process.env.INSIGHTA_OAUTH_AUTHORIZE_PATH ||
      process.env.INSIGHTA_OAUTH_AUTHORIZE_URL ||
      fileConfig.oauthAuthorizePath ||
      "/auth/github/authorize",
    oauthTokenPath:
      process.env.INSIGHTA_OAUTH_TOKEN_PATH ||
      process.env.INSIGHTA_OAUTH_TOKEN_URL ||
      fileConfig.oauthTokenPath ||
      "/auth/github/exchange",
    refreshPath:
      process.env.INSIGHTA_REFRESH_PATH ||
      process.env.INSIGHTA_REFRESH_URL ||
      fileConfig.refreshPath ||
      "/auth/refresh",
    whoamiPath:
      process.env.INSIGHTA_WHOAMI_PATH ||
      process.env.INSIGHTA_WHOAMI_URL ||
      fileConfig.whoamiPath ||
      "/auth/whoami",
    profilesPath:
      process.env.INSIGHTA_PROFILES_PATH ||
      process.env.INSIGHTA_PROFILES_URL ||
      fileConfig.profilesPath ||
      "/profiles",
    profilesExportPath:
      process.env.INSIGHTA_PROFILES_EXPORT_PATH ||
      process.env.INSIGHTA_PROFILES_EXPORT_URL ||
      fileConfig.profilesExportPath ||
      "/profiles/export",
    callbackHost:
      process.env.INSIGHTA_CALLBACK_HOST || fileConfig.callbackHost || "localhost",
    callbackPort: Number(process.env.INSIGHTA_CALLBACK_PORT || fileConfig.callbackPort || 53621),
    callbackPath:
      process.env.INSIGHTA_CALLBACK_PATH || fileConfig.callbackPath || "/oauth/callback",
    strictStateValidation:
      String(process.env.INSIGHTA_OAUTH_STRICT_STATE ?? fileConfig.strictStateValidation ?? "true")
        .toLowerCase() !== "false"
  };
}

export function ensureApiBaseUrl(config) {
  if (!config.apiBaseUrl) {
    throw new Error(
      "Missing backend API base URL. Set INSIGHTA_API_BASE_URL or ~/.insighta/config.json#apiBaseUrl"
    );
  }
}

export function joinApiUrl(baseUrl, endpointPath) {
  return new URL(endpointPath, baseUrl).toString();
}
