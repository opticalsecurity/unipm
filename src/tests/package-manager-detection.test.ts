import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";
import { DetectPackageManager } from "../layers/package-manager-detection";
import { DetectionSource, PackageManager } from "../types/package-managers";
import { file } from "bun";

describe("Package Manager Detection", () => {
  const originalFileExists = file.prototype.exists;
  const originalFileJson = file.prototype.json;

  let mockFileExists: any;
  let mockFileJson: any;
  let mockSpawn: any;

  beforeEach(() => {
    // Mock Bun.file to control file existence checks
    mockFileExists = mock(() => Promise.resolve(true));
    file.prototype.exists = mockFileExists;

    // Mock file.json to return controlled package.json content
    mockFileJson = mock(() => Promise.resolve({}));
    file.prototype.json = mockFileJson;

    // Mock Bun.spawn for package manager version checks
    mockSpawn = mock(() => {
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

    // Store original Bun.spawn
    const originalSpawn = Bun.spawn;
    // @ts-ignore - Mock implementation
    Bun.spawn = mockSpawn;
  });

  afterEach(() => {
    // Restore original functions
    file.prototype.exists = originalFileExists;
    file.prototype.json = originalFileJson;
  });

  test("should detect package manager from package.json", async () => {
    // Setup mock package.json with packageManager field
    mockFileJson.mockImplementationOnce(() =>
      Promise.resolve({ packageManager: "pnpm@8.5.0" })
    );

    const result = await DetectPackageManager();

    expect(result.name).toBe(PackageManager.PNPM);
    expect(result.version).toBe("8.5.0");
    expect(result.detectionSource).toBe(DetectionSource.PACKAGE_JSON);
  });

  test("should detect package manager from lockfile", async () => {
    // Mock package.json without packageManager field
    mockFileJson.mockImplementationOnce(() => Promise.resolve({}));

    // Setup lockfile exists check - yarn.lock exists
    mockFileExists.mockImplementation((path: string) => {
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
    mockFileExists.mockImplementationOnce(() => Promise.resolve(false));

    const result = await DetectPackageManager();

    expect(result.name).toBe("none");
    expect(result.detectionSource).toBe(DetectionSource.NOT_DETECTED);
    expect(result.detectionHint).toBe("No package.json file found");
  });

  test("should handle errors gracefully", async () => {
    // Mock an error occurring when reading package.json
    mockFileJson.mockImplementationOnce(() =>
      Promise.reject(new Error("Failed to read package.json"))
    );

    const result = await DetectPackageManager();

    expect(result.name).toBe("none");
    expect(result.detectionSource).toBe(DetectionSource.NOT_DETECTED);
    expect(result.detectionHint).toContain("Error:");
  });
});
