import { getEffectivePackageManager } from "../core/command-runner";
import { parseContent } from "../utils/parser";
import { DetectContent } from "../constants/help-text";

export function Command() {
  return {
    name: "detect",
    description: "Show the current project package manager",
    aliases: ["d"],
    execute: async (_args: string[]): Promise<void> => {
      const detectedPackageManager = await getEffectivePackageManager();
      const output = parseContent(DetectContent, {
        packageManager: detectedPackageManager.name,
        packageManagerVersion: detectedPackageManager.version || "unknown",
        detectionSource: detectedPackageManager.detectionSource,
        detectionHint: detectedPackageManager.detectionHint,
      });

      console.log(output);
    },
  };
}
