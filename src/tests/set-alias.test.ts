import { Command, findUnipmBinary } from "../commands/set-alias";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

describe("Set-Alias Command", () => {
  let originalConsoleLog: typeof console.log;
  let mockConsoleLog: any;
  let originalBunFile: typeof Bun.file;
  let mockBunFile: any;
  let mockExists: any;
  let mockSpawn: any;
  let originalSpawn: typeof Bun.spawn;
  let originalExecPath: string;

  beforeEach(() => {
    // Mock console.log
    originalConsoleLog = console.log;
    mockConsoleLog = vi.fn();
    console.log = mockConsoleLog;

    // Mock Bun.file
    mockExists = vi.fn(() => Promise.resolve(false));

    mockBunFile = vi.fn((path: string) => {
      return {
        exists: () => mockExists(path),
        json: () => Promise.resolve({}),
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
        stderr: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      };
    });

    originalSpawn = Bun.spawn;
    // @ts-ignore
    Bun.spawn = mockSpawn;

    // Save original execPath and mock it
    originalExecPath = process.execPath;
    Object.defineProperty(process, "execPath", {
      value: "/usr/local/bin/unipm",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    // @ts-ignore
    Bun.file = originalBunFile;
    // @ts-ignore
    Bun.spawn = originalSpawn;
    Object.defineProperty(process, "execPath", {
      value: originalExecPath,
      writable: true,
      configurable: true,
    });
  });

  describe("Command metadata", () => {
    test("should have correct name and aliases", () => {
      const command = Command();
      expect(command.name).toBe("set-alias");
      expect(command.aliases).toContain("alias");
    });

    test("should have a description", () => {
      const command = Command();
      expect(command.description).toBe("Create a shell alias for unipm");
    });
  });

  describe("Argument validation", () => {
    test("should return error when no alias name is provided", async () => {
      const command = Command();
      const result = await command.execute([]);
      expect(result).toBe(1);
    });

    test("should return error for invalid alias name with special characters", async () => {
      const command = Command();
      const result = await command.execute(["test@invalid"]);
      expect(result).toBe(1);
    });

    test("should return error for alias name with spaces", async () => {
      const command = Command();
      const result = await command.execute(["test invalid"]);
      expect(result).toBe(1);
    });

    test("should return error when trying to create alias named 'unipm'", async () => {
      const command = Command();
      const result = await command.execute(["unipm"]);
      expect(result).toBe(1);
    });

    test("should accept valid alias names with letters", async () => {
      const command = Command();
      const result = await command.execute(["upm"]);
      // Should succeed (exit code 0) since we mocked everything
      expect(result).toBe(0);
    });

    test("should accept valid alias names with numbers", async () => {
      const command = Command();
      const result = await command.execute(["upm2"]);
      expect(result).toBe(0);
    });

    test("should accept valid alias names with dashes", async () => {
      const command = Command();
      const result = await command.execute(["my-upm"]);
      expect(result).toBe(0);
    });

    test("should accept valid alias names with underscores", async () => {
      const command = Command();
      const result = await command.execute(["my_upm"]);
      expect(result).toBe(0);
    });
  });

  describe("Alias creation", () => {
    test("should return error when alias file already exists", async () => {
      // Make the alias path exist
      mockExists.mockImplementation((path: string) => {
        if (path.includes("upm")) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      const command = Command();
      const result = await command.execute(["upm"]);
      expect(result).toBe(1);
    });

    test("should create symlink on Unix systems", async () => {
      const command = Command();
      const result = await command.execute(["upm"]);

      expect(result).toBe(0);
      expect(mockSpawn).toHaveBeenCalled();

      // Check that ln -s was called
      const lnCall = mockSpawn.mock.calls.find(
        (call: any[]) => call[0] && call[0][0] === "ln"
      );
      expect(lnCall).toBeDefined();
      expect(lnCall![0]).toContain("-s");
    });

    test("should handle symlink creation failure", async () => {
      mockSpawn.mockImplementation((cmd: string[]) => {
        if (cmd[0] === "ln") {
          return {
            exited: Promise.resolve(1),
            stdout: new ReadableStream({
              start(c) {
                c.close();
              },
            }),
            stderr: new ReadableStream({
              start(c) {
                c.close();
              },
            }),
          };
        }
        return {
          exited: Promise.resolve(0),
          stdout: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
          stderr: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
        };
      });

      const command = Command();
      const result = await command.execute(["upm"]);
      expect(result).toBe(1);
    });

    test("should handle spawn exception", async () => {
      mockSpawn.mockImplementation((cmd: string[]) => {
        if (cmd[0] === "ln") {
          throw new Error("Spawn failed");
        }
        return {
          exited: Promise.resolve(0),
          stdout: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
          stderr: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
        };
      });

      const command = Command();
      const result = await command.execute(["upm"]);
      expect(result).toBe(1);
    });
  });

  describe("findUnipmBinary", () => {
    test("should return execPath when running as compiled binary", async () => {
      Object.defineProperty(process, "execPath", {
        value: "/home/user/.local/bin/unipm",
        writable: true,
        configurable: true,
      });

      const result = await findUnipmBinary();
      expect(result).toBe("/home/user/.local/bin/unipm");
    });

    test("should check common paths when running from bun", async () => {
      Object.defineProperty(process, "execPath", {
        value: "/home/user/.bun/bin/bun",
        writable: true,
        configurable: true,
      });

      // Mock file exists for the first common path
      mockExists.mockImplementation((path: string) => {
        if (path.includes(".local/bin/unipm")) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      const result = await findUnipmBinary();
      expect(result).toContain("unipm");
    });

    test("should use which command as fallback", async () => {
      Object.defineProperty(process, "execPath", {
        value: "/home/user/.bun/bin/bun",
        writable: true,
        configurable: true,
      });

      // All file checks return false
      mockExists.mockImplementation(() => Promise.resolve(false));

      // Mock 'which' command to return a path
      mockSpawn.mockImplementation((cmd: string[]) => {
        if (cmd[0] === "which" || cmd[0] === "where") {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("/opt/bin/unipm\n"));
              controller.close();
            },
          });
          return {
            exited: Promise.resolve(0),
            stdout: stream,
            stderr: new ReadableStream({
              start(c) {
                c.close();
              },
            }),
          };
        }
        return {
          exited: Promise.resolve(0),
          stdout: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
          stderr: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
        };
      });

      const result = await findUnipmBinary();
      expect(result).toBe("/opt/bin/unipm");
    });

    test("should return null when binary not found", async () => {
      Object.defineProperty(process, "execPath", {
        value: "/home/user/.bun/bin/bun",
        writable: true,
        configurable: true,
      });

      // All file checks return false
      mockExists.mockImplementation(() => Promise.resolve(false));

      // Mock 'which' command to fail
      mockSpawn.mockImplementation((cmd: string[]) => {
        if (cmd[0] === "which" || cmd[0] === "where") {
          return {
            exited: Promise.resolve(1),
            stdout: new ReadableStream({
              start(c) {
                c.close();
              },
            }),
            stderr: new ReadableStream({
              start(c) {
                c.close();
              },
            }),
          };
        }
        return {
          exited: Promise.resolve(0),
          stdout: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
          stderr: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
        };
      });

      const result = await findUnipmBinary();
      expect(result).toBeNull();
    });
  });

  describe("Output messages", () => {
    test("should output creating alias message", async () => {
      const command = Command();
      await command.execute(["upm"]);

      expect(mockConsoleLog).toHaveBeenCalled();
      const output = mockConsoleLog.mock.calls.flat().join(" ");
      expect(output).toContain("upm");
    });

    test("should output success message on successful creation", async () => {
      const command = Command();
      await command.execute(["upm"]);

      expect(mockConsoleLog).toHaveBeenCalled();
      const output = mockConsoleLog.mock.calls.flat().join(" ");
      expect(output).toContain("success");
    });
  });
});
