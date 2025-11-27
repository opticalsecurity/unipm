import {
  executeCommand,
  executePackageManagerCommand,
  sanitizeArgument,
  validateCommand,
} from "../core/execution";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

describe("Execution", () => {
  let originalBunSpawn: any;
  let mockBunSpawn: any;

  beforeEach(() => {
    mockBunSpawn = vi.fn(() => {
      return {
        exited: Promise.resolve(0),
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("stdout output"));
            controller.close();
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("stderr output"));
            controller.close();
          },
        }),
        kill: vi.fn(),
      };
    });

    originalBunSpawn = Bun.spawn;
    // @ts-ignore
    Bun.spawn = mockBunSpawn;
  });

  afterEach(() => {
    // @ts-ignore
    Bun.spawn = originalBunSpawn;
  });

  test("should execute allowed command successfully", async () => {
    const result = await executeCommand("npm", ["install"]);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("stdout output");
    expect(result.stderr).toBe("stderr output");
  });

  test("should handle execution failure", async () => {
    mockBunSpawn.mockImplementation(() => {
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
        kill: vi.fn(),
      };
    });

    const result = await executeCommand("npm", ["fail"]);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test("should handle timeout", async () => {
    const killMock = vi.fn();
    let resolveExited: (value: number) => void;
    const exitedPromise = new Promise<number>((resolve) => {
      resolveExited = resolve;
    });

    mockBunSpawn.mockImplementation(() => {
      return {
        exited: exitedPromise,
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
        kill: vi.fn(() => {
          killMock();
          resolveExited(null as any);
        }),
        signalCode: "SIGTERM",
      };
    });

    // Use real timers, short timeout
    const promise = executeCommand("bun", ["run", "long-task"], {
      timeout: 100,
    });

    // Wait for timeout + buffer
    await new Promise((resolve) => setTimeout(resolve, 200));

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain("Command timed out");
    expect(killMock).toHaveBeenCalled();
  });

  test("should handle live output", async () => {
    const onStdout = vi.fn();
    const onStderr = vi.fn();

    // Mock process.stdout/stderr write to avoid cluttering test output
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;
    process.stdout.write = vi.fn();
    process.stderr.write = vi.fn();

    await executeCommand("npm", ["install"], {
      liveOutput: true,
      onStdout,
      onStderr,
    });

    expect(onStdout).toHaveBeenCalledWith("stdout output");
    expect(onStderr).toHaveBeenCalledWith("stderr output");
    expect(process.stdout.write).toHaveBeenCalledWith("stdout output");
    expect(process.stderr.write).toHaveBeenCalledWith("stderr output");

    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  test("executePackageManagerCommand should parse command string correctly", async () => {
    await executePackageManagerCommand("npm install", ["pkg"]);

    expect(mockBunSpawn).toHaveBeenCalled();
    const calls = mockBunSpawn.mock.calls;
    const lastCall = calls[calls.length - 1];

    // Should be ["npm", "install", "pkg"]
    expect(lastCall[0]).toEqual(["npm", "install", "pkg"]);
  });

  test("should handle spawn exception", async () => {
    mockBunSpawn.mockImplementation(() => {
      throw new Error("Spawn failed");
    });

    const result = await executeCommand("npm", ["test"]);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain("Spawn failed");
  });
});

describe("Security Validation", () => {
  test("should reject disallowed commands", () => {
    expect(() => validateCommand("echo")).toThrow("Security error");
    expect(() => validateCommand("rm")).toThrow("Security error");
    expect(() => validateCommand("cat")).toThrow("Security error");
    expect(() => validateCommand("curl")).toThrow("Security error");
  });

  test("should allow package manager commands", () => {
    expect(() => validateCommand("npm")).not.toThrow();
    expect(() => validateCommand("pnpm")).not.toThrow();
    expect(() => validateCommand("yarn")).not.toThrow();
    expect(() => validateCommand("bun")).not.toThrow();
    expect(() => validateCommand("npx")).not.toThrow();
    expect(() => validateCommand("bunx")).not.toThrow();
  });

  test("should reject arguments with shell metacharacters", () => {
    expect(() => sanitizeArgument("react")).not.toThrow();
    expect(() => sanitizeArgument("react@latest")).not.toThrow();
    expect(() => sanitizeArgument("--save-dev")).not.toThrow();

    expect(() => sanitizeArgument("react; rm -rf /")).toThrow("Security error");
    expect(() => sanitizeArgument("react | cat /etc/passwd")).toThrow(
      "Security error"
    );
    expect(() => sanitizeArgument("$(whoami)")).toThrow("Security error");
    expect(() => sanitizeArgument("`whoami`")).toThrow("Security error");
    expect(() => sanitizeArgument("react && malicious")).toThrow(
      "Security error"
    );
  });

  test("should reject arguments with newlines", () => {
    expect(() => sanitizeArgument("react\nrm -rf /")).toThrow("Security error");
    expect(() => sanitizeArgument("react\r\nmalicious")).toThrow(
      "Security error"
    );
  });

  test("should trim whitespace from arguments", () => {
    expect(sanitizeArgument("  react  ")).toBe("react");
    expect(sanitizeArgument("\treact\t")).toBe("react");
  });

  test("executeCommand should reject disallowed commands", async () => {
    const result = await executeCommand("rm", ["-rf", "/"]);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain("Security error");
    expect(result.error!.message).toContain("not allowed");
  });

  test("executeCommand should reject dangerous arguments", async () => {
    const result = await executeCommand("npm", ["install", "react; rm -rf /"]);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.message).toContain("Security error");
  });
});
