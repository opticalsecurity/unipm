/**
 * Interactive package manager selector
 * Allows users to override the detected package manager
 */

import chalk from "chalk";
import { PackageManager } from "../types/package-managers";
import { Logger } from "../utils/logger";

// Available package managers for selection
const PACKAGE_MANAGERS = [
  { key: "1", name: PackageManager.BUN, label: "bun" },
  { key: "2", name: PackageManager.PNPM, label: "pnpm" },
  { key: "3", name: PackageManager.YARN, label: "yarn" },
  { key: "4", name: PackageManager.NPM, label: "npm" },
  { key: "5", name: PackageManager.DENO, label: "deno" },
] as const;

// The hotkey to trigger the selector
export const SWITCH_HOTKEY = "s";

// Timeout for interactive input (30 seconds)
const INPUT_TIMEOUT_MS = 30000;

// Store for the override (persists during the command execution)
let pmOverride: PackageManager | null = null;

/**
 * Get the current package manager override
 */
export function getPackageManagerOverride(): PackageManager | null {
  return pmOverride;
}

/**
 * Clear the package manager override
 */
export function clearPackageManagerOverride(): void {
  pmOverride = null;
}

/**
 * Print the "wrong command?" hint message
 */
export function printSwitchHint(detectedPM: string): void {
  console.log(
    chalk.dim(
      `Press [${chalk.yellow(
        SWITCH_HOTKEY
      )}] to switch package manager (will cancel current command)`
    )
  );
  console.log();
}

/**
 * Show the package manager selector and wait for user choice
 * Returns the selected package manager or null if cancelled/timed out
 */
export async function showPackageManagerSelector(): Promise<PackageManager | null> {
  return new Promise((resolve) => {
    console.log();
    console.log(chalk.bold.yellow("⚠  Switching package manager"));
    console.log(
      chalk.dim(
        "Warning: This will kill the current process. Switching mid-operation may corrupt node_modules."
      )
    );
    console.log();
    console.log(chalk.bold("Select package manager:"));
    console.log();

    for (const pm of PACKAGE_MANAGERS) {
      console.log(`  ${chalk.cyan(pm.key)}) ${pm.label}`);
    }
    console.log(`  ${chalk.dim("c)")} Cancel`);
    console.log();
    console.log(chalk.dim(`(auto-cancel in ${INPUT_TIMEOUT_MS / 1000}s)`));
    console.log();

    process.stdout.write(chalk.bold("Choice: "));

    // Set raw mode to capture single keypress
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    // Setup timeout for security - don't wait forever for input
    const timeoutId = setTimeout(() => {
      cleanup();
      console.log();
      console.log();
      Logger.warn("Input timed out, cancelled");
      resolve(null);
    }, INPUT_TIMEOUT_MS);

    const onKeypress = (key: Buffer) => {
      const char = key.toString().toLowerCase();

      // Handle Ctrl+C
      if (key[0] === 3) {
        cleanup();
        console.log();
        resolve(null);
        return;
      }

      // Check if it's a valid choice
      const selected = PACKAGE_MANAGERS.find((pm) => pm.key === char);
      if (selected) {
        cleanup();
        console.log(selected.label);
        console.log();
        Logger.success(`Switched to ${selected.label}`);
        pmOverride = selected.name;
        resolve(selected.name);
        return;
      }

      // Cancel
      if (char === "c" || char === "\r" || char === "\n") {
        cleanup();
        console.log("cancel");
        console.log();
        Logger.info("Cancelled");
        resolve(null);
        return;
      }
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      process.stdin.removeListener("data", onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on("data", onKeypress);
  });
}

/**
 * Setup a listener for the switch hotkey during command execution
 * Returns a cleanup function and a promise that resolves if switch is requested
 */
export function setupSwitchListener(): {
  cleanup: () => void;
  switchRequested: Promise<PackageManager | null>;
} {
  let resolveSwitch: (pm: PackageManager | null) => void;
  const switchRequested = new Promise<PackageManager | null>((resolve) => {
    resolveSwitch = resolve;
  });

  // Don't setup listener if not a TTY
  if (!process.stdin.isTTY) {
    return {
      cleanup: () => {},
      switchRequested: new Promise(() => {}), // Never resolves
    };
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();

  const onKeypress = async (key: Buffer) => {
    const char = key.toString().toLowerCase();

    // Check for switch hotkey
    if (char === SWITCH_HOTKEY) {
      cleanup();
      const selected = await showPackageManagerSelector();
      resolveSwitch(selected);
    }

    // Handle Ctrl+C - let it propagate naturally
    if (key[0] === 3) {
      cleanup();
      process.exit(130);
    }
  };

  const cleanup = () => {
    process.stdin.removeListener("data", onKeypress);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  };

  process.stdin.on("data", onKeypress);

  return { cleanup, switchRequested };
}

/**
 * Execute a command with the switch listener active
 * If user presses the switch key, kills the process and returns the new PM choice
 */
export interface ExecuteWithSwitchResult {
  completed: boolean;
  switchedTo?: PackageManager;
  exitCode?: number;
}

export async function executeWithSwitchOption(
  runCommand: () => Promise<{ success: boolean; exitCode: number | null }>,
  onKill?: () => void
): Promise<ExecuteWithSwitchResult> {
  const { cleanup, switchRequested } = setupSwitchListener();

  try {
    // Race between command completion and switch request
    const result = await Promise.race([
      runCommand().then((r) => ({ type: "completed" as const, result: r })),
      switchRequested.then((pm) => ({ type: "switch" as const, pm })),
    ]);

    cleanup();

    if (result.type === "switch") {
      if (onKill) onKill();
      if (result.pm) {
        return { completed: false, switchedTo: result.pm };
      }
      return { completed: false };
    }

    return {
      completed: true,
      exitCode: result.result.exitCode ?? undefined,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
