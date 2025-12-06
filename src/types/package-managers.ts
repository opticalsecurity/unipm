/*
  Main enum and types for package managers
  - PackageManager: Enum for package managers
  - PackageManagers: Array of package managers

  PackageManager lets you identify any package manager compatible and make sure every TypeScript file
  knows what you are talking about. For example, instead of returning "npm" as a string, you can return PackageManager.NPM, which is a type-safe way to handle package managers.
*/

export enum PackageManager {
  BUN = "bun",
  DENO = "deno",
  PNPM = "pnpm",
  YARN = "yarn",
  NPM = "npm",
}

export const PackageManagers = [
  PackageManager.BUN,
  PackageManager.DENO,
  PackageManager.PNPM,
  PackageManager.YARN,
  PackageManager.NPM,
];

/*
  Package manager detection sources
  - package.json: The package manager is detected from the package.json file.
  - lockfile: The package manager is detected from the lockfile.
  - command: The package manager is detected from the availability of a command.
  - not detected: The package manager is not detected.
*/

export enum DetectionSource {
  PACKAGE_JSON = "package.json",
  LOCKFILE = "lockfile",
  COMMAND_AVAILABILITY = "command",
  CONFIG = "config",
  OVERRIDE = "override",
  NOT_DETECTED = "not detected",
}

export type DetectPackageManagerOutput = {
  name: string;
  version: string | null;
  detectionSource: DetectionSource;
  detectionHint: string;
};

export enum Lockfile {
  NPM = "package-lock.json",
  YARN = "yarn.lock",
  PNPM = "pnpm-lock.yaml",
  BUN = "bun.lockb",
  BUN_NOT_BINARY = "bun.lock",
  DENO = "deno.lock",
  CUSTOM = "custom.lock",
}

export const Lockfiles = [
  Lockfile.NPM,
  Lockfile.YARN,
  Lockfile.PNPM,
  Lockfile.BUN,
  Lockfile.BUN_NOT_BINARY,
  Lockfile.DENO,
];
