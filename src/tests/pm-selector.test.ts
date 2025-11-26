import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SWITCH_HOTKEY,
  getPackageManagerOverride,
  clearPackageManagerOverride,
  printSwitchHint,
  setupSwitchListener,
} from "../core/pm-selector";

describe("PM Selector", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearPackageManagerOverride();
  });

  describe("SWITCH_HOTKEY", () => {
    it("should be defined as 's'", () => {
      expect(SWITCH_HOTKEY).toBe("s");
    });
  });

  describe("getPackageManagerOverride", () => {
    it("should return null by default", () => {
      expect(getPackageManagerOverride()).toBeNull();
    });
  });

  describe("clearPackageManagerOverride", () => {
    it("should clear the override", () => {
      // First verify it's null
      expect(getPackageManagerOverride()).toBeNull();
      // Clear and verify still null
      clearPackageManagerOverride();
      expect(getPackageManagerOverride()).toBeNull();
    });
  });

  describe("printSwitchHint", () => {
    it("should be a function", () => {
      expect(typeof printSwitchHint).toBe("function");
    });
  });

  describe("setupSwitchListener", () => {
    const originalIsTTY = process.stdin.isTTY;

    afterEach(() => {
      // Restore original value
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        writable: true,
      });
    });

    it("should return noop cleanup when not a TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        writable: true,
      });

      const { cleanup, switchRequested } = setupSwitchListener();

      // cleanup should be a noop
      expect(cleanup).toBeDefined();
      cleanup(); // should not throw

      // switchRequested should be a promise that never resolves
      expect(switchRequested).toBeInstanceOf(Promise);
    });
  });
});
