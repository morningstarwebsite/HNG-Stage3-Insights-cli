import crypto from "node:crypto";

export function base64url(input) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateState() {
  return base64url(crypto.randomBytes(24));
}

export function generateCodeVerifier() {
  return base64url(crypto.randomBytes(64));
}

export function generateCodeChallenge(verifier) {
  return base64url(crypto.createHash("sha256").update(verifier).digest());
}
