export function Command() {
  return {
    name: "help",
    description: "Show help information",
    aliases: ["h", "?"],
    execute: async (args: string[]) => {
      const { parseContent } = await import("../helpers/content-parser");
      const { commands } = await import("../helpers/command-registry");
      const { HelpContent } = await import("./contents/help");
      const { version } = await import("../../package.json");

      const output = parseContent(HelpContent, {
        version,
        commandsTable: `${commands
          .map((command) => {
            const aliasesText =
              command.aliases && command.aliases.length
                ? ` (alias: ${command.aliases.join(", ")})`
                : "";
            return `- ${command.name}${aliasesText}: ${command.description}`;
          })
          .join("\n")}`,
      }); // TODO: Replace with actual table using cli-table package.

      console.log(output);
    },
  };
}
