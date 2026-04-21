import { applyRuntimeConfig } from "./config";
import { runCompatibilityCommand } from "./compatibility";
import { detectCliInvocation, type DetectInvocationInput } from "./invocation";
import { ExecuteCommand } from "./registry";
import { Timer } from "../utils/timer";

export interface RunCliOptions extends DetectInvocationInput {
  argv?: string[];
}

export async function runCli(options: RunCliOptions = {}): Promise<number> {
  const argv = options.argv ?? process.argv;
  const args = argv.slice(2);
  const invocation = detectCliInvocation({
    argv,
    argv0: options.argv0,
    execPath: options.execPath,
    env: options.env,
  });

  const runtimeConfig = await applyRuntimeConfig();

  if (invocation.aliasMode && invocation.frontend) {
    return runCompatibilityCommand(invocation.frontend, args);
  }

  const { version } = await import("../../package.json");
  const commandName = args[0] ?? "help";
  const commandArgs = args.slice(1);
  const timer = Timer.start();

  console.log(`📦 unipm v${version}`);

  try {
    const result = await ExecuteCommand(commandName, commandArgs);
    if (!runtimeConfig.ci && process.env.UNIPM_AUTO_UPDATE_CHECK === "1") {
      queueMicrotask(() => {
        import("./updater")
          .then(({ backgroundUpdateCheck }) => backgroundUpdateCheck(version))
          .catch(() => {
            // Ignore opt-in background update errors.
          });
      });
    }
    return result ?? 0;
  } catch (error: unknown) {
    console.error(`Error executing command: ${(error as Error).message}`);
    await ExecuteCommand("help", []);
    return 1;
  } finally {
    timer.print(commandName);
  }
}
