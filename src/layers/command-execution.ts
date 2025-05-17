import { spawn, type SpawnOptions } from "node:child_process";

/**
 * Result of a command execution
 */
export interface CommandExecutionResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

/**
 * Options for command execution
 */
export interface ExecuteCommandOptions {
  /** Working directory for the command */
  cwd?: string;
  /** If true, shows real-time output */
  liveOutput?: boolean;
  /** Callback for stdout data */
  onStdout?: (data: string) => void;
  /** Callback for stderr data */
  onStderr?: (data: string) => void;
  /** Timeout in milliseconds after which the process will be canceled */
  timeout?: number;
  /** Additional options for spawn */
  spawnOptions?: SpawnOptions;
}

/**
 * Executes a system command and returns the result
 *
 * @param command The main command to execute
 * @param args List of arguments for the command
 * @param options Execution options
 * @returns Execution result
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options: ExecuteCommandOptions = {}
): Promise<CommandExecutionResult> {
  const {
    cwd = process.cwd(),
    liveOutput = false,
    onStdout,
    onStderr,
    timeout,
    spawnOptions = {},
  } = options;

  let stdoutContent = "";
  let stderrContent = "";
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    return await new Promise<CommandExecutionResult>((resolve, reject) => {
      const childProcess = spawn(command, args, {
        cwd,
        shell: true,
        stdio: ["inherit", "pipe", "pipe"], // Ensures stdout and stderr are not null
        ...spawnOptions,
      });

      // Handle timeout if specified
      if (timeout) {
        timeoutId = setTimeout(() => {
          childProcess.kill();
          reject(
            new Error(
              `Command timed out after ${timeout}ms: ${command} ${args.join(
                " "
              )}`
            )
          );
        }, timeout);
      }

      if (childProcess.stdout) {
        childProcess.stdout.on("data", (data) => {
          const output = data.toString();
          stdoutContent += output;

          if (liveOutput) {
            process.stdout.write(output);
          }

          if (onStdout) {
            onStdout(output);
          }
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on("data", (data) => {
          const output = data.toString();
          stderrContent += output;

          if (liveOutput) {
            process.stderr.write(output);
          }

          if (onStderr) {
            onStderr(output);
          }
        });
      }

      childProcess.on("close", (code) => {
        if (timeoutId) clearTimeout(timeoutId);

        resolve({
          success: code === 0,
          exitCode: code,
          stdout: stdoutContent,
          stderr: stderrContent,
        });
      });

      childProcess.on("error", (error) => {
        if (timeoutId) clearTimeout(timeoutId);

        resolve({
          success: false,
          exitCode: null,
          stdout: stdoutContent,
          stderr: stderrContent,
          error,
        });
      });
    });
  } catch (error) {
    return {
      success: false,
      exitCode: null,
      stdout: stdoutContent,
      stderr: stderrContent,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Executes a package manager command and handles its output appropriately
 *
 * @param command The complete package manager command (e.g., "npm install")
 * @param args Arguments for the command
 * @param options Execution options
 */
export async function executePackageManagerCommand(
  command: string,
  args: string[] = [],
  options: ExecuteCommandOptions = {}
): Promise<CommandExecutionResult> {
  const parts = command.split(" ");
  const cmd = parts[0]!;
  const cmdArgs = parts.slice(1);

  return executeCommand(cmd, [...cmdArgs, ...args], {
    liveOutput: true,
    ...options,
  });
}
