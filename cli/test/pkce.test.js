import test from "node:test";
import assert from "node:assert/strict";
import {
  base64url,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState
} from "../src/auth/pkce.js";

test("base64url strips unsafe characters", () => {
  const encoded = base64url(Buffer.from("hello+world/=="));
  assert.ok(!encoded.includes("+"));
  assert.ok(!encoded.includes("/"));
  assert.ok(!encoded.includes("="));
});

test("pkce values are generated and stable shape", () => {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  assert.ok(state.length >= 32);
  assert.ok(verifier.length >= 43);
  assert.equal(challenge.length, 43);
});
