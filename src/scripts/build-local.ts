import { statSync, rmSync, mkdirSync, renameSync } from "fs";
import { join } from "path";

// Helper function to format date components to two digits
const formatDateComponent = (component: number): string => {
  return component.toString().padStart(2, "0");
};

const bunExecutable = process.execPath;

// Get current date components
const currentDate = new Date();
const day = formatDateComponent(currentDate.getDate());
const month = formatDateComponent(currentDate.getMonth() + 1); // Month is 0-indexed
const year = formatDateComponent(currentDate.getFullYear() % 100); // Get last two digits of the year

// Get the first 7 digits of the current commit SHA
const shaResult = Bun.spawnSync(["git", "rev-parse", "--short=7", "HEAD"], {
  stdout: "pipe",
  stderr: "inherit",
});
if (shaResult.exitCode !== 0) {
  throw new Error(`Failed to resolve git SHA: exit code ${shaResult.exitCode}`);
}
const shortSha = shaResult.stdout.toString().trim();

const outDir = "./out";
const rootDir = ".";

// Detect current OS and architecture
const detectTarget = (): string => {
  const platform = process.platform;
  const arch = process.arch;

  let bunPlatform: string;
  switch (platform) {
    case "linux":
      bunPlatform = "linux";
      break;
    case "darwin":
      bunPlatform = "darwin";
      break;
    case "win32":
      bunPlatform = "windows";
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  let bunArch: string;
  switch (arch) {
    case "x64":
      bunArch = "x64";
      break;
    case "arm64":
      bunArch = "arm64";
      break;
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }

  return `bun-${bunPlatform}-${bunArch}`;
};

const target = detectTarget();
const platformArch = target.replace("bun-", ""); // "linux-x64", "windows-x64", etc.

// Define the final filename
const finalFilename = `unipm-${year}-${month}-${day}-${shortSha}-${platformArch}`;
const isWindows = process.platform === "win32";
const executableName = isWindows ? "unipm.exe" : "unipm";

const outFile = join(outDir, finalFilename);
const rootFile = join(rootDir, executableName);

// Ensure the output directory exists
if (!statSync(outDir, { throwIfNoEntry: false })) {
  mkdirSync(outDir, { recursive: true });
}

// Construct the build command
const command = [
  bunExecutable,
  "build",
  "--compile",
  "--minify",
  "--sourcemap=none",
  "./src/cli/index.ts",
  "--outfile",
  outFile,
  `--target=${target}`,
] as const;

try {
  // Check if the output file already exists and delete it
  const outFileWithExt = isWindows ? `${outFile}.exe` : outFile;
  if (statSync(outFileWithExt, { throwIfNoEntry: false })) {
    console.log(`Output file ${outFileWithExt} already exists. Deleting...`);
    rmSync(outFileWithExt);
    console.log(`Deleted ${outFileWithExt}.`);
  }

  // Check if the root file already exists and delete it
  if (statSync(rootFile, { throwIfNoEntry: false })) {
    console.log(`Root file ${rootFile} already exists. Deleting...`);
    rmSync(rootFile);
    console.log(`Deleted ${rootFile}.`);
  }

  console.log(`Detected target: ${target}`);
  console.log(`Executing command: bun ${command.slice(1).join(" ")}`);
  const result = Bun.spawnSync(command, {
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    throw new Error(`bun build failed with exit code ${result.exitCode}`);
  }
  console.log(`Build completed successfully! Output: ${outFileWithExt}`);

  // Move the binary to the project root
  console.log(`Moving ${outFileWithExt} to ${rootFile}...`);
  renameSync(outFileWithExt, rootFile);
  console.log(`Binary moved to ${rootFile}`);
} catch (error) {
  console.error(`Error during build:`, error);
  process.exit(1);
}
