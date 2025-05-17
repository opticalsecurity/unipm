#!/usr/bin/env bun

import { execSync } from "node:child_process";
import type { ExecSyncOptionsWithStringEncoding } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Formats a number to two digits, adding a leading zero if necessary.
 * @param num The number to format.
 * @returns The formatted number as a string.
 */
function formatNumberToTwoDigits(num: number): string {
	return num.toString().padStart(2, "0");
}

/**
 * Generates a filename based on the current date and time.
 * @returns A string with the format DD-MM-YYYY_HH-MM.md.
 */
function generateTimestampedFilename(): string {
	const now = new Date();
	const day = formatNumberToTwoDigits(now.getDate());
	const month = formatNumberToTwoDigits(now.getMonth() + 1); // getMonth() is 0-indexed
	const year = now.getFullYear();
	const hours = formatNumberToTwoDigits(now.getHours());
	const minutes = formatNumberToTwoDigits(now.getMinutes());
	return `${day}-${month}-${year}_${hours}-${minutes}.md`;
}

interface ExecSyncError extends Error {
	status?: number;
	signal?: NodeJS.Signals;
	output?: (Buffer | string)[] | null;
	pid?: number;
	stdout?: Buffer | string | null;
	stderr?: Buffer | string | null;
}

async function runCodeweaverScript(): Promise<void> {
	const timestampedFilename = generateTimestampedFilename();
	const outputDirectory = join(__dirname, ".llm");
	const inputDirectory = "src"; // Input directory for CodeWeaver

	// Ensure the output directory exists
	if (!existsSync(outputDirectory)) {
		try {
			await mkdir(outputDirectory, { recursive: true });
			console.log(`Output directory ${outputDirectory} created successfully.`);
		} catch (error) {
			console.error(
				`Error creating output directory ${outputDirectory}:`,
				error instanceof Error ? error.message : String(error),
			);
			process.exit(1);
		}
	}

	const outputFilePath = join(outputDirectory, timestampedFilename);
	const command = `codeweaver -input=${inputDirectory} -output=${outputFilePath}`;
	const execOptions: ExecSyncOptionsWithStringEncoding = {
		stdio: "inherit",
		encoding: "utf-8",
	};

	try {
		console.log(`Executing: ${command}`);
		execSync(command, execOptions);
		console.log(`Success! File generated: ${outputFilePath}`);
	} catch (error) {
		const execError = error as ExecSyncError;
		console.error("Error executing codeweaver:");
		if (execError.message) {
			console.error(`Message: ${execError.message}`);
		}
		if (execError.status !== undefined) {
			console.error(`Exit code: ${execError.status}`);
		}
		if (execError.stderr) {
			// Ensure stderr is a string for consistent logging
			const stderrMessage = Buffer.isBuffer(execError.stderr)
				? execError.stderr.toString("utf-8")
				: execError.stderr;
			console.error(`Standard Error: ${stderrMessage}`);
		}
		process.exit(1);
	}
}

runCodeweaverScript().catch((error) => {
	console.error(
		"Unexpected error during script execution:",
		error instanceof Error ? error.message : String(error),
	);
	process.exit(1);
});
