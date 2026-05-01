import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig, ensureApiBaseUrl } from "../config.js";
import { ApiClient } from "../api/client.js";
import {
  createProfile,
  exportProfiles,
  getProfile,
  listProfiles,
  searchProfiles
} from "../services/profiles.js";
import { createSpinner } from "../utils/spinner.js";
import { renderTable } from "../utils/table.js";
import { friendlyErrorMessage } from "../utils/errors.js";

function normalizeProfileListResponse(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.items)) {
    return result.items;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
}

function profileRow(profile) {
  return {
    id: profile.id ?? profile._id,
    name: profile.name,
    gender: profile.gender,
    country: profile.country,
    age: profile.age,
    ageGroup: profile.ageGroup ?? profile["age-group"],
    createdAt: profile.createdAt
  };
}

export function parseListOptions(options) {
  return {
    gender: options.gender,
    country: options.country,
    "age-group": options.ageGroup,
    "min-age": options.minAge,
    "max-age": options.maxAge,
    "sort-by": options.sortBy,
    order: options.order,
    page: options.page,
    limit: options.limit
  };
}

async function withApiClient() {
  const config = await loadConfig();
  ensureApiBaseUrl(config);
  return { apiClient: new ApiClient(config), config };
}

async function handleWithSpinner(text, work) {
  const spinner = createSpinner(text);

  try {
    const result = await work();
    spinner.succeed("Done");
    return result;
  } catch (error) {
    spinner.fail(friendlyErrorMessage(error));
    process.exitCode = 1;
    return null;
  }
}

export function registerProfileCommands(program) {
  const profiles = program.command("profiles").description("Manage profiles");

  profiles
    .command("list")
    .description("List profiles with optional filters")
    .option("--gender <gender>", "Filter by gender")
    .option("--country <country>", "Filter by country")
    .option("--age-group <ageGroup>", "Filter by age group")
    .option("--min-age <minAge>", "Filter by minimum age", Number)
    .option("--max-age <maxAge>", "Filter by maximum age", Number)
    .option("--sort-by <field>", "Sort by field")
    .option("--order <order>", "Sort order (asc|desc)")
    .option("--page <page>", "Page number", Number)
    .option("--limit <limit>", "Page size", Number)
    .action(async (options) => {
      const result = await handleWithSpinner("Fetching profiles...", async () => {
        const { apiClient, config } = await withApiClient();
        return listProfiles(apiClient, parseListOptions(options), config);
      });

      if (!result) return;

      const profilesList = normalizeProfileListResponse(result);
      console.log(renderTable(profilesList.map(profileRow)));
    });

  profiles
    .command("get")
    .description("Get one profile by ID")
    .argument("<id>", "Profile ID")
    .action(async (id) => {
      const result = await handleWithSpinner("Fetching profile...", async () => {
        const { apiClient, config } = await withApiClient();
        return getProfile(apiClient, id, config);
      });

      if (!result) return;
      console.log(JSON.stringify(result, null, 2));
    });

  profiles
    .command("search")
    .description("Search profiles with natural language")
    .argument("<query>", "Search query")
    .action(async (query) => {
      const result = await handleWithSpinner("Searching profiles...", async () => {
        const { apiClient, config } = await withApiClient();
        return searchProfiles(apiClient, query, config);
      });

      if (!result) return;

      const profilesList = normalizeProfileListResponse(result);
      console.log(renderTable(profilesList.map(profileRow)));
    });

  profiles
    .command("create")
    .description("Create a profile (admin only on backend)")
    .requiredOption("--name <name>", "Profile name")
    .action(async (options) => {
      const result = await handleWithSpinner("Creating profile...", async () => {
        const { apiClient, config } = await withApiClient();
        return createProfile(apiClient, { name: options.name }, config);
      });

      if (!result) return;
      console.log("Profile created successfully.");
      console.log(JSON.stringify(result, null, 2));
    });

  profiles
    .command("export")
    .description("Export profiles to a file")
    .option("--format <format>", "Export format", "csv")
    .action(async (options) => {
      const format = String(options.format || "csv").toLowerCase();

      if (format !== "csv") {
        console.error("Only csv export is currently supported.");
        process.exitCode = 1;
        return;
      }

      const result = await handleWithSpinner("Exporting profiles...", async () => {
        const { apiClient, config } = await withApiClient();
        return exportProfiles(apiClient, format, config);
      });

      if (!result) return;

      const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
      const filename = `insighta-profiles-${timestamp}.csv`;
      const filePath = path.join(process.cwd(), filename);

      await fs.writeFile(filePath, String(result), "utf8");
      console.log(`Exported CSV to ${filePath}`);
    });
}
