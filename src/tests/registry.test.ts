import {
  GetCommands,
  GetCommandByName,
  ExecuteCommand,
} from "../core/registry";
import { describe, test, expect, vi } from "vitest";

describe("Command Registry", () => {
  test("GetCommands should return all commands", async () => {
    const commands = await GetCommands();
    expect(commands.length).toBeGreaterThan(0);
    expect(commands[0]).toHaveProperty("name");
    expect(commands[0]).toHaveProperty("description");
    expect(commands[0]).toHaveProperty("aliases");
  });

  test("GetCommandByName should find command by name", async () => {
    const command = await GetCommandByName("help");
    expect(command.name).toBe("help");
  });

  test("GetCommandByName should find command by alias", async () => {
    const command = await GetCommandByName("h");
    expect(command.name).toBe("help");
  });

  test("GetCommandByName should throw error for unknown command", async () => {
    await expect(GetCommandByName("unknown")).rejects.toThrow(
      "Command unknown not found"
    );
  });

  test("ExecuteCommand should execute the command", async () => {
    // Mock console.log to avoid output
    const originalLog = console.log;
    console.log = vi.fn();

    const result = await ExecuteCommand("help", []);

    expect(console.log).toHaveBeenCalled();

    console.log = originalLog;
  });
});
