import test from "node:test";
import assert from "node:assert/strict";
import { isExpired } from "../src/auth/tokenManager.js";

test("isExpired returns true for missing expiry", () => {
  assert.equal(isExpired(undefined, Date.now()), true);
});

test("isExpired returns false for future expiry", () => {
  const now = Date.now();
  assert.equal(isExpired(now + 120_000, now), false);
});

test("isExpired returns true near expiry buffer", () => {
  const now = Date.now();
  assert.equal(isExpired(now + 5_000, now), true);
});
