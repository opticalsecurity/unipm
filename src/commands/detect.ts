export function Command() {
  return {
    name: "detect",
    description: "Show the current project package manager",
    aliases: ["d"],
    execute: async (args: string[]) => {
      const { parseContent } = await import("../utils/parser");
      const { DetectContent } = await import("../constants/help-text");
      const { DetectPackageManager } = await import(
        "../core/detection"
      );
      const { version } = await import("../../package.json");

      const detectedPackageManager = await DetectPackageManager();
      const output = parseContent(DetectContent, {
        version,
        packageManager: detectedPackageManager.name,
        packageManagerVersion: detectedPackageManager.version || "unknown",
        detectionSource: detectedPackageManager.detectionSource,
        detectionHint: detectedPackageManager.detectionHint,
      });

      console.log(output);
    },
  };
}
