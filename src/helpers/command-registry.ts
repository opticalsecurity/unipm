import { Command as HelpCommand } from "../commands/help";

export const commands = [
  HelpCommand(),
  // Add other commands here
];

export default async function GetCommands() {
  return commands.flatMap((command) => {
    return { name: command.name, description: command.description };
  });
}

export async function GetCommandByName(name: string) {
  const command = commands.find((cmd) => cmd.name === name);
  if (!command) {
    throw new Error(`Command ${name} not found`);
  }
  return command;
}

export async function ExecuteCommand(name: string, args: string[]) {
  const command = await GetCommandByName(name);
  if (command.execute) {
    return command.execute(args);
  } else {
    throw new Error(`Command ${name} does not have an execute function`);
  }
}
