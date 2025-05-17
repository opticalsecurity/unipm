import chalk from "chalk";

/**
 * Logger message types
 */
export enum LogLevel {
  INFO = "info",
  SUCCESS = "success",
  WARN = "warn",
  ERROR = "error",
  DEBUG = "debug",
}

/**
 * Logger for formatted console messages
 */
export class Logger {
  /**
   * Display an information message
   */
  static info(message: string): void {
    console.log(chalk.blue("ℹ") + " " + message);
  }

  /**
   * Display a success message
   */
  static success(message: string): void {
    console.log(chalk.green("✓") + " " + message);
  }

  /**
   * Display a warning message
   */
  static warn(message: string): void {
    console.log(chalk.yellow("⚠") + " " + message);
  }

  /**
   * Display an error message
   */
  static error(message: string, error?: Error | unknown): void {
    console.error(chalk.red("✗") + " " + message);

    if (error instanceof Error) {
      console.error(chalk.dim(error.message));

      if (error.stack && process.env.DEBUG) {
        console.error(chalk.dim(error.stack));
      }
    } else if (error !== undefined) {
      console.error(chalk.dim(String(error)));
    }
  }

  /**
   * Display a debug message (only in debug mode)
   */
  static debug(message: string, data?: any): void {
    if (process.env.DEBUG) {
      console.log(chalk.magenta("🐞") + " " + message);

      if (data !== undefined) {
        console.log(chalk.dim(JSON.stringify(data, null, 2)));
      }
    }
  }

  /**
   * Display a command that will be executed
   */
  static command(command: string): void {
    console.log(chalk.cyan(">") + " " + command);
  }
}
