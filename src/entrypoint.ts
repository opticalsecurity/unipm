import { ExecuteCommand } from "./helpers/command-registry";

const args = process.argv.slice(2);

if (args.length === 0) {
  await ExecuteCommand("help", []);
}
