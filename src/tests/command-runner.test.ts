import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearDetectionCache } from "../core/detection";
import { DetectionSource } from "../types/package-managers";

// Import the module to test after clearing cache
describe("Command Runner", () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    vi.resetAllMocks();
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    clearDetectionCache();

    // Default to non-TTY to avoid stdin issues in tests
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      writable: true,
    });
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
  });

  describe("module exports", () => {
    it("should export runPackageManagerCommand", async () => {
      const { runPackageManagerCommand } = await import(
        "../core/command-runner"
      );
      expect(runPackageManagerCommand).toBeDefined();
      expect(typeof runPackageManagerCommand).toBe("function");
    });

    it("should export getEffectivePackageManager", async () => {
      const { getEffectivePackageManager } = await import(
        "../core/command-runner"
      );
      expect(getEffectivePackageManager).toBeDefined();
      expect(typeof getEffectivePackageManager).toBe("function");
    });

    it("should export CommandType type", async () => {
      // Just verify we can import without error
      const module = await import("../core/command-runner");
      expect(module).toBeDefined();
    });

    it("should keep the detected package manager in native mode", async () => {
      vi.resetModules();

      const executePackageManagerCommand = vi.fn(async () => ({
        success: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
      }));

      vi.doMock("../core/detection", () => ({
        DetectPackageManager: vi.fn(async () => ({
          name: "npm",
          version: "9.0.0",
          detectionSource: DetectionSource.PACKAGE_JSON,
          detectionHint: "Found 'npm@9.0.0' in package.json",
        })),
      }));

      vi.doMock("../core/execution", () => ({
        executePackageManagerCommand,
      }));

      vi.doMock("../core/config", async () => {
        const actual = await vi.importActual<typeof import("../core/config")>(
          "../core/config"
        );

        return {
          ...actual,
          getPreferredPackageManager: vi.fn(async () => ({
            manager: null,
            path: null,
          })),
          getRuntimeConfig: vi.fn(() => ({
            debug: false,
            colors: true,
            ci: true,
            path: null,
          })),
        };
      });

      const { runPackageManagerCommand } = await import("../core/command-runner");
      const result = await runPackageManagerCommand({
        commandType: "install",
        args: [],
        showSwitchHint: false,
      });

      expect(result.exitCode).toBe(0);
      expect(executePackageManagerCommand).toHaveBeenCalledWith(
        "npm install",
        []
      );

      vi.doUnmock("../core/detection");
      vi.doUnmock("../core/execution");
      vi.doUnmock("../core/config");
    });
  });
});
