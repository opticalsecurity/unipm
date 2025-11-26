import chalk from "chalk";

/**
 * High-resolution timer for measuring command execution time
 */
export class Timer {
  private startTime: bigint;
  private endTime: bigint | null = null;

  constructor() {
    this.startTime = process.hrtime.bigint();
  }

  /**
   * Stop the timer and return elapsed time in milliseconds
   */
  stop(): number {
    this.endTime = process.hrtime.bigint();
    return this.getElapsedMs();
  }

  /**
   * Get elapsed time in milliseconds (can be called before or after stop)
   */
  getElapsedMs(): number {
    const end = this.endTime ?? process.hrtime.bigint();
    return Number(end - this.startTime) / 1_000_000;
  }

  /**
   * Get a formatted string of the elapsed time
   */
  format(): string {
    const ms = this.getElapsedMs();
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Print the timing result to console
   */
  print(commandName: string): void {
    const elapsed = this.format();
    console.log(chalk.dim(`\n⏱  ${commandName} completed in ${elapsed}`));
  }

  /**
   * Static method to create and start a timer
   */
  static start(): Timer {
    return new Timer();
  }
}

/**
 * Simple memoization for async functions with TTL
 */
export function memoizeAsync<T>(
  fn: () => Promise<T>,
  ttlMs: number = 5000
): () => Promise<T> {
  let cache: { value: T; timestamp: number } | null = null;

  return async () => {
    const now = Date.now();
    if (cache && now - cache.timestamp < ttlMs) {
      return cache.value;
    }
    const value = await fn();
    cache = { value, timestamp: now };
    return value;
  };
}
