import chalk from "chalk";

/**
 * Parses a template with variable tags and text styles.
 * Supports:
 * - [#variables.key]: injects the value of variables[key]
 * - [#text.color]: applies style to following text until [#text.reset]
 */
export function parseContent(
  template: string,
  variables: Record<string, any>
): string {
  const tokenRegex = /(\[#(?:text|variables)\.[^\]]+\])/g;
  const parts = template.split(tokenRegex);
  let styleStack: string[] = [];
  let currentChalk = chalk;
  let output = "";

  for (const part of parts) {
    const match = part.match(/^\[#(text|variables)\.([^\]]+)\]$/);
    if (match) {
      const [, type, key] = match;
      if (type === "text") {
        if (key === "reset") {
          styleStack = [];
        } else if (key !== undefined) {
          styleStack.push(key);
        }
        // Rebuild the chalk builder according to the style stack
        currentChalk = styleStack.reduce((ch, style) => {
          if (typeof (chalk as any)[style] === "function") {
            return (ch as any)[style]();
          }
          return ch;
        }, chalk);
      } else if (type === "variables") {
        if (key !== undefined) {
          const val = variables[key];
          output += currentChalk(val != null ? String(val) : "");
        }
      }
    } else {
      output += currentChalk(part);
    }
  }

  return output;
}
