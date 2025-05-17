import { CommandVariants } from "../types/CommandMatching";

export function Command() {
  return {
    name: "add",
    description: "Add a package to the current project",
    aliases: ["a"],
    execute: async (args: string[]) => {
      const { parseContent } = await import("../helpers/content-parser");
      const { commands } = await import("../helpers/command-registry");
      const { AddContent } = await import("./contents/add");
      const { DetectPackageManager } = await import(
        "../helpers/detect-package-manager"
      );
      const { version } = await import("../../package.json");

      const detectedPackageManager = await DetectPackageManager();

      if (detectedPackageManager.name === "none") {
        console.error(
          "No package manager detected. Please run 'bun init' or 'bun install' to initialize the project."
        );
        return;
      }

      const command =
        CommandVariants.add[
          detectedPackageManager.name as keyof typeof CommandVariants.add
        ];

      const output = parseContent(AddContent, {
        version,
        packageManager: detectedPackageManager.name,
        packageManagerVersion: detectedPackageManager.version || "unknown",
        command: command.command,
      });

      console.log(output);
    },
  };
}
