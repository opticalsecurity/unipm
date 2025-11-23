

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
  spawnOptions?: any;
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
  let timeoutId: Timer | undefined;

  try {
    // Prepare command array
    const cmdArray = [command, ...args];

    // Configure stdout/stderr handling
    // For Bun.spawn, we can't easily use "inherit" and capture at the same time in the same way as Node
    // So we'll use "pipe" and manually write to process.stdout/stderr if liveOutput is true

    const proc = Bun.spawn(cmdArray, {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      ...spawnOptions,
    });

    // Handle timeout if specified
    if (timeout) {
      timeoutId = setTimeout(() => {
        proc.kill();
      }, timeout);
    }

    // Read stdout
    const readStdout = async () => {
      if (!proc.stdout) return;
      const stream = proc.stdout as unknown as ReadableStream;
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        stdoutContent += chunk;
        if (liveOutput) process.stdout.write(chunk);
        if (onStdout) onStdout(chunk);
      }
    };

    // Read stderr
    const readStderr = async () => {
      if (!proc.stderr) return;
      const stream = proc.stderr as unknown as ReadableStream;
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        stderrContent += chunk;
        if (liveOutput) process.stderr.write(chunk);
        if (onStderr) onStderr(chunk);
      }
    };

    // Wait for process to complete and streams to be read
    const [exitCode] = await Promise.all([
      proc.exited,
      readStdout(),
      readStderr()
    ]);

    if (timeoutId) clearTimeout(timeoutId);

    // Check if it was killed by timeout (exitCode might be null or signal related)
    if (timeout && proc.signalCode) {
      throw new Error(
        `Command timed out after ${timeout}ms: ${command} ${args.join(" ")}`
      );
    }

    return {
      success: exitCode === 0,
      exitCode: exitCode,
      stdout: stdoutContent,
      stderr: stderrContent,
    };

  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

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
