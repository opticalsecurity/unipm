import { CommandMatching } from "../layers/command-matching";
import { executePackageManagerCommand } from "../layers/command-execution";
import { Logger } from "../helpers/logger";

export function Command() {
  return {
    name: "install",
    description: "Installs all project dependencies",
    aliases: ["i"],
    execute: async (args: string[]) => {
      try {
        if (args.length > 0) {
          Logger.error("This command does not accept any arguments.");
          return 1;
        }

        const { parseContent } = await import("../helpers/content-parser");
        const { InstallContent } = await import("./contents/install");
        const { DetectPackageManager } = await import(
          "../layers/package-manager-detection"
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

        // Get command variant for the detected package manager
        const commandVariant =
          CommandMatching.install[
            detectedPackageManager.name as keyof typeof CommandMatching.install
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
        const output = parseContent(InstallContent, {
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

        Logger.success(`Successfully added package(s): ${args.join(", ")}`);
        return 0;
      } catch (error) {
        Logger.error("An unexpected error occurred", error);
        return 1;
      }
    },
  };
}
