import { Command as HelpCommand } from "../commands/help";
import { Command as DetectCommand } from "../commands/detect";
import { Command as AddCommand } from "../commands/add";
import { Command as RemoveCommand } from "../commands/remove";
import { Command as InstallCommand } from "../commands/install";
import { Command as UpdateCommand } from "../commands/update";
import { Command as RunCommand } from "../commands/run";
import { Command as ExecCommand } from "../commands/exec";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

describe("Commands", () => {
  let originalConsoleLog: any;
  let mockConsoleLog: any;
  let originalBunFile: any;
  let mockBunFile: any;
  let mockExists: any;
  let mockJson: any;
  let mockSpawn: any;
  let originalSpawn: any;

  beforeEach(() => {
    // Mock console.log
    originalConsoleLog = console.log;
    mockConsoleLog = vi.fn();
    console.log = mockConsoleLog;

    // Mock Bun.file
    mockExists = vi.fn(() => Promise.resolve(true));
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
        exited: Promise.resolve(0),
        stdout: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      };
    });

    originalSpawn = Bun.spawn;
    // @ts-ignore
    Bun.spawn = mockSpawn;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    // @ts-ignore
    Bun.file = originalBunFile;
    // @ts-ignore
    Bun.spawn = originalSpawn;
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
    test("should have correct name and alias", () => {
      const command = DetectCommand();
      expect(command.name).toBe("detect");
      expect(command.aliases).toContain("d");
    });

    test("should output detection results when executed", async () => {
      // Setup mock for package.json
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));

      const command = DetectCommand();
      await command.execute([]);
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe("Add Command", () => {
    test("should have correct name and aliases", () => {
      const command = AddCommand();
      expect(command.name).toBe("add");
      expect(command.aliases).toContain("a");
    });

    test("should return error when no package is specified", async () => {
      const command = AddCommand();
      const result = await command.execute([]);
      expect(result).toBe(1);
    });

    test("should execute successfully with valid package", async () => {
      // Setup mock for package.json to detect bun
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));

      const command = AddCommand();
      const result = await command.execute(["react"]);

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(result).toBe(0);

      // Verify spawn was called
      expect(mockSpawn).toHaveBeenCalled();
      const calls = mockSpawn.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain("bun");
      expect(lastCall[0]).toContain("add");
      expect(lastCall[0]).toContain("react");
    });

    test("should handle no package manager detected", async () => {
      mockExists.mockImplementation(() => Promise.resolve(false));
      const command = AddCommand();
      const result = await command.execute(["react"]);
      expect(result).toBe(1);
    });

    test("should handle unsupported package manager", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "unsupported@1.0.0" }));
      const command = AddCommand();
      const result = await command.execute(["react"]);
      expect(result).toBe(1);
    });

    test("should handle execution failure", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));
      mockSpawn.mockImplementation(() => {
        return {
          exited: Promise.resolve(1),
          stdout: new ReadableStream({ start(c) { c.close(); } }),
          stderr: new ReadableStream({ start(c) { c.close(); } }),
        };
      });

      const command = AddCommand();
      const result = await command.execute(["react"]);
      expect(result).toBe(1);
    });

    test("should handle execution failure with error object", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));
      mockSpawn.mockImplementation(() => {
        throw new Error("Spawn failed");
      });

      const command = AddCommand();
      const result = await command.execute(["react"]);
      expect(result).toBe(1);
    });

    test("should handle unexpected error", async () => {
      mockJson.mockImplementation(() => { throw new Error("Unexpected"); });
      const command = AddCommand();
      const result = await command.execute(["react"]);
      expect(result).toBe(1);
    });
  });

  describe("Install Command", () => {
    test("should have correct name and aliases", () => {
      const command = InstallCommand();
      expect(command.name).toBe("install");
      expect(command.aliases).toContain("i");
    });

    test("should return error when arguments are provided", async () => {
      const command = InstallCommand();
      const result = await command.execute(["some-arg"]);
      expect(result).toBe(1);
    });

    test("should execute successfully without arguments", async () => {
      // Setup mock for package.json to detect bun
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));

      const command = InstallCommand();
      const result = await command.execute([]);

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(result).toBe(0);

      // Verify spawn was called
      expect(mockSpawn).toHaveBeenCalled();
      const calls = mockSpawn.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain("bun");
      expect(lastCall[0]).toContain("install");
    });

    test("should handle no package manager detected", async () => {
      mockExists.mockImplementation(() => Promise.resolve(false));
      const command = InstallCommand();
      const result = await command.execute([]);
      expect(result).toBe(1);
    });

    test("should handle unsupported package manager", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "unsupported@1.0.0" }));
      const command = InstallCommand();
      const result = await command.execute([]);
      expect(result).toBe(1);
    });

    test("should handle execution failure", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));
      mockSpawn.mockImplementation(() => {
        return {
          exited: Promise.resolve(1),
          stdout: new ReadableStream({ start(c) { c.close(); } }),
          stderr: new ReadableStream({ start(c) { c.close(); } }),
        };
      });

      const command = InstallCommand();
      const result = await command.execute([]);
      expect(result).toBe(1);
    });

    test("should handle execution failure with error object", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));
      mockSpawn.mockImplementation(() => {
        throw new Error("Spawn failed");
      });

      const command = InstallCommand();
      const result = await command.execute([]);
      expect(result).toBe(1);
    });

    test("should handle unexpected error", async () => {
      mockJson.mockImplementation(() => { throw new Error("Unexpected"); });
      const command = InstallCommand();
      const result = await command.execute([]);
      expect(result).toBe(1);
    });
  });

  describe("Remove Command", () => {
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
      // Setup mock for package.json to detect bun
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));

      const command = RemoveCommand();
      const result = await command.execute(["react"]);

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(result).toBe(0);
    });

    test("should handle no package manager detected", async () => {
      // Mock no package.json
      mockExists.mockImplementation(() => Promise.resolve(false));

      const command = RemoveCommand();
      const result = await command.execute(["react"]);

      expect(result).toBe(1);
    });

    test("should handle unsupported package manager", async () => {
      // Mock unsupported package manager in package.json
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "unsupported@1.0.0" }));

      const command = RemoveCommand();
      const result = await command.execute(["react"]);

      expect(result).toBe(1);
    });

    test("should handle execution failure", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));
      mockSpawn.mockImplementation(() => {
        return {
          exited: Promise.resolve(1),
          stdout: new ReadableStream({ start(c) { c.close(); } }),
          stderr: new ReadableStream({ start(c) { c.close(); } }),
        };
      });

      const command = RemoveCommand();
      const result = await command.execute(["react"]);
      expect(result).toBe(1);
    });

    test("should handle execution failure with error object", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));
      mockSpawn.mockImplementation(() => {
        throw new Error("Spawn failed");
      });

      const command = RemoveCommand();
      const result = await command.execute(["react"]);
      expect(result).toBe(1);
    });

    test("should handle unexpected error", async () => {
      mockJson.mockImplementation(() => { throw new Error("Unexpected"); });
      const command = RemoveCommand();
      const result = await command.execute(["react"]);
      expect(result).toBe(1);
    });

    test("should handle package names with spaces", async () => {
      // Setup mock for package.json to detect bun
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));

      const command = RemoveCommand();
      const result = await command.execute([
        "@scope/package-name",
        "@another/pkg",
      ]);

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(result).toBe(0);

      // Verify spawn was called with correct args
      expect(mockSpawn).toHaveBeenCalled();
      const calls = mockSpawn.mock.calls;
      const lastCall = calls[calls.length - 1];
      // Bun.spawn(["bun", "remove", ...])
      expect(lastCall[0]).toContain("bun");
      expect(lastCall[0]).toContain("remove");
      expect(lastCall[0]).toContain("@scope/package-name");
    });
  });

  describe("Update Command", () => {
    test("should have correct name and aliases", () => {
      const command = UpdateCommand();
      expect(command.name).toBe("update");
      expect(command.aliases).toContain("u");
    });

    test("should execute successfully", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));
      const command = UpdateCommand();
      const result = await command.execute(["react"]);
      expect(result).toBe(0);
      expect(mockSpawn).toHaveBeenCalled();
      const calls = mockSpawn.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain("bun");
      expect(lastCall[0]).toContain("upgrade");
    });

    test("should handle no package manager detected", async () => {
      mockExists.mockImplementation(() => Promise.resolve(false));
      const command = UpdateCommand();
      const result = await command.execute(["react"]);
      expect(result).toBe(1);
    });
  });

  describe("Run Command", () => {
    test("should have correct name", () => {
      const command = RunCommand();
      expect(command.name).toBe("run");
    });

    test("should return error when no script is specified", async () => {
      const command = RunCommand();
      const result = await command.execute([]);
      expect(result).toBe(1);
    });

    test("should execute successfully", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));
      const command = RunCommand();
      const result = await command.execute(["build"]);
      expect(result).toBe(0);
      expect(mockSpawn).toHaveBeenCalled();
      const calls = mockSpawn.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain("bun");
      expect(lastCall[0]).toContain("run");
      expect(lastCall[0]).toContain("build");
    });

    test("should handle no package manager detected", async () => {
      mockExists.mockImplementation(() => Promise.resolve(false));
      const command = RunCommand();
      const result = await command.execute(["build"]);
      expect(result).toBe(1);
    });
  });

  describe("Exec Command", () => {
    test("should have correct name and aliases", () => {
      const command = ExecCommand();
      expect(command.name).toBe("exec");
      expect(command.aliases).toContain("x");
    });

    test("should return error when no command is specified", async () => {
      const command = ExecCommand();
      const result = await command.execute([]);
      expect(result).toBe(1);
    });

    test("should execute successfully", async () => {
      mockJson.mockImplementation(() => Promise.resolve({ packageManager: "bun@1.0.0" }));
      const command = ExecCommand();
      const result = await command.execute(["tsc"]);
      expect(result).toBe(0);
      expect(mockSpawn).toHaveBeenCalled();
      const calls = mockSpawn.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain("bunx");
      expect(lastCall[0]).toContain("tsc");
    });

    test("should handle no package manager detected", async () => {
      mockExists.mockImplementation(() => Promise.resolve(false));
      const command = ExecCommand();
      const result = await command.execute(["tsc"]);
      expect(result).toBe(1);
    });
  });
});
