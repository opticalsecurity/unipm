import { commands } from "../core/registry";
import { parseContent } from "../utils/parser";
import { HelpContent } from "../constants/help-text";

export function Command() {
  return {
    name: "help",
    description: "Show help information",
    aliases: ["h", "?"],
    execute: async (_args: string[]): Promise<void> => {
      const output = parseContent(HelpContent, {
        commandsTable: commands
          .map((command) => {
            const aliasesText =
              command.aliases && command.aliases.length
                ? ` (alias: ${command.aliases.join(", ")})`
                : "";
            return `- ${command.name}${aliasesText}: ${command.description}`;
          })
          .join("\n"),
      });

      console.log(output);
    },
  };
}
