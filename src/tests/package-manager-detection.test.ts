import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import { DetectPackageManager, clearDetectionCache } from "../core/detection";
import { DetectionSource, PackageManager } from "../types/package-managers";

describe("Package Manager Detection", () => {
  // Store original functions
  let originalBunFile: any;
  let mockBunFile: any;
  let mockExists: any;
  let mockJson: any;
  let mockSpawn: any;
  let originalSpawn: any;

  beforeEach(() => {
    // Clear detection cache before each test
    clearDetectionCache();

    // Mock Bun.file function
    mockExists = vi.fn(() => Promise.resolve(true));
    mockJson = vi.fn(() => Promise.resolve({}));

    // Create a file mock that returns an object with exists and json methods
    mockBunFile = vi.fn((path: string) => {
      return {
        exists: () => mockExists(path),
        json: () => mockJson(path),
      };
    });

    // Store original Bun.file and replace with mock
    originalBunFile = Bun.file;
    // @ts-ignore - Mock implementation
    Bun.file = mockBunFile;

    // Mock Bun.spawn
    mockSpawn = vi.fn(() => {
      return {
        exited: Promise.resolve(0),
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("1.0.0"));
            controller.close();
          },
        }),
      };
    });

    // Store original Bun.spawn and replace with mock
    originalSpawn = Bun.spawn;
    // @ts-ignore - Mock implementation
    Bun.spawn = mockSpawn;
  });

  afterEach(() => {
    // Restore original functions
    // @ts-ignore - Restore original
    Bun.file = originalBunFile;
    // @ts-ignore - Restore original
    Bun.spawn = originalSpawn;
  });

  test("should detect package manager from package.json", async () => {
    // Setup mock package.json with packageManager field
    mockJson.mockImplementationOnce(() =>
      Promise.resolve({ packageManager: "pnpm@8.5.0" })
    );

    const result = await DetectPackageManager();

    expect(result.name).toBe(PackageManager.PNPM);
    expect(result.version).toBe("8.5.0");
    expect(result.detectionSource).toBe(DetectionSource.PACKAGE_JSON);
  });

  test("should detect package manager from lockfile", async () => {
    // Mock package.json without packageManager field
    mockJson.mockImplementationOnce(() => Promise.resolve({}));

    // Setup lockfile exists check - yarn.lock exists
    mockExists.mockImplementation((path: string) => {
      if (path === "package.json") return Promise.resolve(true);
      if (path === "yarn.lock") return Promise.resolve(true);
      return Promise.resolve(false);
    });

    const result = await DetectPackageManager();

    expect(result.name).toBe(PackageManager.YARN);
    expect(result.detectionSource).toBe(DetectionSource.LOCKFILE);
  });

  test("should return 'none' when no package.json exists", async () => {
    // Mock package.json not existing
    mockExists.mockImplementationOnce(() => Promise.resolve(false));

    const result = await DetectPackageManager();

    expect(result.name).toBe("none");
    expect(result.detectionSource).toBe(DetectionSource.NOT_DETECTED);
    expect(result.detectionHint).toBe("No package.json file found");
  });

  test("should handle errors gracefully", async () => {
    // Mock an error occurring when reading package.json
    mockJson.mockImplementationOnce(() =>
      Promise.reject(new Error("Failed to read package.json"))
    );

    const result = await DetectPackageManager();

    expect(result.name).toBe("none");
    expect(result.detectionSource).toBe(DetectionSource.NOT_DETECTED);
    expect(result.detectionHint).toContain("Error:");
  });
});
