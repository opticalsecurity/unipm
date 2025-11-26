import { runPackageManagerCommand } from "../core/command-runner";
import { Logger } from "../utils/logger";

export function Command() {
  return {
    name: "install",
    description: "Installs all project dependencies",
    aliases: ["i"],
    execute: async (args: string[]): Promise<number> => {
      if (args.length > 0) {
        Logger.error("This command does not accept any arguments.");
        return 1;
      }

      const result = await runPackageManagerCommand({
        commandType: "install",
        args: [],
        successMessage: "Successfully installed dependencies",
      });

      return result.exitCode;
    },
  };
}
