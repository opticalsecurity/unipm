import {
  type DetectPackageManagerOutput,
  DetectionSource,
  Lockfiles,
  Lockfile,
  PackageManager,
} from "../types/package-managers";

/**
 * Detects the package manager used in the current project
 * @returns Information about the detected package manager
 */
export async function DetectPackageManager(): Promise<DetectPackageManagerOutput> {
  try {
    // Check if package.json exists
    const packageFile = Bun.file("package.json");

    if (!(await packageFile.exists())) {
      return {
        name: "none",
        version: null,
        detectionSource: DetectionSource.NOT_DETECTED,
        detectionHint: "No package.json file found",
      };
    }

    // Check if packageManager is specified in package.json
    const packageJson = await packageFile.json();
    const packageManager = packageJson.packageManager;

    if (packageManager) {
      const [name, version] = packageManager.split("@");
      return {
        name,
        version: version || null,
        detectionSource: DetectionSource.PACKAGE_JSON,
        detectionHint: `Found '${packageManager}' in package.json`,
      };
    }

    // Check lockfiles
    for (const lockfile of Lockfiles) {
      const lockfilePath = Bun.file(lockfile);
      if (await lockfilePath.exists()) {
        return await getPackageManagerFromLockfile(lockfile);
      }
    }

    // If no lockfile is found, try to detect by available commands
    const availablePackageManagers = await detectAvailablePackageManagers();
    if (availablePackageManagers.length > 0) {
      // Priority: bun > pnpm > yarn > npm
      const priorityOrder = [
        PackageManager.BUN,
        PackageManager.PNPM,
        PackageManager.YARN,
        PackageManager.NPM,
      ];
      for (const manager of priorityOrder) {
        const found = availablePackageManagers.find(
          (pm) => pm.name === manager
        );
        if (found) return found;
      }
      // Ensure availablePackageManagers[0] is not undefined
      if (availablePackageManagers[0]) {
        return availablePackageManagers[0];
      }
    }

    // If no package manager is found, return "none"
    return {
      name: "none",
      version: null,
      detectionSource: DetectionSource.NOT_DETECTED,
      detectionHint: "No package manager detected",
    };
  } catch (error) {
    console.error("Error detecting package manager:", error);
    return {
      name: "none",
      version: null,
      detectionSource: DetectionSource.NOT_DETECTED,
      detectionHint: `Error: ${error instanceof Error ? error.message : String(error)
        }`,
    };
  }
}

/**
 * Gets package manager information based on the lockfile
 */
async function getPackageManagerFromLockfile(
  lockfile: string
): Promise<DetectPackageManagerOutput> {
  switch (lockfile) {
    case Lockfile.NPM:
      return {
        name: PackageManager.NPM,
        version: await getPackageManagerVersion("npm"),
        detectionSource: DetectionSource.LOCKFILE,
        detectionHint: `Found ${lockfile}`,
      };
    case Lockfile.YARN:
      return {
        name: PackageManager.YARN,
        version: await getPackageManagerVersion("yarn"),
        detectionSource: DetectionSource.LOCKFILE,
        detectionHint: `Found ${lockfile}`,
      };
    case Lockfile.PNPM:
      return {
        name: PackageManager.PNPM,
        version: await getPackageManagerVersion("pnpm"),
        detectionSource: DetectionSource.LOCKFILE,
        detectionHint: `Found ${lockfile}`,
      };
    case Lockfile.BUN:
    case Lockfile.BUN_NOT_BINARY:
      return {
        name: PackageManager.BUN,
        version: await getPackageManagerVersion("bun"),
        detectionSource: DetectionSource.LOCKFILE,
        detectionHint: `Found ${lockfile}`,
      };
    default:
      return {
        name: "custom",
        version: null,
        detectionSource: DetectionSource.LOCKFILE,
        detectionHint: `Found custom lockfile: ${lockfile}`,
      };
  }
}

/**
 * Gets the version of a specific package manager
 */
async function getPackageManagerVersion(
  packageManager: string
): Promise<string | null> {
  try {
    const proc = Bun.spawn([packageManager, "--version"]);
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      return null;
    }

    const output = await new Response(proc.stdout).text();
    return output.includes(".") && output.trim() !== "" ? output.trim() : null;
  } catch (error) {
    return null;
  }
}

/**
 * Detects all available package managers in the system
 */
async function detectAvailablePackageManagers(): Promise<
  DetectPackageManagerOutput[]
> {
  const packageManagers = [
    PackageManager.NPM,
    PackageManager.YARN,
    PackageManager.PNPM,
    PackageManager.BUN,
  ];
  const results: DetectPackageManagerOutput[] = [];

  await Promise.all(
    packageManagers.map(async (pm) => {
      const version = await getPackageManagerVersion(pm);
      if (version) {
        results.push({
          name: pm,
          version,
          detectionSource: DetectionSource.COMMAND_AVAILABILITY,
          detectionHint: `Command '${pm}' is available in the system`,
        });
      }
    })
  );

  return results;
}
