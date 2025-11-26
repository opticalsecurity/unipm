import {
  type DetectPackageManagerOutput,
  DetectionSource,
  Lockfiles,
  Lockfile,
  PackageManager,
} from "../types/package-managers";

// Cache for detected package manager (valid for current process)
let cachedResult: DetectPackageManagerOutput | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10000; // 10 seconds

// Cache for package manager versions
const versionCache = new Map<string, string | null>();

/**
 * Clear the detection cache (useful for testing)
 */
export function clearDetectionCache(): void {
  cachedResult = null;
  cacheTimestamp = 0;
  versionCache.clear();
}

/**
 * Detects the package manager used in the current project
 * Results are cached for performance
 * @returns Information about the detected package manager
 */
export async function DetectPackageManager(): Promise<DetectPackageManagerOutput> {
  // Check cache
  const now = Date.now();
  if (cachedResult && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedResult;
  }

  try {
    const result = await detectPackageManagerInternal();
    cachedResult = result;
    cacheTimestamp = now;
    return result;
  } catch (error) {
    console.error("Error detecting package manager:", error);
    return {
      name: "none",
      version: null,
      detectionSource: DetectionSource.NOT_DETECTED,
      detectionHint: `Error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function detectPackageManagerInternal(): Promise<DetectPackageManagerOutput> {
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

  // Check lockfiles in parallel for speed
  const lockfileChecks = Lockfiles.map(async (lockfile) => {
    const exists = await Bun.file(lockfile).exists();
    return { lockfile, exists };
  });

  const lockfileResults = await Promise.all(lockfileChecks);
  const foundLockfile = lockfileResults.find((r) => r.exists);

  if (foundLockfile) {
    return await getPackageManagerFromLockfile(foundLockfile.lockfile);
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
      const found = availablePackageManagers.find((pm) => pm.name === manager);
      if (found) return found;
    }
    if (availablePackageManagers[0]) {
      return availablePackageManagers[0];
    }
  }

  return {
    name: "none",
    version: null,
    detectionSource: DetectionSource.NOT_DETECTED,
    detectionHint: "No package manager detected",
  };
}

/**
 * Gets package manager information based on the lockfile
 */
async function getPackageManagerFromLockfile(
  lockfile: string
): Promise<DetectPackageManagerOutput> {
  const lockfileToManager: Record<
    string,
    { pm: PackageManager; name: string }
  > = {
    [Lockfile.NPM]: { pm: PackageManager.NPM, name: "npm" },
    [Lockfile.YARN]: { pm: PackageManager.YARN, name: "yarn" },
    [Lockfile.PNPM]: { pm: PackageManager.PNPM, name: "pnpm" },
    [Lockfile.BUN]: { pm: PackageManager.BUN, name: "bun" },
    [Lockfile.BUN_NOT_BINARY]: { pm: PackageManager.BUN, name: "bun" },
  };

  const mapping = lockfileToManager[lockfile];
  if (mapping) {
    return {
      name: mapping.pm,
      version: await getPackageManagerVersion(mapping.name),
      detectionSource: DetectionSource.LOCKFILE,
      detectionHint: `Found ${lockfile}`,
    };
  }

  return {
    name: "custom",
    version: null,
    detectionSource: DetectionSource.LOCKFILE,
    detectionHint: `Found custom lockfile: ${lockfile}`,
  };
}

/**
 * Gets the version of a specific package manager (cached)
 */
async function getPackageManagerVersion(
  packageManager: string
): Promise<string | null> {
  // Check cache first
  if (versionCache.has(packageManager)) {
    return versionCache.get(packageManager) ?? null;
  }

  try {
    const proc = Bun.spawn([packageManager, "--version"], {
      stdout: "pipe",
      stderr: "ignore",
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      versionCache.set(packageManager, null);
      return null;
    }

    const output = await new Response(proc.stdout).text();
    const version =
      output.includes(".") && output.trim() !== "" ? output.trim() : null;
    versionCache.set(packageManager, version);
    return version;
  } catch {
    versionCache.set(packageManager, null);
    return null;
  }
}

/**
 * Detects all available package managers in the system (parallel)
 */
async function detectAvailablePackageManagers(): Promise<
  DetectPackageManagerOutput[]
> {
  const packageManagers = [
    PackageManager.BUN, // Check bun first as it's likely fastest
    PackageManager.PNPM,
    PackageManager.YARN,
    PackageManager.NPM,
  ];

  // Check all in parallel
  const checks = packageManagers.map(async (pm) => {
    const version = await getPackageManagerVersion(pm);
    if (version) {
      return {
        name: pm,
        version,
        detectionSource: DetectionSource.COMMAND_AVAILABILITY,
        detectionHint: `Command '${pm}' is available in the system`,
      } as DetectPackageManagerOutput;
    }
    return null;
  });

  const results = await Promise.all(checks);
  return results.filter((r): r is DetectPackageManagerOutput => r !== null);
}
