/**
 * update-self command - Updates unipm to the latest version
 */

import { Logger } from "../utils/logger";
import {
  checkForUpdate,
  performUpdate,
  loadConfig,
  saveConfig,
  getPlatformIdentifier,
} from "../core/updater";
import { DEFAULT_UPDATE_CONFIG } from "../types/updater";

export function Command() {
  return {
    name: "update-self",
    description: "Update unipm to the latest version",
    aliases: ["self-update", "upgrade-self"],
    execute: async (args: string[]) => {
      const { version } = await import("../../package.json");

      // Handle subcommands
      if (args[0] === "config") {
        return handleConfig(args.slice(1));
      }

      if (args[0] === "check") {
        return handleCheck(version);
      }

      // Default: perform update
      return handleUpdate(version, args.includes("--force"));
    },
  };
}

async function handleCheck(currentVersion: string): Promise<void> {
  Logger.info("Checking for updates...");

  const result = await checkForUpdate(currentVersion);

  if (!result.success) {
    Logger.error(`Failed to check for updates: ${result.error}`);
    return;
  }

  const info = result.info!;

  console.log();
  console.log(`  Current version: ${info.currentVersion}`);
  console.log(`  Latest version:  ${info.latestVersion}`);
  console.log();

  if (info.hasUpdate) {
    Logger.success("Update available!");

    if (info.downloadUrl) {
      console.log(`  Download URL: ${info.downloadUrl}`);
    } else {
      try {
        const platform = getPlatformIdentifier();
        Logger.warn(`No binary available for your platform (${platform})`);
      } catch {
        Logger.warn("Could not determine your platform");
      }
    }

    if (info.releaseNotes) {
      console.log();
      console.log("  Release notes:");
      console.log(
        info.releaseNotes
          .split("\n")
          .map((line) => `    ${line}`)
          .join("\n")
      );
    }

    console.log();
    Logger.info("Run 'unipm update-self' to install the update");
  } else {
    Logger.success("You're running the latest version!");
  }
}

async function handleUpdate(
  currentVersion: string,
  force: boolean
): Promise<void> {
  Logger.info("Checking for updates...");

  const result = await checkForUpdate(currentVersion);

  if (!result.success) {
    Logger.error(`Failed to check for updates: ${result.error}`);
    return;
  }

  const info = result.info!;

  if (!info.hasUpdate && !force) {
    Logger.success(
      `You're already on the latest version (${info.currentVersion})`
    );
    return;
  }

  if (!info.downloadUrl) {
    try {
      const platform = getPlatformIdentifier();
      Logger.error(`No binary available for your platform (${platform})`);
      Logger.info("You may need to build from source.");
    } catch (e) {
      Logger.error(`Could not determine platform: ${(e as Error).message}`);
    }
    return;
  }

  console.log();
  console.log(`  Updating: ${info.currentVersion} → ${info.latestVersion}`);
  console.log();

  const success = await performUpdate(info.downloadUrl, (downloaded, total) => {
    const percent = Math.round((downloaded / total) * 100);
    const mb = (downloaded / 1024 / 1024).toFixed(1);
    const totalMb = (total / 1024 / 1024).toFixed(1);
    process.stdout.write(
      `\r  Downloading: ${mb}MB / ${totalMb}MB (${percent}%)`
    );
  });

  console.log(); // New line after progress

  if (success) {
    Logger.success("Update complete!");
  } else {
    Logger.error("Update failed. Please try again or update manually.");
  }
}

async function handleConfig(args: string[]): Promise<void> {
  const config = await loadConfig();

  if (args.length === 0) {
    // Show current config
    console.log();
    console.log("  Update configuration:");
    console.log(`    Auto-check:         ${config.autoCheck}`);
    console.log(`    Check interval:     ${config.checkInterval} hours`);
    console.log(`    Auto-download:      ${config.autoDownload}`);
    console.log(`    Show notifications: ${config.showNotifications}`);
    console.log();
    console.log("  Usage:");
    console.log("    unipm update-self config <key> <value>");
    console.log("    unipm update-self config reset");
    console.log();
    return;
  }

  if (args[0] === "reset") {
    await saveConfig(DEFAULT_UPDATE_CONFIG);
    Logger.success("Configuration reset to defaults");
    return;
  }

  const [key, value] = args;

  if (!key || value === undefined) {
    Logger.error("Usage: unipm update-self config <key> <value>");
    return;
  }

  type ConfigKey = keyof typeof config;
  const validKeys: ConfigKey[] = [
    "autoCheck",
    "checkInterval",
    "autoDownload",
    "showNotifications",
  ];

  if (!validKeys.includes(key as ConfigKey)) {
    Logger.error(`Invalid config key: ${key}`);
    Logger.info(`Valid keys: ${validKeys.join(", ")}`);
    return;
  }

  // Parse value based on key type
  const typedKey = key as ConfigKey;

  if (typedKey === "checkInterval") {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 1) {
      Logger.error("Check interval must be a positive number (hours)");
      return;
    }
    config.checkInterval = numValue;
  } else {
    // Boolean values
    const boolValue = value.toLowerCase() === "true" || value === "1";
    (config as unknown as Record<string, boolean | number>)[typedKey] =
      boolValue;
  }

  await saveConfig(config);
  Logger.success(`Configuration updated: ${key} = ${value}`);
}
