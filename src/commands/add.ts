import { runPackageManagerCommand } from "../core/command-runner";
import { Logger } from "../utils/logger";

export function Command() {
  return {
    name: "add",
    description: "Add a package to the current project",
    aliases: ["a"],
    execute: async (args: string[]): Promise<number> => {
      // Validate arguments
      if (args.length === 0) {
        Logger.error("No package specified. Please provide a package name.");
        return 1;
      }

      const result = await runPackageManagerCommand({
        commandType: "add",
        args,
        successMessage: "Successfully added package(s): {packages}",
      });

      return result.exitCode;
    },
  };
}
