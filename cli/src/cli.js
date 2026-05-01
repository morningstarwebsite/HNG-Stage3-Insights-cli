import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.js";
import { registerProfileCommands } from "./commands/profiles.js";

export async function runCli(argv = process.argv) {
  const program = new Command();

  program
    .name("insighta")
    .description("Insighta Labs+ CLI")
    .version("0.1.0");

  registerAuthCommands(program);
  registerProfileCommands(program);

  await program.parseAsync(argv);
}
