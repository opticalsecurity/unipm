import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "../commands/update-self";

describe("update-self Command", () => {
  let command: ReturnType<typeof Command>;

  beforeEach(() => {
    vi.resetAllMocks();
    command = Command();
  });

  describe("Command metadata", () => {
    it("should have correct name", () => {
      expect(command.name).toBe("update-self");
    });

    it("should have correct description", () => {
      expect(command.description).toBe("Update unipm to the latest version");
    });

    it("should have correct aliases", () => {
      expect(command.aliases).toContain("self-update");
      expect(command.aliases).toContain("upgrade-self");
    });

    it("should have execute function", () => {
      expect(typeof command.execute).toBe("function");
    });
  });
});
