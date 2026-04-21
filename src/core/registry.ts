/**
 * Command registry with lazy command loading.
 *
 * Metadata stays in this file so common startup paths don't need to import every
 * command implementation, especially heavier branches like self-update.
 */

// Command type definition
export interface CommandDefinition {
  name: string;
  description: string;
  aliases: string[];
  execute: (args: string[]) => Promise<number | void>;
}

type CommandModule = { Command: () => CommandDefinition };

interface CommandMetadata {
  name: string;
  description: string;
  aliases: string[];
  load: () => Promise<CommandModule>;
}

const commandTable: CommandMetadata[] = [
  {
    name: "help",
    description: "Show help information",
    aliases: ["h", "?"],
    load: () => import("../commands/help"),
  },
  {
    name: "detect",
    description: "Show the current project package manager",
    aliases: ["d"],
    load: () => import("../commands/detect"),
  },
  {
    name: "add",
    description: "Add a package to the current project",
    aliases: ["a"],
    load: () => import("../commands/add"),
  },
  {
    name: "install",
    description: "Installs all project dependencies",
    aliases: ["i"],
    load: () => import("../commands/install"),
  },
  {
    name: "remove",
    description: "Remove a package from the current project",
    aliases: ["rm", "r"],
    load: () => import("../commands/remove"),
  },
  {
    name: "update",
    description: "Update dependencies",
    aliases: ["u"],
    load: () => import("../commands/update"),
  },
  {
    name: "run",
    description: "Run a script from package.json",
    aliases: [],
    load: () => import("../commands/run"),
  },
  {
    name: "exec",
    description: "Run a command using the package manager",
    aliases: ["x"],
    load: () => import("../commands/exec"),
  },
  {
    name: "update-self",
    description: "Update unipm to the latest version",
    aliases: ["self-update", "upgrade-self"],
    load: () => import("../commands/update-self"),
  },
  {
    name: "set-alias",
    description: "Create a shell alias for unipm",
    aliases: ["alias"],
    load: () => import("../commands/set-alias"),
  },
] as const;

const commandCache = new Map<string, CommandDefinition>();

// Build O(1) lookup maps
const commandByName = new Map<string, CommandMetadata>();
const commandByAlias = new Map<string, CommandMetadata>();

for (const cmd of commandTable) {
  commandByName.set(cmd.name, cmd);
  for (const alias of cmd.aliases) {
    commandByAlias.set(alias, cmd);
  }
}

/**
 * Get command metadata for display
 */
export const commands = commandTable.map((cmd) => ({
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
  const metadata =
    commandByName.get(nameOrAlias) ?? commandByAlias.get(nameOrAlias);

  if (!metadata) {
    throw new Error(`Command ${nameOrAlias} not found`);
  }

  const cached = commandCache.get(metadata.name);
  if (cached) {
    return cached;
  }

  const module = await metadata.load();
  const command = module.Command();
  commandCache.set(metadata.name, command);
  return command;
}

export async function ExecuteCommand(
  nameOrAlias: string,
  args: string[]
): Promise<number | void> {
  const command = await GetCommandByName(nameOrAlias);
  return command.execute(args);
}
