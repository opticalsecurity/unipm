import { clearBinaryResolutionCache, resolveBinary } from "../core/binaries";
import { clearDetectionCache, DetectPackageManager } from "../core/detection";
import { executeCommand } from "../core/execution";
import { GetCommandByName, GetCommands } from "../core/registry";

function nowNs(): bigint {
  if (typeof Bun !== "undefined" && typeof Bun.nanoseconds === "function") {
    return BigInt(Bun.nanoseconds());
  }

  return process.hrtime.bigint();
}

async function benchmark(
  label: string,
  iterations: number,
  run: () => void | Promise<void>
): Promise<void> {
  const start = nowNs();
  for (let index = 0; index < iterations; index += 1) {
    await run();
  }
  const durationNs = nowNs() - start;
  const avgNs = durationNs / BigInt(iterations);
  const avgUs = Number(avgNs) / 1_000;
  const totalMs = Number(durationNs) / 1_000_000;

  console.log(
    `${label.padEnd(34)} total=${totalMs.toFixed(2)}ms avg=${avgUs.toFixed(2)}us`
  );
}

async function main(): Promise<void> {
  console.log("unipm performance benchmarks\n");

  const bunExecutable = process.execPath;
  const stdoutBenchmarkArgs = [
    "--eval",
    "for (let i = 0; i < 5000; i += 1) console.log('benchmark-line-' + i)",
  ];

  await benchmark("executeCommand captureOutput", 20, async () => {
    await executeCommand(bunExecutable, stdoutBenchmarkArgs, {
      liveOutput: false,
      captureOutput: true,
      resolveCommand: false,
    });
  });

  await benchmark("executeCommand no capture", 20, async () => {
    await executeCommand(bunExecutable, stdoutBenchmarkArgs, {
      liveOutput: false,
      captureOutput: false,
      resolveCommand: false,
    });
  });

  await benchmark("resolveBinary uncached (bunx)", 5_000, () => {
    clearBinaryResolutionCache();
    resolveBinary("bunx");
  });

  clearBinaryResolutionCache();
  resolveBinary("bunx");
  await benchmark("resolveBinary cached (bunx)", 50_000, () => {
    resolveBinary("bunx");
  });

  await benchmark("GetCommands metadata", 10_000, async () => {
    await GetCommands();
  });

  await benchmark("GetCommandByName first load", 1, async () => {
    await GetCommandByName("update-self");
  });

  await benchmark("GetCommandByName cached", 10_000, async () => {
    await GetCommandByName("help");
  });

  clearDetectionCache();
  await benchmark("DetectPackageManager cold", 100, async () => {
    clearDetectionCache();
    await DetectPackageManager();
  });

  clearDetectionCache();
  await DetectPackageManager();
  await benchmark("DetectPackageManager cached", 10_000, async () => {
    await DetectPackageManager();
  });
}

await main();
