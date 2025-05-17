export enum DetectionSource {
  PACKAGE_JSON = "package.json",
  LOCKFILE = "lockfile",
  COMMAND_AVAILABILITY = "command",
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
  CUSTOM = "custom.lock",
}

export const Lockfiles = [
  Lockfile.NPM,
  Lockfile.YARN,
  Lockfile.PNPM,
  Lockfile.BUN,
  Lockfile.BUN_NOT_BINARY,
];
