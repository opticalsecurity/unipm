import { runPackageManagerCommand } from "../core/command-runner";
import { Logger } from "../utils/logger";

export function Command() {
  return {
    name: "remove",
    description: "Remove a package from the current project",
    aliases: ["rm", "r"],
    execute: async (args: string[]): Promise<number> => {
      if (args.length === 0) {
        Logger.error("No package specified. Please provide a package name.");
        return 1;
      }

      const result = await runPackageManagerCommand({
        commandType: "remove",
        args,
        successMessage: "Successfully removed package(s): {packages}",
      });

      return result.exitCode;
    },
  };
}
