import { expect, test, describe } from "vitest";
import { parseContent } from "../utils/parser";

describe("Content Parser", () => {
  test("should parse a simple template without variables", () => {
    const template = "Hello, World!";
    const result = parseContent(template, {});

    expect(result).toBe("Hello, World!");
  });

  test("should replace variables in template", () => {
    const template = "Hello, [#variables.name]!";
    const variables = { name: "John" };

    const result = parseContent(template, variables);

    expect(result).toBe("Hello, John!");
  });

  test("should handle multiple variables", () => {
    const template = "[#variables.greeting], [#variables.name]!";
    const variables = { greeting: "Hello", name: "John" };

    const result = parseContent(template, variables);

    expect(result).toBe("Hello, John!");
  });

  test("should handle undefined variables", () => {
    const template = "Hello, [#variables.name]!";
    const variables = {};

    const result = parseContent(template, variables);

    expect(result).toBe("Hello, !");
  });

  test("should handle text styling", () => {
    // We can't easily test the actual chalk styling output, but we can
    // test that the styling doesn't break the string structure
    const template = "[#text.green]Green text[#text.reset] and normal text";

    const result = parseContent(template, {});

    // The result should contain the original text, though it may have ANSI codes around it
    expect(result).toContain("Green text");
    expect(result).toContain("and normal text");
  });

  test("should handle nested text styling", () => {
    const template =
      "[#text.bold][#text.green]Bold and green[#text.reset] just bold[#text.reset] normal";

    const result = parseContent(template, {});

    expect(result).toContain("Bold and green");
    expect(result).toContain("just bold");
    expect(result).toContain("normal");
  });

  test("should style variables", () => {
    const template = "[#text.green][#variables.name][#text.reset]";
    const variables = { name: "John" };

    const result = parseContent(template, variables);

    // The result should contain the variable value, though it may have ANSI codes around it
    expect(result).toContain("John");
  });

  test("should apply all accumulated styles", () => {
    const template =
      "[#text.bold][#text.green][#variables.message][#text.reset]";
    const variables = { message: "Important message" };

    const result = parseContent(template, variables);

    // We can't easily inspect ANSI codes, but the original text should be there
    expect(result).toContain("Important message");
  });

  test("should ignore unknown styles", () => {
    const template = "[#text.nonexistent]Normal text[#text.reset]";

    const result = parseContent(template, {});

    expect(result).toBe("Normal text");
  });
});
