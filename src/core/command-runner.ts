/**
 * Package manager command runner with interactive switching support
 */

import chalk from "chalk";
import { DetectPackageManager } from "./detection";
import {
  executePackageManagerCommand,
  type CommandExecutionResult,
} from "./execution";
import { CommandMatching } from "./matching";
import {
  printSwitchHint,
  showPackageManagerSelector,
  getPackageManagerOverride,
  SWITCH_HOTKEY,
} from "./pm-selector";
import { getPreferredPackageManager, getRuntimeConfig } from "./config";
import {
  PackageManager,
  type DetectPackageManagerOutput,
  DetectionSource,
} from "../types/package-managers";
import { Logger } from "../utils/logger";

export type CommandType = keyof typeof CommandMatching;

export interface RunCommandOptions {
  /** The type of command (add, remove, install, etc.) */
  commandType: CommandType;
  /** Arguments to pass to the command */
  args: string[];
  /** Message template for success (use {packages} for args joined) */
  successMessage?: string;
  /** Whether to show the switch hint */
  showSwitchHint?: boolean;
}

export interface RunCommandResult {
  success: boolean;
  exitCode: number;
  switchedPM?: PackageManager;
  rerun?: boolean;
}

/**
 * Get the effective package manager (override or detected)
 */
export async function getEffectivePackageManager(): Promise<DetectPackageManagerOutput> {
  const override = getPackageManagerOverride();
  if (override) {
    return {
      name: override,
      version: null,
      detectionSource: DetectionSource.OVERRIDE,
      detectionHint: "Manually selected",
    };
  }

  const preferred = await getPreferredPackageManager();
  if (preferred.manager) {
    const detected = await DetectPackageManager();
    if (detected.name === preferred.manager) {
      return {
        ...detected,
        detectionSource: DetectionSource.CONFIG,
        detectionHint: preferred.path
          ? `Configured in ${preferred.path}`
          : "Configured in unipm.config.json",
      };
    }

    return {
      name: preferred.manager,
      version: null,
      detectionSource: DetectionSource.CONFIG,
      detectionHint: preferred.path
        ? `Configured in ${preferred.path}`
        : "Configured in unipm.config.json",
    };
  }

  return DetectPackageManager();
}

/**
 * Run a package manager command with the option to switch PM interactively
 */
export async function runPackageManagerCommand(
  options: RunCommandOptions
): Promise<RunCommandResult> {
  const { commandType, args, successMessage, showSwitchHint = true } = options;

  // Get effective package manager
  const pm = await getEffectivePackageManager();

  if (pm.name === "none") {
    Logger.error(
      "No package manager detected. Please run 'bun init' or 'bun install' to initialize the project."
    );
    return { success: false, exitCode: 1 };
  }

  // Get command for this PM
  const commandConfig = CommandMatching[commandType][pm.name as PackageManager];
  if (!commandConfig) {
    Logger.error(`Unsupported package manager: ${pm.name}.`);
    return { success: false, exitCode: 1 };
  }

  const command = commandConfig.command;
  const fullCommand =
    args.length > 0 ? `${command} ${args.join(" ")}` : command;

  const runtimeConfig = getRuntimeConfig();
  const canInteract = process.stdin.isTTY && !runtimeConfig.ci;

  // Show what we're about to do
  console.log(
    chalk.bold.cyan("🔍 Package manager: ") +
      chalk.reset(`${pm.name}${pm.version ? ` ${pm.version}` : ""}`)
  );
  console.log(chalk.bold.green("🗳  Running: ") + chalk.dim(fullCommand));
  console.log();

  // Show switch hint if TTY and enabled
  if (showSwitchHint && canInteract) {
    printSwitchHint(pm.name);
  }

  // Setup keypress listener for switch
  let switchRequested = false;
  let selectedPM: PackageManager | null = null;
  let keypressHandler: ((key: Buffer) => void) | null = null;

  if (canInteract) {
    process.stdin.setRawMode(true);
    process.stdin.resume();

    keypressHandler = async (key: Buffer) => {
      const char = key.toString().toLowerCase();

      // Ctrl+C
      if (key[0] === 3) {
        cleanup();
        process.exit(130);
      }

      // Switch hotkey
      if (char === SWITCH_HOTKEY && !switchRequested) {
        switchRequested = true;
        cleanup();

        console.log();
        Logger.warn(
          "Switching package manager... (current command will continue in background)"
        );

        selectedPM = await showPackageManagerSelector();
      }
    };

    process.stdin.on("data", keypressHandler);
  }

  const cleanup = () => {
    if (keypressHandler) {
      process.stdin.removeListener("data", keypressHandler);
    }
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  };

  // Execute the command
  let result: CommandExecutionResult;
  try {
    result = await executePackageManagerCommand(command, args);
  } finally {
    cleanup();
  }

  // If switch was requested, inform user
  if (switchRequested && selectedPM) {
    console.log();
    Logger.info(
      `Package manager switched to ${selectedPM}. Run the command again to use it.`
    );
    return {
      success: false,
      exitCode: 0,
      switchedPM: selectedPM,
      rerun: true,
    };
  }

  // Handle result
  if (!result.success) {
    if (result.error) {
      Logger.error(`Failed to execute command: ${fullCommand}`, result.error);
    } else {
      Logger.error(`Command failed with exit code ${result.exitCode}`);
    }
    return { success: false, exitCode: result.exitCode || 1 };
  }

  if (successMessage) {
    Logger.success(successMessage.replace("{packages}", args.join(", ")));
  }

  return { success: true, exitCode: 0 };
}
