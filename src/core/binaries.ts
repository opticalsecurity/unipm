import { existsSync, realpathSync } from "fs";
import { delimiter, basename, dirname, join, sep } from "path";
import { homedir } from "os";

const WINDOWS_EXECUTABLE_SUFFIXES = [".exe", ".cmd", ".bat", ".ps1"];

const COMMON_BINARY_PATHS: Record<string, string[]> = {
  bun: [
    join(homedir(), ".bun", "bin", "bun"),
    join(homedir(), ".local", "bin", "bun"),
    "/usr/local/bin/bun",
    "/usr/bin/bun",
  ],
  bunx: [
    join(homedir(), ".bun", "bin", "bunx"),
    join(homedir(), ".local", "bin", "bunx"),
    "/usr/local/bin/bunx",
    "/usr/bin/bunx",
  ],
};

const binaryResolutionCache = new Map<string, string | null>();
let cacheSignature = "";

export interface ResolveBinaryOptions {
  excludeSelf?: boolean;
}

function hasPathSeparator(value: string): boolean {
  return value.includes("/") || value.includes("\\") || value.includes(sep);
}

function getCurrentCacheSignature(): string {
  return `${process.execPath}\0${process.env.PATH ?? ""}`;
}

function ensureFreshBinaryCache(): void {
  const nextSignature = getCurrentCacheSignature();
  if (nextSignature !== cacheSignature) {
    binaryResolutionCache.clear();
    cacheSignature = nextSignature;
  }
}

function commandCandidates(command: string): string[] {
  if (process.platform !== "win32") {
    return [command];
  }

  const lower = command.toLowerCase();
  if (WINDOWS_EXECUTABLE_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
    return [command];
  }

  return [
    command,
    `${command}.exe`,
    `${command}.cmd`,
    `${command}.bat`,
    `${command}.ps1`,
  ];
}

function normalizeCommonBinaryPath(path: string): string {
  if (process.platform !== "win32") {
    return path;
  }

  const lower = path.toLowerCase();
  if (WINDOWS_EXECUTABLE_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
    return path;
  }

  return `${path}.exe`;
}

function isSelfBinary(path: string): boolean {
  try {
    return realpathSync(path) === realpathSync(process.execPath);
  } catch {
    return false;
  }
}

function shouldSkipCandidate(
  path: string,
  options: ResolveBinaryOptions
): boolean {
  if (!existsSync(path)) {
    return true;
  }

  if (options.excludeSelf && isSelfBinary(path)) {
    return true;
  }

  return false;
}

function resolveFromPath(
  command: string,
  options: ResolveBinaryOptions
): string | null {
  const pathEntries = (process.env.PATH || "").split(delimiter);

  for (const entry of pathEntries) {
    if (!entry) {
      continue;
    }

    for (const candidate of commandCandidates(command)) {
      const fullPath = join(entry, candidate);
      if (!shouldSkipCandidate(fullPath, options)) {
        return fullPath;
      }
    }
  }

  return null;
}

function resolveSiblingBun(
  command: string,
  options: ResolveBinaryOptions
): string | null {
  if (command !== "bun") {
    return null;
  }

  const bunxPath = Bun.which("bunx");
  if (!bunxPath) {
    return null;
  }

  const candidate = normalizeCommonBinaryPath(join(dirname(bunxPath), "bun"));
  return shouldSkipCandidate(candidate, options) ? null : candidate;
}

export function stripExecutableExtension(binaryName: string): string {
  const lower = binaryName.toLowerCase();
  for (const suffix of WINDOWS_EXECUTABLE_SUFFIXES) {
    if (lower.endsWith(suffix)) {
      return binaryName.slice(0, -suffix.length);
    }
  }

  return binaryName;
}

export function normalizeBinaryName(binaryName: string): string {
  return stripExecutableExtension(basename(binaryName)).toLowerCase();
}

export function resolveBinary(
  command: string,
  options: ResolveBinaryOptions = {}
): string | null {
  ensureFreshBinaryCache();

  if (!command) {
    return null;
  }

  const cacheKey = `${options.excludeSelf ? "1" : "0"}:${command}`;
  const cached = binaryResolutionCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  if (hasPathSeparator(command)) {
    const resolved = shouldSkipCandidate(command, options) ? null : command;
    binaryResolutionCache.set(cacheKey, resolved);
    return resolved;
  }

  const fromPath = resolveFromPath(command, options);
  if (fromPath) {
    binaryResolutionCache.set(cacheKey, fromPath);
    return fromPath;
  }

  const commonPaths = COMMON_BINARY_PATHS[command] ?? [];
  for (const path of commonPaths) {
    const normalizedPath = normalizeCommonBinaryPath(path);
    if (!shouldSkipCandidate(normalizedPath, options)) {
      binaryResolutionCache.set(cacheKey, normalizedPath);
      return normalizedPath;
    }
  }

  const resolved = resolveSiblingBun(command, options);
  binaryResolutionCache.set(cacheKey, resolved);
  return resolved;
}

export function resolveCommandPath(command: string): string {
  const resolved = resolveBinary(command);
  return resolved ?? command;
}

export function isSelfReferentialBinary(command: string): boolean {
  const resolved = resolveBinary(command);
  if (!resolved) {
    return false;
  }

  return isSelfBinary(resolved);
}

export function clearBinaryResolutionCache(): void {
  binaryResolutionCache.clear();
  cacheSignature = "";
}
