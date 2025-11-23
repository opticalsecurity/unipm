import { Logger, LogLevel } from "../utils/logger";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

describe("Logger", () => {
    let originalConsoleLog: any;
    let originalConsoleError: any;
    let mockConsoleLog: any;
    let mockConsoleError: any;
    let originalDebug: any;

    beforeEach(() => {
        originalConsoleLog = console.log;
        originalConsoleError = console.error;
        mockConsoleLog = vi.fn();
        mockConsoleError = vi.fn();
        console.log = mockConsoleLog;
        console.error = mockConsoleError;
        originalDebug = process.env.DEBUG;
    });

    afterEach(() => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        process.env.DEBUG = originalDebug;
    });

    test("info should log to console.log", () => {
        Logger.info("test message");
        expect(mockConsoleLog).toHaveBeenCalled();
        expect(mockConsoleLog.mock.calls[0][0]).toContain("test message");
    });

    test("success should log to console.log", () => {
        Logger.success("test message");
        expect(mockConsoleLog).toHaveBeenCalled();
        expect(mockConsoleLog.mock.calls[0][0]).toContain("test message");
    });

    test("warn should log to console.log", () => {
        Logger.warn("test message");
        expect(mockConsoleLog).toHaveBeenCalled();
        expect(mockConsoleLog.mock.calls[0][0]).toContain("test message");
    });

    test("error should log to console.error", () => {
        Logger.error("test message", "string error");
        expect(mockConsoleError).toHaveBeenCalledTimes(2);
        expect(mockConsoleError.mock.calls[1][0]).toContain("string error");
    });

    test("error should log stack trace when DEBUG env is set", () => {
        process.env.DEBUG = "true";
        const error = new Error("test error");
        Logger.error("test message", error);
        // 1. Message
        // 2. Error message
        // 3. Stack trace
        expect(mockConsoleError).toHaveBeenCalledTimes(3);
        expect(mockConsoleError.mock.calls[2][0]).toContain("Error: test error");
    });

    test("debug should not log when DEBUG env is not set", () => {
        delete process.env.DEBUG;
        Logger.debug("test message");
        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test("debug should log when DEBUG env is set", () => {
        process.env.DEBUG = "true";
        Logger.debug("test message");
        expect(mockConsoleLog).toHaveBeenCalled();
        expect(mockConsoleLog.mock.calls[0][0]).toContain("test message");
    });

    test("debug should log data when provided", () => {
        process.env.DEBUG = "true";
        const data = { key: "value" };
        Logger.debug("test message", data);
        expect(mockConsoleLog).toHaveBeenCalledTimes(2);
        expect(mockConsoleLog.mock.calls[1][0]).toContain('"key": "value"');
    });

    test("command should log to console.log", () => {
        Logger.command("npm install");
        expect(mockConsoleLog).toHaveBeenCalled();
        expect(mockConsoleLog.mock.calls[0][0]).toContain("npm install");
    });
});
