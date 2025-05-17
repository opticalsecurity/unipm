import { ExecuteCommand } from "./helpers/command-registry";
import { CheckVersion } from "./helpers/check-unipm-version";
const { version } = await import("../package.json");

const args = process.argv.slice(2);
async function main() {
  if (args.length === 0) {
    await ExecuteCommand("help", []);
  } else {
    const commandName = args[0] ?? "help";
    const commandArgs = args.slice(1);
    try {
      await ExecuteCommand(commandName, commandArgs);
    } catch (error: unknown) {
      console.error(`Error executing command: ${(error as Error).message}`);
      await ExecuteCommand("help", []);
    }
  }
}

console.log(`📦 unipm v${version}`);
await main();
