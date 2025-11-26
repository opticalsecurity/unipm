import { CommandMatching } from "../core/matching";
import { DetectPackageManager } from "../core/detection";
import { executePackageManagerCommand } from "../core/execution";
import { Logger } from "../utils/logger";

export function Command() {
  return {
    name: "update",
    description: "Update dependencies",
    aliases: ["u"],
    execute: async (args: string[]): Promise<number> => {
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
          CommandMatching.update[
            detectedPackageManager.name as keyof typeof CommandMatching.update
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
        // We need to add UpdateContent to help-text.ts first, but for now we can use a generic message or wait.
        // Actually, let's check help-text.ts content first or just use a simple log if content is missing.
        // Assuming UpdateContent might not exist yet, let's check.
        // But wait, I can't check mid-execution easily without breaking flow.
        // I'll assume I need to add it to help-text.ts as well.
        // For now, I will use a placeholder or generic log if I can't import it.
        // Let's assume I will add it.

        // Wait, I should add UpdateContent to constants/help-text.ts as well.
        // I'll do that in a separate step. For now, I'll comment out the parseContent part or use a simple log.
        Logger.info(`Running: ${fullCommand}`);

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

        Logger.success("Dependencies updated successfully");
        return 0;
      } catch (error) {
        Logger.error("An unexpected error occurred", error);
        return 1;
      }
    },
  };
}
