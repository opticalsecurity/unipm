import {
  normalizeBinaryName,
  resolveCommandPath,
  resolveBinary,
  isSelfReferentialBinary,
} from "./binaries";

/**
 * Characters/patterns that could indicate command injection attempts
 */
const DANGEROUS_PATTERNS = [/\n|\r/, /\0/];

/**
 * Allowed package managers - only these can be executed
 */
const ALLOWED_COMMANDS = new Set([
  "npm",
  "npx",
  "pnpm",
  "pnpx",
  "yarn",
  "bun",
  "bunx",
  "deno",
]);

/**
 * Validates and sanitizes command arguments to prevent injection attacks
 * @throws Error if dangerous patterns are detected
 */
export function sanitizeArgument(arg: string): string {
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(arg)) {
      throw new Error(
        `Security error: Invalid character in argument "${arg.substring(
          0,
          50
        )}"`
      );
    }
  }

  // Remove leading/trailing whitespace that could be exploited
  return arg.trim();
}

/**
 * Validates that a command is in the allowed list
 * @throws Error if command is not allowed
 */
export function validateCommand(command: string): void {
  const commandName = normalizeBinaryName(command);

  if (!ALLOWED_COMMANDS.has(commandName)) {
    throw new Error(
      `Security error: Command "${command}" is not allowed. Only package managers are permitted.`
    );
  }
}

function resolvePackageManagerCommand(
  command: string,
  args: string[]
): { command: string; args: string[] } {
  const normalizedCommand = normalizeBinaryName(command);

  const realBinary = resolveBinary(command, { excludeSelf: true });
  if (realBinary) {
    return {
      command: realBinary,
      args,
    };
  }

  if (isSelfReferentialBinary(command)) {
    throw new Error(
      `Execution error: Command "${normalizedCommand}" resolves to unipm itself. Install the real ${normalizedCommand} binary to use native unipm mode, or invoke the ${normalizedCommand} alias directly for compatibility mode.`
    );
  }

  return {
    command: resolveCommandPath(command),
    args,
  };
}

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
  /** If true, buffers stdout/stderr for the returned result */
  captureOutput?: boolean;
  /** If false, assumes the command path is already resolved */
  resolveCommand?: boolean;
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
    captureOutput = true,
    resolveCommand = true,
    onStdout,
    onStderr,
    timeout,
    spawnOptions = {},
  } = options;

  let stdoutContent = "";
  let stderrContent = "";
  let timeoutId: Timer | undefined;
  const stdoutDecoder = new TextDecoder();
  const stderrDecoder = new TextDecoder();
  const needsStdoutPipe = captureOutput || liveOutput || onStdout !== undefined;
  const needsStderrPipe = captureOutput || liveOutput || onStderr !== undefined;

  try {
    const spawnCommand = resolveCommand
      ? resolvePackageManagerCommand(command, args)
      : { command, args };

    // Validate command is allowed
    validateCommand(spawnCommand.command);

    // Sanitize all arguments
    const sanitizedArgs = spawnCommand.args.map(sanitizeArgument);

    // Prepare command array
    const cmdArray = [spawnCommand.command, ...sanitizedArgs];

    // Configure stdout/stderr handling
    // For Bun.spawn, we can't easily use "inherit" and capture at the same time in the same way as Node
    // So we'll use "pipe" and manually write to process.stdout/stderr if liveOutput is true

    const proc = Bun.spawn(cmdArray, {
      cwd,
      stdout: needsStdoutPipe ? "pipe" : "ignore",
      stderr: needsStderrPipe ? "pipe" : "ignore",
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
        const chunk = stdoutDecoder.decode(value, { stream: true });
        if (captureOutput) {
          stdoutContent += chunk;
        }
        if (liveOutput) process.stdout.write(chunk);
        if (onStdout) onStdout(chunk);
      }

      const finalChunk = stdoutDecoder.decode();
      if (finalChunk) {
        if (captureOutput) {
          stdoutContent += finalChunk;
        }
        if (liveOutput) process.stdout.write(finalChunk);
        if (onStdout) onStdout(finalChunk);
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
        const chunk = stderrDecoder.decode(value, { stream: true });
        if (captureOutput) {
          stderrContent += chunk;
        }
        if (liveOutput) process.stderr.write(chunk);
        if (onStderr) onStderr(chunk);
      }

      const finalChunk = stderrDecoder.decode();
      if (finalChunk) {
        if (captureOutput) {
          stderrContent += finalChunk;
        }
        if (liveOutput) process.stderr.write(finalChunk);
        if (onStderr) onStderr(finalChunk);
      }
    };

    // Wait for process to complete and streams to be read
    const [exitCode] = await Promise.all([
      proc.exited,
      readStdout(),
      readStderr(),
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

  try {
    const resolved = resolvePackageManagerCommand(cmd, [...cmdArgs, ...args]);

    return executeCommand(resolved.command, resolved.args, {
      liveOutput: true,
      captureOutput: false,
      resolveCommand: false,
      ...options,
    });
  } catch (error) {
    return {
      success: false,
      exitCode: null,
      stdout: "",
      stderr: "",
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
