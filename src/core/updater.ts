/**
 * Updater core module - handles version checking, downloading, and self-updating
 */

import { existsSync, mkdirSync, renameSync, unlinkSync, chmodSync } from "fs";
import { join, dirname } from "path";
import { homedir, platform, arch } from "os";
import { spawn } from "child_process";
import {
  type UpdateInfo,
  type UpdateConfig,
  type UpdateCheckResult,
  DEFAULT_UPDATE_CONFIG,
} from "../types/updater";
import { type GithubCheckVersionResponse } from "../types/github-check-version";
import { Logger } from "../utils/logger";

const GITHUB_REPO = "opticalsecurity/unipm";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const CONFIG_DIR = join(homedir(), ".unipm");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const LAST_CHECK_FILE = join(CONFIG_DIR, "last-update-check");

/**
 * Get the current platform identifier for downloading the correct binary
 */
export function getPlatformIdentifier(): string {
  const os = platform();
  const architecture = arch();

  const osMap: Record<string, string> = {
    linux: "linux",
    darwin: "darwin",
    win32: "windows",
  };

  const archMap: Record<string, string> = {
    x64: "x64",
    arm64: "arm64",
  };

  const osName = osMap[os];
  const archName = archMap[architecture];

  if (!osName || !archName) {
    throw new Error(`Unsupported platform: ${os}-${architecture}`);
  }

  return `${osName}-${archName}`;
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  // Remove 'v' prefix if present
  const clean1 = v1.replace(/^v/, "");
  const clean2 = v2.replace(/^v/, "");

  const parts1 = clean1.split(".").map(Number);
  const parts2 = clean2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }

  return 0;
}

/**
 * Validate that a value matches the expected UpdateConfig schema
 */
function isValidConfig(value: unknown): value is Partial<UpdateConfig> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Validate each field if present
  if ("autoCheck" in obj && typeof obj.autoCheck !== "boolean") {
    return false;
  }
  if (
    "checkInterval" in obj &&
    (typeof obj.checkInterval !== "number" || obj.checkInterval < 1)
  ) {
    return false;
  }
  if ("autoDownload" in obj && typeof obj.autoDownload !== "boolean") {
    return false;
  }
  if (
    "showNotifications" in obj &&
    typeof obj.showNotifications !== "boolean"
  ) {
    return false;
  }

  return true;
}

/**
 * Load update configuration from disk
 */
export async function loadConfig(): Promise<UpdateConfig> {
  try {
    if (existsSync(CONFIG_FILE)) {
      const file = Bun.file(CONFIG_FILE);
      const rawConfig = await file.json();

      // Validate the config schema
      if (!isValidConfig(rawConfig)) {
        Logger.debug("Invalid config file schema, using defaults");
        return DEFAULT_UPDATE_CONFIG;
      }

      return { ...DEFAULT_UPDATE_CONFIG, ...rawConfig };
    }
  } catch (error) {
    Logger.debug(`Error loading config: ${(error as Error).message}`);
  }
  return DEFAULT_UPDATE_CONFIG;
}

/**
 * Save update configuration to disk
 */
export async function saveConfig(config: UpdateConfig): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
  // Set restrictive permissions on config file (owner read/write only)
  if (platform() !== "win32") {
    chmodSync(CONFIG_FILE, 0o600);
  }
}

/**
 * Check if enough time has passed since the last update check
 */
export async function shouldCheckForUpdate(): Promise<boolean> {
  const config = await loadConfig();

  if (!config.autoCheck) {
    return false;
  }

  try {
    if (existsSync(LAST_CHECK_FILE)) {
      const file = Bun.file(LAST_CHECK_FILE);
      const lastCheck = parseInt(await file.text(), 10);
      const hoursSinceCheck = (Date.now() - lastCheck) / (1000 * 60 * 60);
      return hoursSinceCheck >= config.checkInterval;
    }
  } catch {
    // If we can't read the file, check anyway
  }

  return true;
}

/**
 * Mark that we just checked for updates
 */
async function markUpdateChecked(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  await Bun.write(LAST_CHECK_FILE, Date.now().toString());
  // Set restrictive permissions (owner read/write only)
  if (platform() !== "win32") {
    chmodSync(LAST_CHECK_FILE, 0o600);
  }
}

/**
 * Fetch the latest release info from GitHub
 */
