import { CommandMatching } from "../core/matching";
import { executePackageManagerCommand } from "../core/execution";
import { Logger } from "../utils/logger";
import { PackageManager } from "../types/package-managers";

export function Command() {
  return {
    name: "remove",
    description: "Remove a package from the current project",
    aliases: ["rm", "r"],
    execute: async (args: string[]) => {
      try {
        // Validate arguments
        if (args.length === 0) {
          Logger.error("No package specified. Please provide a package name.");
          return 1;
        }

        const { parseContent } = await import("../utils/parser");
        const { RemoveContent } = await import("../constants/help-text");
        const { DetectPackageManager } = await import(
          "../core/detection"
        );
        const { version } = await import("../../package.json");

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

        // Check if the detected package manager is a valid key in PackageManager enum
        if (!Object.values(PackageManager).includes(detectedPackageManager.name as PackageManager)) {
          Logger.error(
            `Unknown package manager: ${detectedPackageManager.name}.`
          );
          return 1;
        }

        // Get command variant for the detected package manager
        const packageManagerKey = detectedPackageManager.name as PackageManager;
        const commandVariant = CommandMatching.remove[packageManagerKey];

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
        const output = parseContent(RemoveContent, {
          version,
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

        Logger.success(`Successfully removed package(s): ${args.join(", ")}`);
        return 0;
      } catch (error) {
        Logger.error("An unexpected error occurred", error);
        return 1;
      }
    },
  };
}
