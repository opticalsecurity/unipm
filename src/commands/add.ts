import { CommandMatching } from "../core/matching";
import { DetectPackageManager } from "../core/detection";
import { executePackageManagerCommand } from "../core/execution";
import { Logger } from "../utils/logger";
import { parseContent } from "../utils/parser";
import { AddContent } from "../constants/help-text";

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

      try {
        // Detect package manager
        const detectedPackageManager = await DetectPackageManager();
        Logger.debug("Detected package manager", detectedPackageManager);

        // Check if a package manager was detected
        if (detectedPackageManager.name === "none") {
          Logger.error(
            "No package manager detected. Please run 'bun init' or 'bun install' to initialize the project."
          );
          return 1;
        }

        // Get command variant for the detected package manager
        const commandVariant =
          CommandMatching.add[
            detectedPackageManager.name as keyof typeof CommandMatching.add
          ];

        // Check if the package manager is supported
        if (!commandVariant) {
          Logger.error(
            `Unsupported package manager: ${detectedPackageManager.name}.`
          );
          return 1;
        }

        const command = commandVariant.command;
        const fullCommand = `${command} ${args.join(" ")}`;

        // Show information about the command to be executed
        const output = parseContent(AddContent, {
          packageManager: detectedPackageManager.name,
          packageManagerVersion: detectedPackageManager.version || "unknown",
          command: fullCommand,
        });

        console.log(output);

        // Execute the package manager command
        const result = await executePackageManagerCommand(command, args);

        // Handle execution result
        if (!result.success) {
          if (result.error) {
            Logger.error(
              `Failed to execute command: ${fullCommand}`,
              result.error
            );
          } else {
            Logger.error(`Command failed with exit code ${result.exitCode}`);
          }
          return result.exitCode || 1;
        }

        Logger.success(`Successfully added package(s): ${args.join(", ")}`);
        return 0;
      } catch (error) {
        Logger.error("An unexpected error occurred", error);
        return 1;
      }
    },
  };
}
