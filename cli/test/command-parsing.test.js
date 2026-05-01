import test from "node:test";
import assert from "node:assert/strict";
import { parseListOptions } from "../src/commands/profiles.js";

test("parseListOptions maps CLI options to backend query keys", () => {
  const query = parseListOptions({
    gender: "female",
    country: "NG",
    ageGroup: "18-24",
    minAge: 18,
    maxAge: 24,
    sortBy: "createdAt",
    order: "desc",
    page: 2,
    limit: 20
  });

  assert.deepEqual(query, {
    gender: "female",
    country: "NG",
    "age-group": "18-24",
    "min-age": 18,
    "max-age": 24,
    "sort-by": "createdAt",
    order: "desc",
    page: 2,
    limit: 20
  });
});
