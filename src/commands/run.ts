import { CommandMatching } from "../core/matching";
import { executePackageManagerCommand } from "../core/execution";
import { Logger } from "../utils/logger";

export function Command() {
    return {
        name: "run",
        description: "Run a script from package.json",
        aliases: [],
        execute: async (args: string[]) => {
            try {
                if (args.length === 0) {
                    Logger.error("No script specified. Please provide a script name.");
                    return 1;
                }

                const { DetectPackageManager } = await import(
                    "../core/detection"
                );

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
                    CommandMatching.run[
                    detectedPackageManager.name as keyof typeof CommandMatching.run
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

                return 0;
            } catch (error) {
                Logger.error("An unexpected error occurred", error);
                return 1;
            }
        },
    };
}
