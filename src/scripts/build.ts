import { execSync } from "child_process";
import { statSync, rmSync, mkdirSync } from "fs";
import { join } from "path";

const outDir = "./out";

// Define all possible targets
const allTargets = [
  "bun-linux-x64",
  "bun-linux-arm64",
  "bun-darwin-x64",
  "bun-darwin-arm64",
  "bun-windows-x64",
  "bun-linux-x64-musl",
  "bun-linux-arm64-musl",
];

// Map bun target names to clean platform names for release binaries
const platformNames: Record<string, string> = {
  "bun-linux-x64": "linux-x64",
  "bun-linux-arm64": "linux-arm64",
  "bun-darwin-x64": "darwin-x64",
  "bun-darwin-arm64": "darwin-arm64",
  "bun-windows-x64": "windows-x64",
  "bun-linux-x64-musl": "linux-x64-musl",
  "bun-linux-arm64-musl": "linux-arm64-musl",
};

// Get the target from the command line arguments
// Expecting something like: bun run build --target bun-linux-x64
const args = process.argv.slice(2);
let targetFromArgs: string | undefined;

const targetArgIndex = args.indexOf("--target");
if (targetArgIndex !== -1 && args[targetArgIndex + 1]) {
  targetFromArgs = args[targetArgIndex + 1];
}

// Determine the targets to build
const targetsToBuild = targetFromArgs ? [targetFromArgs] : allTargets;

// Ensure the output directory exists
if (!statSync(outDir, { throwIfNoEntry: false })) {
  mkdirSync(outDir, { recursive: true });
}

for (const target of targetsToBuild) {
  // Validate if the target is in the list of all possible targets
  if (!allTargets.includes(target)) {
    console.error(`Error: Invalid target specified: ${target}`);
    process.exit(1); // Exit if an invalid target is passed
  }

  const platformArch = platformNames[target] || target.replace("bun-", "");
  const isWindows = target.includes("windows");

  // Define the final filename - simple and predictable for installers/updaters
  // Format: unipm-<platform>[-<arch>][.exe]
  const finalFilename = `unipm-${platformArch}${isWindows ? ".exe" : ""}`;
  const outFile = join(outDir, finalFilename);

  // Construct the build command
  const command = `bun build --compile --minify --sourcemap ./src/cli/index.ts --outfile ${outFile} --target=${target}`;

  try {
    // Check if the output file already exists and delete it
    // bun build --compile throws an error if the output file already exists
    if (statSync(outFile, { throwIfNoEntry: false })) {
      console.log(`Output file ${outFile} already exists. Deleting...`);
      rmSync(outFile);
      console.log(`Deleted ${outFile}.`);
    }

    console.log(`Executing command: ${command}`);
    execSync(command, { stdio: "inherit" });
    console.log(
      `Build for ${target} completed successfully! Output: ${outFile}`
    );
  } catch (error) {
    console.error(`Error during build for ${target}:`, error);
    // Decide if you want to exit on first error or continue with other targets
    // process.exit(1); // Consider exiting on error in CI
  }
}

console.log("All requested builds completed.");
