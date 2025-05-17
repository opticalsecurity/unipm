export function Command() {
  return {
    name: "detect",
    description: "Show the current project package manager",
    aliases: ["d"],
    execute: async (args: string[]) => {
      const { parseContent } = await import("../helpers/content-parser");
      const { DetectContent } = await import("./contents/detect");
      const { DetectPackageManager } = await import(
        "../layers/package-manager-detection"
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
