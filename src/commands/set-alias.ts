import { Logger } from "../utils/logger";
import { parseContent } from "../utils/parser";
import {
  SetAliasContent,
  SetAliasSuccessContent,
} from "../constants/help-text";
import { homedir, platform } from "os";
import { join, dirname } from "path";

const isWindows = platform() === "win32";

export function Command() {
  return {
    name: "set-alias",
    description: "Create a shell alias for unipm",
    aliases: ["alias"],
    execute: async (args: string[]): Promise<number> => {
      const aliasName = args[0];
      if (!aliasName) {
        Logger.error("No alias name provided.");
        Logger.info("Usage: unipm set-alias <alias-name>");
        Logger.info("Example: unipm set-alias upm");
        return 1;
      }

      // Validate alias name (only alphanumeric and dashes/underscores)
      if (!/^[a-zA-Z0-9_-]+$/.test(aliasName)) {
        Logger.error(
          "Invalid alias name. Use only letters, numbers, dashes, and underscores."
        );
        return 1;
      }

      // Prevent overwriting unipm itself
      if (
        aliasName === "unipm" ||
        (isWindows && aliasName.toLowerCase() === "unipm")
      ) {
        Logger.error("Cannot create an alias with the same name as unipm.");
        return 1;
      }

      const output = parseContent(SetAliasContent, {
        aliasName,
      });
      console.log(output);

      // Find the unipm binary location
      const unipmPath = await findUnipmBinary();
      if (!unipmPath) {
        Logger.error("Could not locate the unipm binary.");
        Logger.info(
          "Make sure unipm is installed and accessible in your PATH."
        );
        return 1;
      }

      // Determine install directory (same as unipm location)
      const installDir = dirname(unipmPath);
      const aliasFileName = isWindows ? `${aliasName}.exe` : aliasName;
      const aliasPath = join(installDir, aliasFileName);

      // Check if alias already exists
      const aliasFile = Bun.file(aliasPath);
      if (await aliasFile.exists()) {
        Logger.warn(`A file already exists at ${aliasPath}`);
        Logger.info("Remove it first if you want to create this alias.");
        return 1;
      }

      // Create alias (symlink on Unix, copy on Windows)
      try {
        const success = await createAlias(unipmPath, aliasPath);
        if (!success) {
          return 1;
        }

        const successOutput = parseContent(SetAliasSuccessContent, {
          aliasName,
          aliasPath,
          unipmPath,
        });
        console.log(successOutput);

        return 0;
      } catch (error) {
        Logger.error(`Failed to create alias: ${error}`);
        return 1;
      }
    },
  };
}

/**
 * Create an alias for the unipm binary
 * On Unix: creates a symlink
 * On Windows: copies the executable (symlinks require admin privileges)
 */
async function createAlias(
  sourcePath: string,
  aliasPath: string
): Promise<boolean> {
  if (isWindows) {
    return createWindowsAlias(sourcePath, aliasPath);
  } else {
    return createUnixSymlink(sourcePath, aliasPath);
  }
}

/**
 * Create a symlink on Unix systems (Linux/macOS)
 */
async function createUnixSymlink(
  sourcePath: string,
  aliasPath: string
): Promise<boolean> {
  try {
    const { exited } = Bun.spawn(["ln", "-s", sourcePath, aliasPath], {
      stdout: "inherit",
      stderr: "inherit",
    });

    const exitCode = await exited;
    if (exitCode !== 0) {
      Logger.error("Failed to create symlink.");
      return false;
    }
    return true;
  } catch (error) {
    Logger.error(`Failed to create symlink: ${error}`);
    return false;
  }
}

/**
 * Create an alias on Windows by copying the executable
 * Windows symlinks require admin privileges, so we copy instead
 */
async function createWindowsAlias(
  sourcePath: string,
  aliasPath: string
): Promise<boolean> {
  try {
    // Try to create a symlink first (works if running as admin or in developer mode)
    const { exited: symlinkExited } = Bun.spawn(
      ["cmd", "/c", "mklink", aliasPath, sourcePath],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const symlinkExitCode = await symlinkExited;
    if (symlinkExitCode === 0) {
      return true;
    }

    // Fallback: copy the file
    Logger.info(
      "Creating alias by copying executable (symlinks require admin privileges on Windows)..."
    );
    const { exited } = Bun.spawn(
      ["cmd", "/c", "copy", "/Y", sourcePath, aliasPath],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const exitCode = await exited;
    if (exitCode !== 0) {
      Logger.error("Failed to create alias. Try running as administrator.");
      return false;
    }
    return true;
  } catch (error) {
    Logger.error(`Failed to create alias: ${error}`);
    return false;
  }
}

/**
 * Find the location of the unipm binary
 */
export async function findUnipmBinary(): Promise<string | null> {
  // First, check if we're running from a compiled binary
  const execPath = process.execPath;
  if (execPath && !execPath.includes("bun")) {
    // Running as compiled binary
    return execPath;
  }

  // Try common install locations based on platform
  const possiblePaths = isWindows
    ? [
        join(homedir(), ".local", "bin", "unipm.exe"),
        join(homedir(), "AppData", "Local", "unipm", "unipm.exe"),
        join(process.env.LOCALAPPDATA || "", "unipm", "unipm.exe"),
        "C:\\Program Files\\unipm\\unipm.exe",
      ].filter(Boolean)
    : [
        join(homedir(), ".local", "bin", "unipm"),
        "/usr/local/bin/unipm",
        "/usr/bin/unipm",
      ];

  for (const path of possiblePaths) {
    const file = Bun.file(path);
    if (await file.exists()) {
      return path;
    }
  }

  // Try using 'which' (Unix) or 'where' (Windows) command
  try {
    const findCommand = isWindows ? ["where", "unipm"] : ["which", "unipm"];
    const proc = Bun.spawn(findCommand, {
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode === 0 && output.trim()) {
      // 'where' on Windows can return multiple lines, take the first one
      const firstLine = output.trim().split(/\r?\n/)[0];
      return firstLine ?? null;
    }
  } catch {
    // Ignore errors from 'which'/'where'
  }

  return null;
}

// Export for testing
export { createAlias, createUnixSymlink, createWindowsAlias, isWindows };
