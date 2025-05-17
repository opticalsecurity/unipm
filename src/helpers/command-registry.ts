import { Command as HelpCommand } from "../commands/help";
import { Command as DetectCommand } from "../commands/detect";
import { Command as AddCommand } from "../commands/add";

export const commands = [
  HelpCommand(),
  DetectCommand(),
  AddCommand(),
  // Add other commands here
];

export async function GetCommands() {
  return commands.flatMap((command) => {
    return {
      name: command.name,
      description: command.description,
      aliases: command.aliases || [],
    };
  });
}

export async function GetCommandByName(nameOrAlias: string) {
  const command = commands.find(
    (cmd) =>
      cmd.name === nameOrAlias ||
      (cmd.aliases && cmd.aliases.includes(nameOrAlias))
  );
  if (!command) {
    throw new Error(`Command ${nameOrAlias} not found`);
  }
  return command;
}

export async function ExecuteCommand(nameOrAlias: string, args: string[]) {
  const command = await GetCommandByName(nameOrAlias);
  if (command.execute) {
    return command.execute(args);
  } else {
    throw new Error(
      `Command ${command.name} does not have an execute function`
    );
  }
}

export async function CommandTableBuilder() {}
