import { loadConfig, ensureApiBaseUrl } from "../config.js";
import { clearCredentials, readCredentials, writeCredentials } from "../storage/credentials.js";
import { loginWithGithubPkce } from "../auth/oauth.js";
import { createSpinner } from "../utils/spinner.js";
import { ApiClient } from "../api/client.js";
import { friendlyErrorMessage } from "../utils/errors.js";

async function withConfig() {
  const config = await loadConfig();
  ensureApiBaseUrl(config);
  return config;
}

export function registerAuthCommands(program) {
  program
    .command("login")
    .description("Login with GitHub OAuth PKCE")
    .action(async () => {
      const spinner = createSpinner("Starting GitHub login...");

      try {
        const config = await withConfig();
        const tokenSet = await loginWithGithubPkce(config);
        await writeCredentials(tokenSet);

        const apiClient = new ApiClient(config);
        let user = tokenSet.user;

        if (!user) {
          spinner.text = "Fetching profile...";
          user = await apiClient.request(config.whoamiPath, { method: "GET" });
          await writeCredentials({ ...tokenSet, user });
        }

        spinner.succeed(`Logged in as ${user?.username || user?.email || "unknown user"}`);
      } catch (error) {
        spinner.fail(friendlyErrorMessage(error));
        process.exitCode = 1;
      }
    });

  program
    .command("logout")
    .description("Clear local credentials")
    .action(async () => {
      await clearCredentials();
      console.log("Logged out successfully.");
    });

  program
    .command("whoami")
    .description("Show the current authenticated user")
    .action(async () => {
      const spinner = createSpinner("Loading user profile...");

      try {
        const config = await withConfig();
        const credentials = await readCredentials();

        if (!credentials) {
          spinner.fail("Not logged in. Run insighta login.");
          process.exitCode = 1;
          return;
        }

        const apiClient = new ApiClient(config);
        const user = await apiClient.request(config.whoamiPath, { method: "GET" });
        spinner.succeed("Authenticated");
        console.log(JSON.stringify(user, null, 2));
      } catch (error) {
        spinner.fail(friendlyErrorMessage(error));
        process.exitCode = 1;
      }
    });
}
