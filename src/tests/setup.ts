import { access, readFile, writeFile } from "fs/promises";
import { constants, existsSync } from "fs";
import { createHash } from "crypto";
import { delimiter } from "path";
import { Readable } from "stream";
import { spawn as nodeSpawn } from "child_process";

function hasPathSeparator(value: string): boolean {
  return value.includes("/") || value.includes("\\");
}

function resolveFromPath(command: string): string | null {
  if (!command) {
    return null;
  }

  if (hasPathSeparator(command)) {
    return existsSync(command) ? command : null;
  }

  const pathEntries = (process.env.PATH || "").split(delimiter).filter(Boolean);
  const candidates =
    process.platform === "win32"
      ? [command, `${command}.exe`, `${command}.cmd`, `${command}.bat`, `${command}.ps1`]
      : [command];

  for (const entry of pathEntries) {
    for (const candidate of candidates) {
      const fullPath = `${entry}/${candidate}`;
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

function toUint8Array(data: unknown): Uint8Array {
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }

  if (data instanceof Uint8Array) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  if (data instanceof Blob) {
    throw new Error("Blob writes must be awaited before conversion");
  }

  return new TextEncoder().encode(String(data ?? ""));
}

class CryptoHasher {
  private readonly hash;

  constructor(algorithm: string) {
    this.hash = createHash(algorithm);
  }

  update(data: Uint8Array): void {
    this.hash.update(data);
  }

  digest(format: "hex"): string {
    return this.hash.digest(format);
  }
}

const bunShim = {
  version: process.versions.bun ?? "0.0.0-test",
  which(command: string): string | null {
    return resolveFromPath(command);
  },
  file(filePath: string) {
    return {
      async exists(): Promise<boolean> {
        try {
          await access(filePath, constants.F_OK);
          return true;
        } catch {
          return false;
        }
      },
      async json(): Promise<unknown> {
        return JSON.parse(await readFile(filePath, "utf8"));
      },
      async text(): Promise<string> {
        return readFile(filePath, "utf8");
      },
      async arrayBuffer(): Promise<ArrayBuffer> {
        const buffer = await readFile(filePath);
        return buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        );
      },
    };
  },
  async write(filePath: string, data: unknown): Promise<number> {
    if (data instanceof Blob) {
      const buffer = Buffer.from(await data.arrayBuffer());
      await writeFile(filePath, buffer);
      return buffer.byteLength;
    }

    const content = toUint8Array(data);
    await writeFile(filePath, content);
    return content.byteLength;
  },
  spawn(cmd: string[], options: Record<string, unknown> = {}) {
    const stdoutMode = options.stdout === "inherit" ? "inherit" : "pipe";
    const stderrMode = options.stderr === "inherit" ? "inherit" : "pipe";

    const child = nodeSpawn(cmd[0]!, cmd.slice(1), {
      cwd: options.cwd as string | undefined,
      env: options.env as NodeJS.ProcessEnv | undefined,
      stdio: ["pipe", stdoutMode, stderrMode],
    });

    let signalCode: NodeJS.Signals | null = null;
    const exited = new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => {
        signalCode = signal;
        resolve(code);
      });
    });

    return {
      exited,
      stdout: child.stdout ? Readable.toWeb(child.stdout) : null,
      stderr: child.stderr ? Readable.toWeb(child.stderr) : null,
      kill: () => child.kill(),
      get signalCode() {
        return signalCode;
      },
    };
  },
  CryptoHasher,
};

Object.defineProperty(globalThis, "Bun", {
  value: bunShim,
  writable: true,
  configurable: true,
});
