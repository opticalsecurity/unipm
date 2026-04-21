import { executeCommand } from "./execution";
import { resolveBinary } from "./binaries";
import type { CompatibilityFrontend } from "./invocation";

type CompatibilityExecutable = "bun" | "bunx";

export interface CompatibilityPlan {
  executable: CompatibilityExecutable | null;
  args: string[];
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

const NPM_LIFECYCLE_ALIASES = new Set(["start", "stop", "restart", "test"]);

const NPM_BUILTINS = new Set([
  "access",
  "adduser",
  "audit",
  "bugs",
  "cache",
  "ci",
  "completion",
  "config",
  "create",
  "dedupe",
  "deprecate",
  "diff",
  "dist-tag",
  "docs",
  "doctor",
  "edit",
  "exec",
  "explain",
  "explore",
  "find-dupes",
  "fund",
  "help",
  "help-search",
  "hook",
  "info",
  "init",
  "install",
  "install-ci-test",
  "install-test",
  "link",
  "list",
  "ll",
  "login",
  "logout",
  "ls",
  "org",
  "outdated",
  "owner",
  "pack",
  "ping",
  "pkg",
  "prefix",
  "profile",
  "prune",
  "publish",
  "rebuild",
  "repo",
  "root",
  "run",
  "run-script",
  "search",
  "set",
  "shrinkwrap",
  "star",
  "stars",
  "team",
  "token",
  "uninstall",
  "unlink",
  "unpublish",
  "unstar",
  "update",
  "version",
  "view",
  "whoami",
]);

const PNPM_BUILTINS = new Set([
  "add",
  "audit",
  "cache",
  "config",
  "create",
  "deploy",
  "dlx",
  "env",
  "exec",
  "fetch",
  "help",
  "import",
  "info",
  "init",
  "install",
  "link",
  "list",
  "ls",
  "outdated",
  "pack",
  "patch",
  "patch-commit",
  "prune",
  "publish",
  "rebuild",
  "remove",
  "root",
  "run",
  "setup",
  "store",
  "test",
  "unlink",
  "update",
  "up",
  "why",
]);

const YARN_BUILTINS = new Set([
  "add",
  "bin",
  "cache",
  "config",
  "create",
  "dlx",
  "exec",
  "help",
  "info",
  "init",
  "install",
  "link",
  "list",
  "login",
  "logout",
  "node",
  "npm",
  "outdated",
  "pack",
  "publish",
  "remove",
  "run",
  "set",
  "unlink",
  "up",
  "upgrade",
  "upgrade-interactive",
  "version",
  "why",
  "workspace",
  "workspaces",
]);

function isVersionFlag(arg: string): boolean {
  return arg === "-v" || arg === "--version";
}

function isHelpFlag(arg: string): boolean {
  return arg === "-h" || arg === "--help" || arg === "help";
}

function printBunVersion(): CompatibilityPlan {
  return {
    executable: null,
    args: [],
    stdout: `${Bun.version}\n`,
    exitCode: 0,
  };
}

function fallbackToFrontend(
  frontend: Exclude<CompatibilityFrontend, "npx">,
  originalArgs: string[]
): CompatibilityPlan {
  return {
    executable: "bunx",
    args: [frontend, ...originalArgs],
  };
}

function runWithBun(...args: string[]): CompatibilityPlan {
  return {
    executable: "bun",
    args,
  };
}

function runWithBunx(...args: string[]): CompatibilityPlan {
  return {
    executable: "bunx",
    args,
  };
}

function stripScriptSeparator(args: string[]): string[] {
  if (args.length === 0) {
    return [];
  }

  const separatorIndex = args.indexOf("--");
  if (separatorIndex === -1) {
    return args;
  }

  return [...args.slice(0, separatorIndex), ...args.slice(separatorIndex + 1)];
}

function translateCommonOptions(args: string[]): string[] {
  const translated: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (arg === "--save" || arg === "--save-prod" || arg === "-P") {
      continue;
    }

    if (arg === "--save-dev" || arg === "--dev" || arg === "--development" || arg === "-D") {
      translated.push("--dev");
      continue;
    }

    if (arg === "--save-optional" || arg === "-O") {
      translated.push("--optional");
      continue;
    }

    if (arg === "--save-peer") {
      translated.push("--peer");
      continue;
    }

    if (arg === "--save-exact") {
      translated.push("--exact");
      continue;
    }

    if (arg === "--prod") {
      translated.push("--production");
      continue;
    }

    if (arg === "--package-lock-only") {
      translated.push("--lockfile-only");
      continue;
    }

    if (arg === "--immutable") {
      translated.push("--frozen-lockfile");
      continue;
    }

    if (arg === "--only" && args[index + 1]) {
      const next = args[index + 1]!;
      if (next === "prod" || next === "production") {
        translated.push("--production");
        index += 1;
        continue;
      }
    }

    if (arg.startsWith("--only=")) {
      const mode = arg.slice("--only=".length);
      if (mode === "prod" || mode === "production") {
        translated.push("--production");
        continue;
      }
    }

    translated.push(arg);
  }

