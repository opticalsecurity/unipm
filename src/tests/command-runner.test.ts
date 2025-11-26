import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearDetectionCache } from "../core/detection";

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
  });
});
