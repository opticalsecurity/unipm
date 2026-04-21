import { runPackageManagerCommand } from "../core/command-runner";

export function Command() {
  return {
    name: "install",
    description: "Installs all project dependencies",
    aliases: ["i"],
    execute: async (args: string[]): Promise<number> => {
      const result = await runPackageManagerCommand({
        commandType: args.length > 0 ? "add" : "install",
        args,
        successMessage:
          args.length > 0
            ? "Successfully added package(s): {packages}"
            : "Successfully installed dependencies",
      });

      return result.exitCode;
    },
  };
}