  return translated;
}

function translateExecArgs(args: string[]): string[] {
  return stripScriptSeparator(translateCommonOptions(args));
}

function translateNpmCommand(command: string, rest: string[]): CompatibilityPlan {
  switch (command) {
    case "install":
    case "i":
      return runWithBun("install", ...translateCommonOptions(rest));
    case "add":
      return runWithBun("add", ...translateCommonOptions(rest));
    case "uninstall":
    case "remove":
    case "rm":
      return runWithBun("remove", ...translateCommonOptions(rest));
    case "update":
    case "upgrade":
      return runWithBun("update", ...translateCommonOptions(rest));
    case "ci":
      return runWithBun("ci", ...translateCommonOptions(rest));
    case "run":
    case "run-script":
      return runWithBun("run", ...stripScriptSeparator(rest));
    case "exec":
    case "x":
      return runWithBunx(...translateExecArgs(rest));
    case "create":
      return runWithBun("create", ...rest);
    case "init":
      if (rest[0] && !rest[0].startsWith("-")) {
        return runWithBun("create", ...rest);
      }
      return runWithBun("init", ...rest);
    case "test":
    case "start":
    case "stop":
    case "restart":
      return runWithBun("run", command, ...stripScriptSeparator(rest));
    case "link":
      return runWithBun("link", ...translateCommonOptions(rest));
    case "unlink":
      return runWithBun("unlink", ...translateCommonOptions(rest));
    case "publish":
      return runWithBun("publish", ...translateCommonOptions(rest));
    case "pack":
      return runWithBun("pm", "pack", ...translateCommonOptions(rest));
    case "list":
    case "ls":
    case "ll":
      return runWithBun("pm", "ls", ...translateCommonOptions(rest));
    case "outdated":
      return runWithBun("outdated", ...translateCommonOptions(rest));
    case "why":
    case "explain":
      return runWithBun("why", ...translateCommonOptions(rest));
    case "info":
    case "view":
    case "show":
      return runWithBun("info", ...translateCommonOptions(rest));
    case "audit":
      return runWithBun("audit", ...translateCommonOptions(rest));
    case "cache": {
      const subcommand = rest[0];
      if (!subcommand || subcommand === "dir") {
        return runWithBun("pm", "cache");
      }

      if (subcommand === "clean" || subcommand === "clear" || subcommand === "rm") {
        return runWithBun("pm", "cache", "rm");
      }

      return fallbackToFrontend("npm", [command, ...rest]);
    }
    case "whoami":
      return runWithBun("pm", "whoami", ...translateCommonOptions(rest));
    case "version":
      return runWithBun("pm", "version", ...rest);
    case "pkg":
      return runWithBun("pm", "pkg", ...rest);
    case "bin":
      return runWithBun("pm", "bin", ...rest);
    case "help":
      return fallbackToFrontend("npm", [command, ...rest]);
    default:
      if (NPM_LIFECYCLE_ALIASES.has(command)) {
        return runWithBun("run", command, ...stripScriptSeparator(rest));
      }

      if (NPM_BUILTINS.has(command)) {
        return fallbackToFrontend("npm", [command, ...rest]);
      }

      return fallbackToFrontend("npm", [command, ...rest]);
  }
}

function translatePnpmCommand(command: string, rest: string[]): CompatibilityPlan {
  switch (command) {
    case "install":
    case "i":
      return runWithBun("install", ...translateCommonOptions(rest));
    case "add":
      return runWithBun("add", ...translateCommonOptions(rest));
    case "remove":
    case "rm":
    case "uninstall":
      return runWithBun("remove", ...translateCommonOptions(rest));
    case "update":
    case "up":
    case "upgrade":
      return runWithBun("update", ...translateCommonOptions(rest));
    case "run":
      return runWithBun("run", ...stripScriptSeparator(rest));
    case "exec":
    case "dlx":
      return runWithBunx(...translateExecArgs(rest));
    case "create":
      return runWithBun("create", ...rest);
    case "init":
      return runWithBun("init", ...rest);
    case "test":
    case "start":
    case "stop":
    case "restart":
      return runWithBun("run", command, ...stripScriptSeparator(rest));
    case "node":
      return runWithBun("run", ...rest);
    case "link":
      return runWithBun("link", ...translateCommonOptions(rest));
    case "unlink":
      return runWithBun("unlink", ...translateCommonOptions(rest));
    case "publish":
      return runWithBun("publish", ...translateCommonOptions(rest));
    case "pack":
      return runWithBun("pm", "pack", ...translateCommonOptions(rest));
    case "list":
    case "ls":
      return runWithBun("pm", "ls", ...translateCommonOptions(rest));
    case "outdated":
      return runWithBun("outdated", ...translateCommonOptions(rest));
    case "why":
      return runWithBun("why", ...translateCommonOptions(rest));
    case "info":
      return runWithBun("info", ...translateCommonOptions(rest));
    case "audit":
      return runWithBun("audit", ...translateCommonOptions(rest));
    case "cache": {
      const subcommand = rest[0];
      if (!subcommand) {
        return runWithBun("pm", "cache");
      }

      if (subcommand === "clean" || subcommand === "clear" || subcommand === "rm") {
        return runWithBun("pm", "cache", "rm");
      }

      return fallbackToFrontend("pnpm", [command, ...rest]);
    }
    case "help":
      return fallbackToFrontend("pnpm", [command, ...rest]);
    default:
      if (PNPM_BUILTINS.has(command)) {
        return fallbackToFrontend("pnpm", [command, ...rest]);
      }

      return runWithBun("run", command, ...stripScriptSeparator(rest));
  }
}

