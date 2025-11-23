import { executeCommand, executePackageManagerCommand } from "../core/execution";
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

    test("should execute command successfully", async () => {
        const result = await executeCommand("echo", ["hello"]);

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("stdout output");
        expect(result.stderr).toBe("stderr output");
    });

    test("should handle execution failure", async () => {
        mockBunSpawn.mockImplementation(() => {
            return {
                exited: Promise.resolve(1),
                stdout: new ReadableStream({ start(c) { c.close(); } }),
                stderr: new ReadableStream({ start(c) { c.close(); } }),
                kill: vi.fn(),
            };
        });

        const result = await executeCommand("fail");

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
                stdout: new ReadableStream({ start(c) { c.close(); } }),
                stderr: new ReadableStream({ start(c) { c.close(); } }),
                kill: vi.fn(() => {
                    killMock();
                    resolveExited(null as any);
                }),
                signalCode: "SIGTERM",
            };
        });

        // Use real timers, short timeout
        const promise = executeCommand("sleep", ["10"], { timeout: 100 });

        // Wait for timeout + buffer
        await new Promise(resolve => setTimeout(resolve, 200));

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

        await executeCommand("echo", ["hello"], {
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

        const result = await executeCommand("fail");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error!.message).toContain("Spawn failed");
    });
});
