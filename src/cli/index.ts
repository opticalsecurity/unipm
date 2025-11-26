import { ExecuteCommand } from "../core/registry";
import { backgroundUpdateCheck } from "../core/updater";
import { Timer } from "../utils/timer";

// Read version at startup (static import would be ideal but json imports need config)
const { version } = await import("../../package.json");

const args = process.argv.slice(2);

async function main() {
  const commandName = args[0] ?? "help";
  const commandArgs = args.slice(1);

  // Start timer for command execution
  const timer = Timer.start();

  try {
    await ExecuteCommand(commandName, commandArgs);
  } catch (error: unknown) {
    console.error(`Error executing command: ${(error as Error).message}`);
    await ExecuteCommand("help", []);
  }

  // Print timing information
  timer.print(commandName);
}

console.log(`📦 unipm v${version}`);

// Background update check (non-blocking)
backgroundUpdateCheck(version);

await main();
