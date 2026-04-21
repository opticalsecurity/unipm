import { normalizeBinaryName } from "./binaries";

export type CompatibilityFrontend = "npm" | "pnpm" | "yarn" | "npx";

export interface DetectInvocationInput {
  argv?: string[];
  argv0?: string | undefined;
  execPath?: string | undefined;
  env?: Record<string, string | undefined>;
}

export interface CliInvocation {
  requestedName: string;
  normalizedName: string;
  frontend: CompatibilityFrontend | null;
  aliasMode: boolean;
}

function mapFrontend(binaryName: string): CompatibilityFrontend | null {
  switch (binaryName) {
    case "npm":
      return "npm";
    case "pnpm":
      return "pnpm";
    case "yarn":
    case "yarnpkg":
      return "yarn";
    case "npx":
    case "pnpx":
      return "npx";
    default:
      return null;
  }
}

export function detectCliInvocation(
  input: DetectInvocationInput = {}
): CliInvocation {
  const argv = input.argv ?? process.argv;
  const env = input.env ?? process.env;
  const source =
    env.UNIPM_INVOKED_AS ?? input.argv0 ?? process.argv0 ?? argv[0] ?? input.execPath ?? process.execPath;
  const normalizedName = normalizeBinaryName(source || "unipm");
  const frontend = mapFrontend(normalizedName);

  return {
    requestedName: source || "unipm",
    normalizedName,
    frontend,
    aliasMode: frontend !== null,
  };
}