function translateYarnCommand(command: string, rest: string[]): CompatibilityPlan {
  switch (command) {
    case "install":
    case "add":
      return runWithBun(command === "add" ? "add" : "install", ...translateCommonOptions(rest));
    case "remove":
    case "uninstall":
      return runWithBun("remove", ...translateCommonOptions(rest));
    case "up":
    case "update":
    case "upgrade":
      return runWithBun("update", ...translateCommonOptions(rest));
    case "run":
      return runWithBun("run", ...stripScriptSeparator(rest));
    case "exec":
    case "dlx":
      return runWithBunx(...translateExecArgs(rest));
    case "create":
      return runWithBun("create", ...rest);
    case "init":
      return runWithBun("init", ...rest);
    case "test":
    case "start":
    case "stop":
    case "restart":
      return runWithBun("run", command, ...stripScriptSeparator(rest));
    case "node":
      return runWithBun("run", ...rest);
    case "link":
      return runWithBun("link", ...translateCommonOptions(rest));
    case "unlink":
      return runWithBun("unlink", ...translateCommonOptions(rest));
    case "publish":
      return runWithBun("publish", ...translateCommonOptions(rest));
    case "pack":
      return runWithBun("pm", "pack", ...translateCommonOptions(rest));
    case "list":
      return runWithBun("pm", "ls", ...translateCommonOptions(rest));
    case "outdated":
      return runWithBun("outdated", ...translateCommonOptions(rest));
    case "why":
      return runWithBun("why", ...translateCommonOptions(rest));
    case "info":
      return runWithBun("info", ...translateCommonOptions(rest));
    case "cache": {
      const subcommand = rest[0];
      if (!subcommand) {
        return runWithBun("pm", "cache");
      }

      if (subcommand === "clean" || subcommand === "clear" || subcommand === "rm") {
        return runWithBun("pm", "cache", "rm");
      }

      return fallbackToFrontend("yarn", [command, ...rest]);
    }
    case "help":
      return fallbackToFrontend("yarn", [command, ...rest]);
    default:
      if (YARN_BUILTINS.has(command)) {
        return fallbackToFrontend("yarn", [command, ...rest]);
      }

      return runWithBun("run", command, ...stripScriptSeparator(rest));
  }
}

export function buildCompatibilityPlan(
  frontend: CompatibilityFrontend,
  args: string[]
): CompatibilityPlan {
  if (frontend === "npx") {
    if (args.length === 0) {
      return runWithBunx("--help");
    }
    if (isVersionFlag(args[0]!)) {
      return printBunVersion();
    }
    return runWithBunx(...translateExecArgs(args));
  }

  if (args.length === 0) {
    if (frontend === "npm") {
      return fallbackToFrontend(frontend, []);
    }

    return runWithBun("install");
  }

  if (isVersionFlag(args[0]!)) {
    return printBunVersion();
  }

  if (isHelpFlag(args[0]!)) {
    return fallbackToFrontend(frontend, args);
  }

  const [command, ...rest] = args;

  switch (frontend) {
    case "npm":
      return translateNpmCommand(command!, rest);
    case "pnpm":
      return translatePnpmCommand(command!, rest);
    case "yarn":
      return translateYarnCommand(command!, rest);
    default:
      return fallbackToFrontend("npm", args);
  }
}

export async function executeCompatibilityPlan(
  plan: CompatibilityPlan
): Promise<number> {
  if (plan.stdout !== undefined) {
    process.stdout.write(plan.stdout);
    return plan.exitCode ?? 0;
  }

  if (plan.stderr !== undefined) {
    process.stderr.write(plan.stderr);
    return plan.exitCode ?? 1;
  }

  if (!plan.executable) {
    return plan.exitCode ?? 0;
  }

  const executablePath = resolveBinary(plan.executable);
  if (!executablePath) {
    process.stderr.write(
      `unipm compatibility mode requires '${plan.executable}' to be installed or discoverable.\n`
    );
    return 1;
  }

  const result = await executeCommand(executablePath, plan.args, {
    liveOutput: true,
  });

  if (!result.success) {
    return result.exitCode ?? 1;
  }

  return 0;
}

export async function runCompatibilityCommand(
  frontend: CompatibilityFrontend,
  args: string[]
): Promise<number> {
  return executeCompatibilityPlan(buildCompatibilityPlan(frontend, args));
}