export async function fetchLatestRelease(): Promise<GithubCheckVersionResponse | null> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "unipm-updater",
      },
    });

    // Handle rate limiting
    if (response.status === 403 || response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const rateLimitReset = response.headers.get("x-ratelimit-reset");

      let waitMessage = "Rate limited by GitHub API.";
      if (retryAfter) {
        waitMessage += ` Try again in ${retryAfter} seconds.`;
      } else if (rateLimitReset) {
        const resetTime = new Date(parseInt(rateLimitReset, 10) * 1000);
        waitMessage += ` Resets at ${resetTime.toLocaleTimeString()}.`;
      }

      Logger.warn(waitMessage);
      return null;
    }

    if (!response.ok) {
      Logger.debug(`GitHub API returned status ${response.status}`);
      return null;
    }

    return (await response.json()) as GithubCheckVersionResponse;
  } catch (error) {
    Logger.debug(`Failed to fetch release info: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Find the download URL for the current platform from a release
 */
export function findAssetUrl(
  release: GithubCheckVersionResponse,
  platformId: string
): string | null {
  // Look for an asset that matches our platform
  // Asset names should be like: unipm-linux-x64, unipm-darwin-arm64, unipm-windows-x64.exe
  const asset = release.assets.find((a) => {
    const name = a.name.toLowerCase();
    return name.includes(platformId.toLowerCase()) && !name.endsWith(".sha256");
  });

  return asset?.browser_download_url ?? null;
}

/**
 * Find the SHA256 checksum URL for a given asset
 */
export function findChecksumUrl(
  release: GithubCheckVersionResponse,
  platformId: string
): string | null {
  const asset = release.assets.find((a) => {
    const name = a.name.toLowerCase();
    return name.includes(platformId.toLowerCase()) && name.endsWith(".sha256");
  });

  return asset?.browser_download_url ?? null;
}

/**
 * Calculate SHA256 hash of a file
 */
export async function calculateSHA256(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const buffer = await file.arrayBuffer();
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(new Uint8Array(buffer));
  return hasher.digest("hex");
}

/**
 * Fetch and parse checksum from a .sha256 file
 */
export async function fetchChecksum(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "unipm-updater",
      },
    });

    if (!response.ok) {
      Logger.debug(`Failed to fetch checksum: ${response.status}`);
      return null;
    }

    const text = await response.text();
    // Format is typically "hash  filename" or just "hash"
    const hash = text.trim().split(/\s+/)[0];
    return hash?.toLowerCase() ?? null;
  } catch (error) {
    Logger.debug(`Error fetching checksum: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Verify file integrity using SHA256 checksum
 */
export async function verifyChecksum(
  filePath: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const actualHash = await calculateSHA256(filePath);
    return actualHash.toLowerCase() === expectedHash.toLowerCase();
  } catch (error) {
    Logger.debug(`Checksum verification error: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Check for available updates
 */
export async function checkForUpdate(
  currentVersion: string
): Promise<UpdateCheckResult> {
  try {
    const release = await fetchLatestRelease();

    if (!release) {
      return {
        success: false,
        error: "Could not fetch release information",
      };
    }

    const latestVersion = release.tag_name;
    const hasUpdate = compareVersions(currentVersion, latestVersion) < 0;

    let downloadUrl: string | null = null;
    let checksumUrl: string | null = null;
    if (hasUpdate) {
      try {
        const platformId = getPlatformIdentifier();
        downloadUrl = findAssetUrl(release, platformId);
        checksumUrl = findChecksumUrl(release, platformId);
      } catch (error) {
        Logger.debug(`Platform detection error: ${(error as Error).message}`);
      }
    }

    await markUpdateChecked();

    return {
      success: true,
      info: {
        currentVersion,
        latestVersion,
        hasUpdate,
        downloadUrl,
        checksumUrl,
        releaseNotes: release.body,
        publishedAt: new Date(release.published_at),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Download a file from a URL to a destination path
 */
export async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "unipm-updater",
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const contentLength = parseInt(
      response.headers.get("content-length") || "0",
      10
    );
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error("Could not get response reader");
    }

    const chunks: Uint8Array[] = [];
    let downloaded = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      downloaded += value.length;

      if (onProgress && contentLength > 0) {
        onProgress(downloaded, contentLength);
      }
    }

    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    // Ensure directory exists
    const dir = dirname(destPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write to file
    await Bun.write(destPath, result);

    return true;
  } catch (error) {
    Logger.debug(`Download error: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Get the path to the current executable
 */
export function getCurrentExecutablePath(): string {
  return process.execPath;
}

/**
 * Perform the self-update by replacing the current binary
 */
export async function performUpdate(
  downloadUrl: string,
  checksumUrl?: string | null,
  onProgress?: (downloaded: number, total: number) => void
): Promise<boolean> {
  const currentPath = getCurrentExecutablePath();
  const tempPath = `${currentPath}.new`;
  const backupPath = `${currentPath}.backup`;

  Logger.info("Downloading update...");

  // Download new binary
  const downloaded = await downloadFile(downloadUrl, tempPath, onProgress);
  if (!downloaded) {
    Logger.error("Failed to download update");
    return false;
  }

  // Verify checksum if available
  if (checksumUrl) {
    Logger.info("Verifying download integrity...");
    const expectedHash = await fetchChecksum(checksumUrl);

    if (expectedHash) {
      const isValid = await verifyChecksum(tempPath, expectedHash);
      if (!isValid) {
        Logger.error(
          "Checksum verification failed! The download may be corrupted or tampered with."
        );
        try {
          unlinkSync(tempPath);
        } catch {
          // Ignore cleanup errors
        }
        return false;
      }
      Logger.success("Checksum verified");
    } else {
      Logger.warn(
        "Could not fetch checksum file, proceeding without verification"
      );
    }
  } else {
    Logger.warn("No checksum available for this release");
  }

  Logger.info("Installing update...");

  try {
    // On Unix, make the new binary executable
    if (platform() !== "win32") {
      chmodSync(tempPath, 0o755);
    }

    // Backup current binary
    if (existsSync(backupPath)) {
      unlinkSync(backupPath);
    }

    // On Windows, we can't replace a running executable directly
    // We need to use a different approach
    if (platform() === "win32") {
      return await performWindowsUpdate(currentPath, tempPath, backupPath);
    }

    // Unix: rename current to backup, new to current
    renameSync(currentPath, backupPath);
    renameSync(tempPath, currentPath);

    // Clean up backup
    try {
      unlinkSync(backupPath);
    } catch {
      // Ignore cleanup errors
    }

    Logger.success("Update installed successfully!");
    Logger.info("Please restart unipm to use the new version.");

    return true;
  } catch (error) {
    Logger.error(`Failed to install update: ${(error as Error).message}`);

    // Try to restore backup
    try {
      if (existsSync(backupPath) && !existsSync(currentPath)) {
        renameSync(backupPath, currentPath);
      }
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
      // Ignore restore errors
    }

    return false;
  }
}

/**
 * Windows-specific update process using a helper script
 */
async function performWindowsUpdate(
  currentPath: string,
  tempPath: string,
  backupPath: string
): Promise<boolean> {
  // Create a batch script that will:
  // 1. Wait for the current process to exit
  // 2. Replace the binary
  // 3. Clean up
  const scriptPath = join(CONFIG_DIR, "update.bat");

  const script = `
@echo off
timeout /t 2 /nobreak > nul
move /y "${currentPath}" "${backupPath}" > nul 2>&1
move /y "${tempPath}" "${currentPath}" > nul 2>&1
del "${backupPath}" > nul 2>&1
del "%~f0" > nul 2>&1
`;

  await Bun.write(scriptPath, script);

  // Start the update script detached
  spawn("cmd", ["/c", scriptPath], {
    detached: true,
    stdio: "ignore",
  }).unref();

  Logger.success("Update downloaded! The update will be installed on restart.");

  return true;
}

/**
 * Background update check that doesn't block the main process
 */
export async function backgroundUpdateCheck(
  currentVersion: string
): Promise<void> {
  const config = await loadConfig();

  if (!config.showNotifications) {
    return;
  }

  const shouldCheck = await shouldCheckForUpdate();
  if (!shouldCheck) {
    return;
  }

  // Run check in background without blocking
  checkForUpdate(currentVersion)
    .then((result) => {
      if (result.success && result.info?.hasUpdate) {
        console.log();
        Logger.info(
          `📦 Update available: ${result.info.currentVersion} → ${result.info.latestVersion}`
        );
        Logger.info(`   Run 'unipm update-self' to update`);
        console.log();
      }
    })
    .catch(() => {
      // Silently ignore background check errors
    });
}
