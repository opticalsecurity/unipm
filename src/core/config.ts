import chalk from "chalk";
import { existsSync } from "fs";
import { join } from "path";
import { PackageManager, PackageManagers } from "../types/package-managers";
import { Logger } from "../utils/logger";

export const PROJECT_CONFIG_FILENAME = "unipm.config.json";

export interface UnipmProjectConfig {
  preferredPackageManager?: PackageManager;
  debug?: boolean;
  colors?: boolean;
  ci?: boolean;
}

export interface ResolvedRuntimeConfig {
  debug: boolean;
  colors: boolean;
  ci: boolean;
  path: string | null;
}

const DEFAULT_PROJECT_CONFIG: UnipmProjectConfig = {};

const initialChalkLevel = chalk.level;
const initialStderrChalkLevel = "stderr" in chalk ? chalk.stderr.level : chalk.level;
const fallbackChalkLevel = initialChalkLevel || 1;
const fallbackStderrChalkLevel = initialStderrChalkLevel || 1;

// Cache configs per working directory
const configCache = new Map<string, { config: UnipmProjectConfig; path: string | null }>();

function isTruthyEnv(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  return value !== "0" && value.toLowerCase() !== "false";
}

function envBoolean(value: string | undefined): boolean | null {
  if (value === undefined) {
    return null;
  }
  return isTruthyEnv(value);
}

function envColorPreference(): boolean | null {
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }
  if (process.env.FORCE_COLOR !== undefined) {
    return true;
  }
  return null;
}

function isValidPackageManager(value: unknown): value is PackageManager {
  return typeof value === "string" && PackageManagers.includes(value as PackageManager);
}

function isValidBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function parseConfig(raw: unknown): UnipmProjectConfig | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const config = raw as Record<string, unknown>;
  const parsed: UnipmProjectConfig = {};

  if (
    "preferredPackageManager" in config &&
    config.preferredPackageManager !== undefined &&
    config.preferredPackageManager !== null
  ) {
    if (!isValidPackageManager(config.preferredPackageManager)) {
      return null;
    }
    parsed.preferredPackageManager = config.preferredPackageManager;
  }

  if ("debug" in config && config.debug !== undefined && config.debug !== null) {
    if (!isValidBoolean(config.debug)) {
      return null;
    }
    parsed.debug = config.debug;
  }

  if ("colors" in config && config.colors !== undefined && config.colors !== null) {
    if (!isValidBoolean(config.colors)) {
      return null;
    }
    parsed.colors = config.colors;
  }

  if ("ci" in config && config.ci !== undefined && config.ci !== null) {
    if (!isValidBoolean(config.ci)) {
      return null;
    }
    parsed.ci = config.ci;
  }

  return parsed;
}

function resolveRuntimeConfig(
  config: UnipmProjectConfig,
  path: string | null
): ResolvedRuntimeConfig {
  const envDebug = envBoolean(process.env.DEBUG);
  const envCi = envBoolean(process.env.CI);
  const colorPreference = envColorPreference();

  return {
    debug: envDebug ?? config.debug ?? false,
    colors: colorPreference ?? config.colors ?? initialChalkLevel > 0,
    ci: envCi ?? config.ci ?? false,
    path,
  };
}

// Cache resolved runtime config for reuse
let runtimeConfig: ResolvedRuntimeConfig = resolveRuntimeConfig(DEFAULT_PROJECT_CONFIG, null);

export function getProjectConfigPath(basePath = process.cwd()): string {
  return join(basePath, PROJECT_CONFIG_FILENAME);
}

export async function loadProjectConfig(
  basePath = process.cwd()
): Promise<{ config: UnipmProjectConfig; path: string | null }> {
  const cached = configCache.get(basePath);
  if (cached) {
    return cached;
  }

  const configPath = getProjectConfigPath(basePath);

  try {
    if (!existsSync(configPath)) {
      configCache.set(basePath, { config: DEFAULT_PROJECT_CONFIG, path: null });
      return { config: DEFAULT_PROJECT_CONFIG, path: null };
    }

    const file = Bun.file(configPath);
    const raw = await file.json();
    const parsed = parseConfig(raw);

    if (!parsed) {
      Logger.debug(`Ignoring invalid config file at ${configPath}`);
      configCache.set(basePath, { config: DEFAULT_PROJECT_CONFIG, path: null });
      return { config: DEFAULT_PROJECT_CONFIG, path: null };
    }

    const result = { config: parsed, path: configPath } as const;
    configCache.set(basePath, result);
    return result;
  } catch (error) {
    Logger.debug(
      `Failed to load project config at ${configPath}: ${(error as Error).message}`
    );
    configCache.set(basePath, { config: DEFAULT_PROJECT_CONFIG, path: null });
    return { config: DEFAULT_PROJECT_CONFIG, path: null };
  }
}

export async function getPreferredPackageManager(
  basePath = process.cwd()
): Promise<{ manager: PackageManager | null; path: string | null }> {
  const { config, path } = await loadProjectConfig(basePath);
  return {
    manager: config.preferredPackageManager ?? null,
    path,
  };
}

export async function applyRuntimeConfig(basePath = process.cwd()): Promise<ResolvedRuntimeConfig> {
  const { config, path } = await loadProjectConfig(basePath);

  runtimeConfig = resolveRuntimeConfig(config, path);

  if (runtimeConfig.debug) {
    process.env.DEBUG = "true";
  } else {
    delete process.env.DEBUG;
  }

  if (runtimeConfig.colors) {
    chalk.level = fallbackChalkLevel;
    if ("stderr" in chalk) {
      chalk.stderr.level = fallbackStderrChalkLevel;
    }
  } else {
    chalk.level = 0;
    if ("stderr" in chalk) {
      chalk.stderr.level = 0;
    }
  }

  if (runtimeConfig.ci) {
    process.env.CI = "true";
  } else {
    delete process.env.CI;
  }

  return runtimeConfig;
}

export function getRuntimeConfig(): ResolvedRuntimeConfig {
  return runtimeConfig;
}

export function clearProjectConfigCache(): void {
  configCache.clear();
  runtimeConfig = resolveRuntimeConfig(DEFAULT_PROJECT_CONFIG, null);
}
