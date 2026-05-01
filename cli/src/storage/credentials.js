import fs from "node:fs/promises";
import path from "node:path";
import { CREDENTIALS_FILE } from "../constants.js";
import { getInsightaHomeDir } from "../config.js";

function credentialFilePath() {
  return path.join(getInsightaHomeDir(), CREDENTIALS_FILE);
}

export async function readCredentials() {
  const filePath = credentialFilePath();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw new Error(`Failed to read credentials: ${error.message}`);
  }
}

export async function writeCredentials(credentials) {
  const homeDir = getInsightaHomeDir();
  const filePath = credentialFilePath();

  await fs.mkdir(homeDir, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(credentials, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
}

export async function clearCredentials() {
  const filePath = credentialFilePath();

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error(`Failed to clear credentials: ${error.message}`);
    }
  }
}
