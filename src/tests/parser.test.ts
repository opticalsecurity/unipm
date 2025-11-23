import { parseContent } from "../utils/parser";
import { describe, test, expect, vi } from "vitest";

// Mock chalk to return predictable strings
vi.mock("chalk", () => {
    return {
        default: {
            red: (text: string) => `[red]${text}[/red]`,
            bold: (text: string) => `[bold]${text}[/bold]`,
            // Add other used styles if needed
        },
    };
});

describe("Content Parser", () => {
    test("should return plain text unchanged", () => {
        const template = "Hello World";
        const result = parseContent(template, {});
        expect(result).toBe("Hello World");
    });

    test("should interpolate variables", () => {
        const template = "Hello [#variables.name]";
        const result = parseContent(template, { name: "World" });
        expect(result).toBe("Hello World");
    });

    test("should handle missing variables", () => {
        const template = "Hello [#variables.name]";
        const result = parseContent(template, {});
        expect(result).toBe("Hello ");
    });

    test("should apply text styles", () => {
        const template = "[#text.red]Error[#text.reset]";
        const result = parseContent(template, {});
        // Chalk adds ANSI codes, so we check if it's not equal to plain text
        expect(result).toBe("[red]Error[/red]");
    });

    test("should handle unknown styles gracefully", () => {
        const template = "[#text.unknown]Text[#text.reset]";
        const result = parseContent(template, {});
        expect(result).toBe("Text");
    });

    test("should handle nested styles", () => {
        const template = "[#text.red][#text.bold]Bold Red[#text.reset]";
        const result = parseContent(template, {});
        // Parser processes empty strings between tags too
        // "" -> [red] -> "" (red) -> [bold] -> "Bold Red" (red+bold) -> [reset] -> ""
        // red("") -> [red][/red]
        // bold(red("Bold Red")) -> [bold][red]Bold Red[/red][/bold]
        expect(result).toBe("[red][/red][bold][red]Bold Red[/red][/bold]");
    });

    test("should apply styles to variables", () => {
        const template = "[#text.red][#variables.error][#text.reset]";
        const result = parseContent(template, { error: "Fatal Error" });
        // "" -> [red] -> "Fatal Error" (red) -> [reset] -> ""
        // red("") -> [red][/red]
        // red("Fatal Error") -> [red]Fatal Error[/red]
        expect(result).toBe("[red][/red][red]Fatal Error[/red][red][/red]");
    });
});
