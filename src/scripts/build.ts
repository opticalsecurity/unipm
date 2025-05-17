import { execSync } from "child_process";
import { statSync, rmSync } from "fs";
import { join } from "path";

// Helper function to format date components to two digits
const formatDateComponent = (component: number): string => {
  return component.toString().padStart(2, "0");
};

// Get current date components
const currentDate = new Date();
const day = formatDateComponent(currentDate.getDate());
const month = formatDateComponent(currentDate.getMonth() + 1); // Month is 0-indexed
const year = formatDateComponent(currentDate.getFullYear() % 100); // Get last two digits of the year

// Get the first 7 digits of the current commit SHA
const shortSha = execSync("git rev-parse --short=7 HEAD").toString().trim();

const outDir = "./out";
const targets = [
  "bun-linux-x64",
  "bun-linux-arm64",
  "bun-darwin-arm64",
  "bun-windows-x64",
  "bun-linux-x64-musl",
  "bun-linux-arm64-musl",
];

for (const target of targets) {
  const platformArch = target.replace("bun-", ""); // "linux-x64", "linux-arm64", "darwin-arm64"
  // Define the final filename
  const finalFilename = `unipm-${year}-${month}-${day}-${shortSha}-${platformArch}`;
  const outFile = join(outDir, finalFilename);

  // Construct the build command
  const command = `bun build --compile --minify --sourcemap ./src/entrypoint.ts --outfile ${outFile} --target=${target}`;

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
    // process.exit(1);
  }
}

console.log("All builds completed.");
