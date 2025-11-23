import { CheckVersion } from "../utils/version";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

describe("Version Check", () => {
    let originalFetch: any;
    let mockFetch: any;
    let originalConsoleLog: any;
    let mockConsoleLog: any;

    beforeEach(() => {
        originalFetch = global.fetch;
        mockFetch = vi.fn();
        global.fetch = mockFetch;

        originalConsoleLog = console.log;
        mockConsoleLog = vi.fn();
        console.log = mockConsoleLog;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        console.log = originalConsoleLog;
    });

    test("should check version successfully", async () => {
        mockFetch.mockResolvedValue({
            json: () => Promise.resolve({ tag_name: "v1.0.0" }),
        });

        await CheckVersion();

        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.github.com/repos/opticalsecurity/unipm/releases/latest",
            expect.any(Object)
        );
        expect(mockConsoleLog).toHaveBeenCalledWith("Latest version: v1.0.0");
    });

    test("should handle fetch error", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));

        // The current implementation doesn't catch errors, so it should throw
        await expect(CheckVersion()).rejects.toThrow("Network error");
    });
});
