import chalk from "chalk";

// Define supported chalk styles as type
type ChalkStyle = keyof typeof chalk;

/**
 * Parses a template with variable tags and text styles.
 * Supports:
 * - [#variables.key]: injects the value of variables[key]
 * - [#text.color|style]: applies style to following text until [#text.reset]
 */
export function parseContent(
  template: string,
  variables: Record<string, any>
): string {
  const tokenRegex = /(\[#(?:text|variables)\.[^\]]+\])/g;
  const parts = template.split(tokenRegex);
  let styleStack: ChalkStyle[] = [];
  let output = "";

  for (const part of parts) {
    const match = part.match(/^\[#(text|variables)\.([^\]]+)\]$/);
    if (match) {
      const [, type, key] = match;
      if (type === "text") {
        if (key === "reset") {
          styleStack = [];
        } else if (
          key !== undefined &&
          key in chalk &&
          typeof chalk[key as ChalkStyle] === "function"
        ) {
          styleStack.push(key as ChalkStyle);
        }
        // Skip unknown styles silently
      } else if (type === "variables") {
        // Apply current styles to the variable value
        let val = key !== undefined ? variables[key as string] : undefined;
        let formattedVal = val != null ? String(val) : "";

        // Apply all accumulated styles
        let styledText = formattedVal;
        for (const style of styleStack) {
          if (typeof chalk[style] === "function") {
            // Safe to call since we checked in the if condition above
            styledText = (chalk[style] as (text: string) => string)(styledText);
          }
        }

        output += styledText;
      }
    } else {
      // Apply current styles to regular text
      let styledText = part;
      for (const style of styleStack) {
        if (typeof chalk[style] === "function") {
          // Safe to call since we checked in the if condition above
          styledText = (chalk[style] as (text: string) => string)(styledText);
        }
      }

      output += styledText;
    }
  }

  return output;
}
