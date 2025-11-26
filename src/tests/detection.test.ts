import { DetectPackageManager, clearDetectionCache } from "../core/detection";
import { PackageManager, DetectionSource } from "../types/package-managers";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

describe("Package Manager Detection", () => {
  let originalBunFile: any;
  let mockBunFile: any;
  let mockExists: any;
  let mockJson: any;
  let mockSpawn: any;
  let originalSpawn: any;

  beforeEach(() => {
    // Clear detection cache before each test
    clearDetectionCache();

    // Mock Bun.file
    mockExists = vi.fn(() => Promise.resolve(false));
    mockJson = vi.fn(() => Promise.resolve({}));

    mockBunFile = vi.fn((path: string) => {
      return {
        exists: () => mockExists(path),
        json: () => mockJson(path),
      };
    });

    originalBunFile = Bun.file;
    // @ts-ignore
    Bun.file = mockBunFile;

    // Mock Bun.spawn
    mockSpawn = vi.fn(() => {
      return {
        exited: Promise.resolve(1), // Default to fail (not found)
        stdout: new Response("").body,
      };
    });

    originalSpawn = Bun.spawn;
    // @ts-ignore
    Bun.spawn = mockSpawn;
  });

  afterEach(() => {
    // @ts-ignore
    Bun.file = originalBunFile;
    // @ts-ignore
    Bun.spawn = originalSpawn;
  });

  test("should detect from package.json packageManager field", async () => {
    mockExists.mockImplementation((path: string) =>
      Promise.resolve(path === "package.json")
    );
    mockJson.mockImplementation(() =>
      Promise.resolve({ packageManager: "bun@1.0.0" })
    );

    const result = await DetectPackageManager();

    expect(result.name).toBe("bun");
    expect(result.version).toBe("1.0.0");
    expect(result.detectionSource).toBe(DetectionSource.PACKAGE_JSON);
  });

  test("should detect from bun.lock", async () => {
    mockExists.mockImplementation((path: string) =>
      Promise.resolve(path === "package.json" || path === "bun.lock")
    );
    mockJson.mockImplementation(() => Promise.resolve({}));

    mockSpawn.mockImplementation((args: string[]) => {
      if (args[0] === "bun") {
        return {
          exited: Promise.resolve(0),
          stdout: new Response("1.0.0").body,
        };
      }
      return { exited: Promise.resolve(1), stdout: new Response("").body };
    });

    const result = await DetectPackageManager();

    expect(result.name).toBe(PackageManager.BUN);
    expect(result.detectionSource).toBe(DetectionSource.LOCKFILE);
  });

  test("should detect from package-lock.json", async () => {
    mockExists.mockImplementation((path: string) =>
      Promise.resolve(path === "package.json" || path === "package-lock.json")
    );
    mockJson.mockImplementation(() => Promise.resolve({}));

    mockSpawn.mockImplementation((args: string[]) => {
      if (args[0] === "npm") {
        return {
          exited: Promise.resolve(0),
          stdout: new Response("9.0.0").body,
        };
      }
      return { exited: Promise.resolve(1), stdout: new Response("").body };
    });

    const result = await DetectPackageManager();

    expect(result.name).toBe(PackageManager.NPM);
    expect(result.detectionSource).toBe(DetectionSource.LOCKFILE);
  });

  test("should detect from available commands (priority check)", async () => {
    mockExists.mockImplementation((path: string) =>
      Promise.resolve(path === "package.json")
    );
    mockJson.mockImplementation(() => Promise.resolve({}));

    mockSpawn.mockImplementation((args: string[]) => {
      return {
        exited: Promise.resolve(0),
        stdout: new Response("1.0.0").body,
      };
    });

    const result = await DetectPackageManager();

    expect(result.name).toBe(PackageManager.BUN);
    expect(result.detectionSource).toBe(DetectionSource.COMMAND_AVAILABILITY);
  });

  test("should return none if no package.json", async () => {
    mockExists.mockImplementation(() => Promise.resolve(false));

    const result = await DetectPackageManager();

    expect(result.name).toBe("none");
    expect(result.detectionSource).toBe(DetectionSource.NOT_DETECTED);
  });

  test("should handle error during detection", async () => {
    mockExists.mockImplementation(() => {
      throw new Error("FS Error");
    });

    const result = await DetectPackageManager();

    expect(result.name).toBe("none");
    expect(result.detectionHint).toContain("FS Error");
  });

  test("should detect from pnpm-lock.yaml", async () => {
    mockExists.mockImplementation((path: string) =>
      Promise.resolve(path === "package.json" || path === "pnpm-lock.yaml")
    );
    mockJson.mockImplementation(() => Promise.resolve({}));

    mockSpawn.mockImplementation((args: string[]) => {
      if (args[0] === "pnpm") {
        return {
          exited: Promise.resolve(0),
          stdout: new Response("8.0.0").body,
        };
      }
      return { exited: Promise.resolve(1), stdout: new Response("").body };
    });

    const result = await DetectPackageManager();
    expect(result.name).toBe(PackageManager.PNPM);
  });

  test("should handle getPackageManagerVersion failure", async () => {
    mockExists.mockImplementation((path: string) =>
      Promise.resolve(path === "package.json" || path === "package-lock.json")
    );
    mockJson.mockImplementation(() => Promise.resolve({}));

    mockSpawn.mockImplementation(() => {
      return { exited: Promise.resolve(1), stdout: new Response("").body };
    });

    const result = await DetectPackageManager();
    expect(result.name).toBe(PackageManager.NPM);
    expect(result.version).toBeNull();
  });

  test("should handle getPackageManagerVersion exception", async () => {
    mockExists.mockImplementation((path: string) =>
      Promise.resolve(path === "package.json" || path === "package-lock.json")
    );
    mockJson.mockImplementation(() => Promise.resolve({}));

    mockSpawn.mockImplementation(() => {
      throw new Error("Spawn failed");
    });

    const result = await DetectPackageManager();
    expect(result.name).toBe(PackageManager.NPM);
    expect(result.version).toBeNull();
  });
});
