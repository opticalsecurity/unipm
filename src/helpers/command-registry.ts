import { Command as HelpCommand } from "../commands/help";

export interface CommandDefinition {
  name: string;
  description: string;
  aliases?: string[];
  execute?: (args: string[]) => Promise<any>;
}

export const commands = [
  HelpCommand(),
  // Add other commands here
];

export default async function GetCommands() {
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
