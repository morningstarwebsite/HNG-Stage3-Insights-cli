import http from "node:http";
import open from "open";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "./pkce.js";
import { joinApiUrl } from "../config.js";
import { API_VERSION } from "../constants.js";

function resolveEndpointUrl(baseUrl, endpoint, label) {
  try {
    return joinApiUrl(baseUrl, endpoint);
  } catch {
    throw new Error(`Invalid ${label} URL/path: ${endpoint}`);
  }
}

function parseTokenResponse(payload) {
  const now = Date.now();
  const expiresInSeconds = Number(payload.expires_in ?? payload.expiresIn ?? 3600);

  return {
    accessToken: payload.access_token ?? payload.accessToken,
    refreshToken: payload.refresh_token ?? payload.refreshToken,
    expiresAt: now + expiresInSeconds * 1000,
    tokenType: payload.token_type ?? payload.tokenType ?? "Bearer",
    user: payload.user ?? null
  };
}

function createCallbackHandler(
  server,
  callbackPath,
  expectedState,
  strictStateValidation,
  port,
  resolve,
  reject
) {
  return (req, res) => {
    const reqUrl = new URL(req.url, `http://localhost:${port}`);

    if (reqUrl.pathname !== callbackPath) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    const state = reqUrl.searchParams.get("state");
    const code = reqUrl.searchParams.get("code");
    const oauthError = reqUrl.searchParams.get("error");

    if (oauthError) {
      res.statusCode = 400;
      res.end("Login failed. You can close this window.");
      server.close();
      reject(new Error(`OAuth failed: ${oauthError}`));
      return;
    }

    if (!state) {
      res.statusCode = 400;
      res.end("Invalid OAuth state. You can close this window.");
      server.close();
      reject(new Error("OAuth state mismatch"));
      return;
    }

    if (strictStateValidation && state !== expectedState) {
      res.statusCode = 400;
      res.end("Invalid OAuth state. You can close this window.");
      server.close();
      reject(new Error("OAuth state mismatch"));
      return;
    }

    if (!code) {
      res.statusCode = 400;
      res.end("Missing authorization code. You can close this window.");
      server.close();
      reject(new Error("Missing authorization code"));
      return;
    }

    res.statusCode = 200;
    res.end("Login successful. You can close this window and return to your terminal.");
    server.close();
    resolve({ code, state });
  };
}

function listenServer(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.removeListener("error", reject);
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Could not determine callback server port"));
        return;
      }

      resolve(address.port);
    });
  });
}

async function startCallbackServer({
  callbackPort,
  callbackPath,
  expectedState,
  strictStateValidation
}) {
  const server = http.createServer();
  let port;

  try {
    port = await listenServer(server, callbackPort);
  } catch (error) {
    if (error.code !== "EADDRINUSE" && error.code !== "EACCES") {
      throw error;
    }

    // Fall back to an ephemeral port when configured port is blocked or occupied.
    port = await listenServer(server, 0);
  }

  const waitForCode = new Promise((resolve, reject) => {
    server.on(
      "request",
      createCallbackHandler(
        server,
        callbackPath,
        expectedState,
        strictStateValidation,
        port,
        resolve,
        reject
      )
    );
    server.on("error", reject);
  });

  return { port, waitForCode };
}

export async function loginWithGithubPkce(config) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const { port, waitForCode } = await startCallbackServer({
    callbackPort: config.callbackPort,
    callbackPath: config.callbackPath,
    expectedState: state,
    strictStateValidation: config.strictStateValidation
  });

  const callbackHost = config.callbackHost || "localhost";
  const redirectUri = `http://${callbackHost}:${port}${config.callbackPath}`;
  const authorizeEndpoint = resolveEndpointUrl(
    config.apiBaseUrl,
    config.oauthAuthorizePath,
    "OAuth authorize"
  );
  const tokenEndpoint = resolveEndpointUrl(
    config.apiBaseUrl,
    config.oauthTokenPath,
    "OAuth token"
  );
  const authorizeUrl = new URL(authorizeEndpoint);

  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);

  console.log(`Open this URL if browser launch fails:\n${authorizeUrl.toString()}`);
  if (!config.strictStateValidation) {
    console.warn(
      "Warning: strict OAuth state validation is disabled (INSIGHTA_OAUTH_STRICT_STATE=false)."
    );
  }

  await open(authorizeUrl.toString());

  const { code } = await waitForCode;

  const exchangeResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Version": API_VERSION
    },
    body: JSON.stringify({
      code,
      state,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri
    })
  });

  if (!exchangeResponse.ok) {
    const body = await exchangeResponse.text();
    throw new Error(`Token exchange failed (${exchangeResponse.status}): ${body}`);
  }

  const tokenPayload = await exchangeResponse.json();
  const tokenSet = parseTokenResponse(tokenPayload);

  if (!tokenSet.accessToken || !tokenSet.refreshToken) {
    throw new Error("Backend did not return required tokens");
  }

  return tokenSet;
}

export { parseTokenResponse };
