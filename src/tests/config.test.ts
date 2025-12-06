import { describe, test, expect, afterEach } from "vitest";
import chalk from "chalk";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  clearProjectConfigCache,
  getPreferredPackageManager,
  getProjectConfigPath,
  applyRuntimeConfig,
  getRuntimeConfig,
} from "../core/config";
import { PackageManager } from "../types/package-managers";

const createTempDir = () => mkdtempSync(join(tmpdir(), "unipm-config-"));

describe("project configuration", () => {
  const initialChalkLevel = chalk.level;
  const initialStderrLevel = "stderr" in chalk ? chalk.stderr.level : chalk.level;
  const originalDebugEnv = process.env.DEBUG;
  const originalCiEnv = process.env.CI;
  const originalNoColorEnv = process.env.NO_COLOR;
  const originalForceColorEnv = process.env.FORCE_COLOR;

  afterEach(() => {
    clearProjectConfigCache();
    chalk.level = initialChalkLevel;
    if ("stderr" in chalk) {
      chalk.stderr.level = initialStderrLevel;
    }
    if (originalDebugEnv === undefined) {
      delete process.env.DEBUG;
    } else {
      process.env.DEBUG = originalDebugEnv;
    }
    if (originalCiEnv === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCiEnv;
    }
    if (originalNoColorEnv === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColorEnv;
    }
    if (originalForceColorEnv === undefined) {
      delete process.env.FORCE_COLOR;
    } else {
      process.env.FORCE_COLOR = originalForceColorEnv;
    }
  });

  test("returns null preference when config file is missing", async () => {
    const basePath = createTempDir();
    const result = await getPreferredPackageManager(basePath);
    expect(result.manager).toBeNull();
    expect(result.path).toBeNull();
    rmSync(basePath, { recursive: true, force: true });
  });

  test("reads preferred package manager from config", async () => {
    const basePath = createTempDir();
    const configPath = getProjectConfigPath(basePath);
    writeFileSync(
      configPath,
      JSON.stringify({ preferredPackageManager: PackageManager.PNPM }, null, 2)
    );

    const result = await getPreferredPackageManager(basePath);
    expect(result.manager).toBe(PackageManager.PNPM);
    expect(result.path).toBe(configPath);
    rmSync(basePath, { recursive: true, force: true });
  });

  test("ignores invalid package manager values", async () => {
    const basePath = createTempDir();
    const configPath = getProjectConfigPath(basePath);
    writeFileSync(configPath, JSON.stringify({ preferredPackageManager: "foo" }));

    const result = await getPreferredPackageManager(basePath);
    expect(result.manager).toBeNull();
    expect(result.path).toBeNull();
    rmSync(basePath, { recursive: true, force: true });
  });

  test("applies runtime toggles from project config", async () => {
    const basePath = createTempDir();
    const configPath = getProjectConfigPath(basePath);
    writeFileSync(
      configPath,
      JSON.stringify(
        { preferredPackageManager: PackageManager.PNPM, debug: true, colors: false, ci: true },
        null,
        2
      )
    );

    delete process.env.DEBUG;
    delete process.env.CI;
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    chalk.level = initialChalkLevel;
    if ("stderr" in chalk) {
      chalk.stderr.level = initialStderrLevel;
    }

    const runtime = await applyRuntimeConfig(basePath);

    expect(runtime).toEqual({
      debug: true,
      colors: false,
      ci: true,
      path: configPath,
    });
    expect(process.env.DEBUG).toBe("true");
    expect(process.env.CI).toBe("true");
    expect(chalk.level).toBe(0);
    if ("stderr" in chalk) {
      expect(chalk.stderr.level).toBe(0);
    }

    rmSync(basePath, { recursive: true, force: true });
  });

  test("prefers environment toggles over project config", async () => {
    const basePath = createTempDir();
    const configPath = getProjectConfigPath(basePath);
    writeFileSync(
      configPath,
      JSON.stringify({ debug: false, colors: true, ci: false }, null, 2)
    );

    process.env.DEBUG = "true";
    process.env.NO_COLOR = "1";
    process.env.CI = "true";
    chalk.level = initialChalkLevel;
    if ("stderr" in chalk) {
      chalk.stderr.level = initialStderrLevel;
    }

    const runtime = await applyRuntimeConfig(basePath);

    expect(runtime).toEqual({
      debug: true,
      colors: false,
      ci: true,
      path: configPath,
    });
    expect(process.env.DEBUG).toBe("true");
    expect(chalk.level).toBe(0);
    if ("stderr" in chalk) {
      expect(chalk.stderr.level).toBe(0);
    }

    rmSync(basePath, { recursive: true, force: true });
  });

  test("clears CI environment flag when runtime config disables it", async () => {
    const basePath = createTempDir();
    const configPath = getProjectConfigPath(basePath);
    writeFileSync(configPath, JSON.stringify({ ci: false }));

    process.env.CI = "0";

    const runtime = await applyRuntimeConfig(basePath);

    expect(runtime).toEqual({
      debug: false,
      colors: initialChalkLevel > 0,
      ci: false,
      path: configPath,
    });
    expect(process.env.CI).toBeUndefined();

    rmSync(basePath, { recursive: true, force: true });
  });

  test("resets runtime config when caches are cleared", async () => {
    const basePath = createTempDir();
    const configPath = getProjectConfigPath(basePath);
    writeFileSync(configPath, JSON.stringify({ debug: true, colors: false, ci: true }));

    delete process.env.DEBUG;
    delete process.env.CI;
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;

    await applyRuntimeConfig(basePath);

    delete process.env.DEBUG;
    delete process.env.CI;

    clearProjectConfigCache();

    expect(getRuntimeConfig()).toEqual({
      debug: false,
      colors: initialChalkLevel > 0,
      ci: false,
      path: null,
    });

    rmSync(basePath, { recursive: true, force: true });
  });

  test("ignores configs with invalid runtime toggles", async () => {
    const basePath = createTempDir();
    const configPath = getProjectConfigPath(basePath);
    writeFileSync(configPath, JSON.stringify({ debug: "yes", colors: true }));

    const runtime = await applyRuntimeConfig(basePath);
    const preference = await getPreferredPackageManager(basePath);

    expect(runtime.path).toBeNull();
    expect(preference.path).toBeNull();
    expect(preference.manager).toBeNull();

    rmSync(basePath, { recursive: true, force: true });
  });
});
