/**
 * Command registry with single source of truth
 *
 * Each command file is the source of truth for its metadata.
 * The registry imports all commands once at startup to build the lookup tables.
 * This is fast enough for dev, and in compiled binaries Bun optimizes this anyway.
 */

import { Command as HelpCommand } from "../commands/help";
import { Command as DetectCommand } from "../commands/detect";
import { Command as AddCommand } from "../commands/add";
import { Command as RemoveCommand } from "../commands/remove";
import { Command as InstallCommand } from "../commands/install";
import { Command as UpdateCommand } from "../commands/update";
import { Command as RunCommand } from "../commands/run";
import { Command as ExecCommand } from "../commands/exec";
import { Command as UpdateSelfCommand } from "../commands/update-self";

// Command type definition
export interface CommandDefinition {
  name: string;
  description: string;
  aliases: string[];
  execute: (args: string[]) => Promise<number | void>;
}

// Single source of truth: command factory functions
// To add a new command: 1) Create the file, 2) Import here, 3) Add to this array
const commandFactories = [
  HelpCommand,
  DetectCommand,
  AddCommand,
  InstallCommand,
  RemoveCommand,
  UpdateCommand,
  RunCommand,
  ExecCommand,
  UpdateSelfCommand,
] as const;

// Initialize all commands once (metadata is cheap, execute functions are just references)
const allCommands: CommandDefinition[] = commandFactories.map((factory) =>
  factory()
);

// Build O(1) lookup maps
const commandByName = new Map<string, CommandDefinition>();
const commandByAlias = new Map<string, CommandDefinition>();

for (const cmd of allCommands) {
  commandByName.set(cmd.name, cmd);
  for (const alias of cmd.aliases) {
    commandByAlias.set(alias, cmd);
  }
}

/**
 * Get command metadata for display
 */
export const commands = allCommands.map((cmd) => ({
  name: cmd.name,
  description: cmd.description,
  aliases: cmd.aliases,
}));

export async function GetCommands() {
  return commands;
}

export async function GetCommandByName(
  nameOrAlias: string
): Promise<CommandDefinition> {
  const command =
    commandByName.get(nameOrAlias) ?? commandByAlias.get(nameOrAlias);

  if (!command) {
    throw new Error(`Command ${nameOrAlias} not found`);
  }

  return command;
}

export async function ExecuteCommand(
  nameOrAlias: string,
  args: string[]
): Promise<number | void> {
  const command = await GetCommandByName(nameOrAlias);
  return command.execute(args);
}

export async function CommandTableBuilder() {}
