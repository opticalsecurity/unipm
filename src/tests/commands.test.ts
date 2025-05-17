import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";
import { Command as HelpCommand } from "../commands/help";
import { Command as DetectCommand } from "../commands/detect";
import { Command as AddCommand } from "../commands/add";
import { Command as RemoveCommand } from "../commands/remove";
import { DetectPackageManager } from "../layers/package-manager-detection";
import { executePackageManagerCommand } from "../layers/command-execution";
import { PackageManager, DetectionSource } from "../types/package-managers";
import { parseContent } from "../helpers/content-parser";
import { Logger } from "../helpers/logger";

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
      (global as any).DetectPackageManager = mockDetectPackageManager;
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
      (global as any).DetectPackageManager = mockDetectPackageManager;
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
    let originalLoggerError: any;
    let mockLoggerError: any;
    let originalExecuteCommand: any;
    let mockExecuteCommand: any;
    let originalLoggerSuccess: any;
    let mockLoggerSuccess: any;

    beforeEach(() => {
      // Mock console.log
      originalConsoleLog = console.log;
      mockConsoleLog = mock(() => {});
      console.log = mockConsoleLog;

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

      // Mock Logger methods
      originalLoggerError = Logger.error;
      mockLoggerError = mock(() => {});
      Logger.error = mockLoggerError;

      originalLoggerSuccess = Logger.success;
      mockLoggerSuccess = mock(() => {});
      Logger.success = mockLoggerSuccess;

      // Mock executePackageManagerCommand
      originalExecuteCommand = executePackageManagerCommand;
      mockExecuteCommand = mock(() =>
        Promise.resolve({ success: true, exitCode: 0 })
      );
      (global as any).executePackageManagerCommand = mockExecuteCommand;

      // Replace global function
      (global as any).DetectPackageManager = mockDetectPackageManager;
      (global as any).executePackageManagerCommand = mockExecuteCommand;
    });

    afterEach(() => {
      // Restore original functions
      console.log = originalConsoleLog;
      Logger.error = originalLoggerError;
      Logger.success = originalLoggerSuccess;
      (global as any).DetectPackageManager = originalDetectPackageManager;
      (global as any).executePackageManagerCommand = originalExecuteCommand;
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
      expect(mockLoggerError).toHaveBeenCalledWith(
        "No package specified. Please provide a package name."
      );
    });

    test("should show information about the command to be executed", async () => {
      // Set up mock for parseContent to ensure console.log is called
      const { parseContent: originalParseContent } = await import(
        "../helpers/content-parser"
      );
      const mockParseContent = mock(() => "Mocked output");
      (global as any).parseContent = mockParseContent;

      const command = RemoveCommand();
      const result = await command.execute(["react"]);

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(result).toBe(0);

      // Restore original parseContent
      (global as any).parseContent = originalParseContent;
    });

    test("should handle execution failure with error object", async () => {
      // Override the mock for this specific test
      const mockError = new Error("Command failed");
      mockExecuteCommand.mockImplementationOnce(() =>
        Promise.resolve({ success: false, exitCode: 2, error: mockError })
      );

      const command = RemoveCommand();
      const result = await command.execute(["react"]);

      expect(result).toBe(2);
      expect(mockLoggerError).toHaveBeenCalledWith(
        "Failed to execute command: bun remove react",
        mockError
      );
    });

    test("should handle execution failure without error object", async () => {
      // Override the mock for this specific test
      mockExecuteCommand.mockImplementationOnce(() =>
        Promise.resolve({ success: false, exitCode: 3, error: undefined })
      );

      const command = RemoveCommand();
      const result = await command.execute(["react"]);

      expect(result).toBe(3);
      expect(mockLoggerError).toHaveBeenCalledWith(
        "Command failed with exit code 3"
      );
    });

    test("should handle no package manager detected", async () => {
      // Override the mock for this specific test
      mockDetectPackageManager.mockImplementationOnce(() =>
        Promise.resolve({
          name: "none",
          version: null,
          detectionSource: DetectionSource.NOT_DETECTED,
          detectionHint: "No package manager detected",
        })
      );

      const command = RemoveCommand();
      const result = await command.execute(["react"]);

      expect(result).toBe(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        "No package manager detected. Please run 'bun init' or 'bun install' to initialize the project."
      );
    });

    test("should handle unsupported package manager", async () => {
      // Override the mock for this specific test
      mockDetectPackageManager.mockImplementationOnce(() =>
        Promise.resolve({
          name: "unsupported",
          version: "1.0.0",
          detectionSource: DetectionSource.LOCKFILE,
          detectionHint: "Found unsupported.lock",
        })
      );

      const command = RemoveCommand();
      const result = await command.execute(["react"]);

      expect(result).toBe(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        "Unknown package manager: unsupported."
      );
    });

    test("should handle package names with spaces", async () => {
      // Set up mock for parseContent to ensure console.log is called
      const { parseContent: originalParseContent } = await import(
        "../helpers/content-parser"
      );
      const mockParseContent = mock(() => "Mocked output");
      (global as any).parseContent = mockParseContent;

      const command = RemoveCommand();
      const result = await command.execute([
        "@scope/package-name",
        "@another/pkg",
      ]);

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(result).toBe(0);

      // Check that executePackageManagerCommand was called with the correct arguments
      expect(mockExecuteCommand).toHaveBeenCalledWith("bun remove", [
        "@scope/package-name",
        "@another/pkg",
      ]);

      // Restore original parseContent
      (global as any).parseContent = originalParseContent;
    });

    test("should handle package names with special characters", async () => {
      // Set up mock for parseContent to ensure console.log is called
      const { parseContent: originalParseContent } = await import(
        "../helpers/content-parser"
      );
      const mockParseContent = mock(() => "Mocked output");
      (global as any).parseContent = mockParseContent;

      const command = RemoveCommand();
      const result = await command.execute(["@types/node@latest"]);

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(result).toBe(0);

      // Check that executePackageManagerCommand was called with the correct arguments
      expect(mockExecuteCommand).toHaveBeenCalledWith("bun remove", [
        "@types/node@latest",
      ]);

      // Restore original parseContent
      (global as any).parseContent = originalParseContent;
    });

    test("should handle unexpected errors during execution", async () => {
      // Create a Command with a mock that throws an error
      const originalImport = (global as any).import;

      // Temporarily replace import with a function that throws
      (global as any).import = mock(() => {
        throw new Error("Unexpected import error");
      });

      const command = RemoveCommand();
      const result = await command.execute(["react"]);

      expect(result).toBe(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        "An unexpected error occurred",
        expect.any(Error)
      );

      // Restore original import
      (global as any).import = originalImport;
    });
  });
});
