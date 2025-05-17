import { parseContent } from "./helpers/content-parser";
import { HelpContent } from "./commands/contents/help";

const output = parseContent(HelpContent, {
  version: "1.0.0",
  commandsTable: `testNotTable`,
});

console.log(output);
