import { runPackageManagerCommand } from "../core/command-runner";

export function Command() {
  return {
    name: "update",
    description: "Update dependencies",
    aliases: ["u"],
    execute: async (args: string[]): Promise<number> => {
      const result = await runPackageManagerCommand({
        commandType: "update",
        args,
        successMessage: "Dependencies updated successfully",
      });

      return result.exitCode;
    },
  };
}
