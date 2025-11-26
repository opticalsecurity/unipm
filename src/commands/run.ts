import { runPackageManagerCommand } from "../core/command-runner";
import { Logger } from "../utils/logger";

export function Command() {
  return {
    name: "run",
    description: "Run a script from package.json",
    aliases: [],
    execute: async (args: string[]): Promise<number> => {
      if (args.length === 0) {
        Logger.error("No script specified. Please provide a script name.");
        return 1;
      }

      const result = await runPackageManagerCommand({
        commandType: "run",
        args,
      });

      return result.exitCode;
    },
  };
}
