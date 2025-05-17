import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";
import { Command as HelpCommand } from "../commands/help";
import { Command as DetectCommand } from "../commands/detect";
import { Command as AddCommand } from "../commands/add";
import { Command as RemoveCommand } from "../commands/remove";
import { DetectPackageManager } from "../layers/package-manager-detection";
import { PackageManager, DetectionSource } from "../types/package-managers";
import { parseContent } from "../helpers/content-parser";

describe("Commands", () => {
  let originalConsoleLog: any;
  let mockConsoleLog: any;

  beforeEach(() => {
    // Mock console.log to verify output
    originalConsoleLog = console.log;
    mockConsoleLog = mock(() => {});
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;
  });

  describe("Help Command", () => {
    test("should have correct name and aliases", () => {
      const command = HelpCommand();
      expect(command.name).toBe("help");
      expect(command.aliases).toContain("h");
      expect(command.aliases).toContain("?");
    });

    test("should output help content when executed", async () => {
      const command = HelpCommand();
      await command.execute([]);
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe("Detect Command", () => {
    let originalDetectPackageManager: any;
    let mockDetectPackageManager: any;

    beforeEach(() => {
      // Mock DetectPackageManager
      originalDetectPackageManager = DetectPackageManager;
      mockDetectPackageManager = mock(async () => ({
        name: PackageManager.BUN,
        version: "1.0.0",
        detectionSource: DetectionSource.LOCKFILE,
        detectionHint: "Found bun.lock",
      }));

      // @ts-ignore: Mocking implementation
      global.DetectPackageManager = mockDetectPackageManager;
    });

    afterEach(() => {
      // Restore original function
      (global as any).DetectPackageManager = originalDetectPackageManager;
    });

    test("should have correct name and alias", () => {
      const command = DetectCommand();
      expect(command.name).toBe("detect");
      expect(command.aliases).toContain("d");
    });

    test("should output detection results when executed", async () => {
      const command = DetectCommand();
      await command.execute([]);
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe("Add Command", () => {
    let originalDetectPackageManager: any;
    let mockDetectPackageManager: any;

    beforeEach(() => {
      // Mock DetectPackageManager
      originalDetectPackageManager = DetectPackageManager;
      mockDetectPackageManager = mock(() =>
        Promise.resolve({
          name: PackageManager.BUN,
          version: "1.0.0",
          detectionSource: DetectionSource.LOCKFILE,
          detectionHint: "Found bun.lock",
        })
      );

      // @ts-ignore: Mocking implementation
      global.DetectPackageManager = mockDetectPackageManager;
    });

    afterEach(() => {
      // Restore original function
      (global as any).DetectPackageManager = originalDetectPackageManager;
    });

    test("should have correct name and aliases", () => {
      const command = AddCommand();
      expect(command.name).toBe("add");
      expect(command.aliases).toContain("a");
    });
  });

  describe("Remove Command", () => {
    let originalDetectPackageManager: any;
    let mockDetectPackageManager: any;

    beforeEach(() => {
      // Mock DetectPackageManager
      originalDetectPackageManager = DetectPackageManager;
      mockDetectPackageManager = mock(() =>
        Promise.resolve({
          name: PackageManager.BUN,
          version: "1.0.0",
          detectionSource: DetectionSource.LOCKFILE,
          detectionHint: "Found bun.lock",
        })
      );

      // @ts-ignore: Mocking implementation
      global.DetectPackageManager = mockDetectPackageManager;
    });

    afterEach(() => {
      // Restore original function
      (global as any).DetectPackageManager = originalDetectPackageManager;
    });

    test("should have correct name and aliases", () => {
      const command = RemoveCommand();
      expect(command.name).toBe("remove");
      expect(command.aliases).toContain("rm");
      expect(command.aliases).toContain("r");
    });

    test("should return error when no package is specified", async () => {
      const command = RemoveCommand();
      const result = await command.execute([]);
      expect(result).toBe(1);
    });

    test("should show information about the command to be executed", async () => {
      // Create a spy on the imported function that will be called
      const originalExecuteCommand = (globalThis as any)[
        "executePackageManagerCommand"
      ];
      const mockExecuteCommand = mock(() =>
        Promise.resolve({ success: true, exitCode: 0 })
      );
      // @ts-ignore: Mocking implementation
      global.executePackageManagerCommand = mockExecuteCommand;

      const command = RemoveCommand();
      const result = await command.execute(["react"]);

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(result).toBe(0);

      // Restore original function
      (global as any).executePackageManagerCommand = originalExecuteCommand;
    });
  });
});
