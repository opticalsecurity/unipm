import { expect, test, describe, vi } from "vitest";
import {
  GetCommandByName,
  GetCommands,
  ExecuteCommand,
} from "../core/registry";

describe("Command Registry", () => {
  test("GetCommands should return a list of commands", async () => {
    const commands = await GetCommands();
    expect(commands).toBeDefined();
    expect(commands.length).toBeGreaterThan(0);

    // Each command should have a name and description
    commands.forEach((command) => {
      expect(command).toHaveProperty("name");
      expect(command).toHaveProperty("description");
      expect(typeof command.name).toBe("string");
      expect(typeof command.description).toBe("string");
    });
  });

  test("GetCommandByName should find a command by its name", async () => {
    const command = await GetCommandByName("help");
    expect(command).toBeDefined();
    expect(command.name).toBe("help");
    expect(command.description).toBeDefined();
    expect(command.execute).toBeDefined();
  });

  test("GetCommandByName should find a command by its alias", async () => {
    const command = await GetCommandByName("h"); // 'h' is an alias for 'help'
    expect(command).toBeDefined();
    expect(command.name).toBe("help");
    expect(command.aliases).toContain("h");
  });

  test("GetCommandByName should throw an error for invalid commands", async () => {
    await expect(GetCommandByName("invalid-command")).rejects.toThrow(
      "Command invalid-command not found"
    );
  });

  test("ExecuteCommand should execute a command's execute function", async () => {
    // Mock console.log to verify execution
    const originalConsoleLog = console.log;
    const mockConsoleLog = vi.fn(() => { });
    console.log = mockConsoleLog;

    await ExecuteCommand("help", []);

    expect(mockConsoleLog).toHaveBeenCalled();

    // Restore original console.log
    console.log = originalConsoleLog;
  });
});
