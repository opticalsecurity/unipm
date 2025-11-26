import { runPackageManagerCommand } from "../core/command-runner";
import { Logger } from "../utils/logger";

export function Command() {
  return {
    name: "exec",
    description: "Run a command using the package manager",
    aliases: ["x"],
    execute: async (args: string[]): Promise<number> => {
      if (args.length === 0) {
        Logger.error(
          "No command specified. Please provide a command to execute."
        );
        return 1;
      }

      const result = await runPackageManagerCommand({
        commandType: "exec",
        args,
      });

      return result.exitCode;
    },
  };
}
