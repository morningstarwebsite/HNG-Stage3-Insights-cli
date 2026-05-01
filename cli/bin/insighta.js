#!/usr/bin/env node
import "dotenv/config";
import { runCli } from "../src/cli.js";

runCli().catch((error) => {
  const message = error?.message || "Unknown CLI error";
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
