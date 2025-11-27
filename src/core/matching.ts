import { PackageManager } from "../types/package-managers";

export const PackageManagerConfig = {
  [PackageManager.BUN]: {
    add: { command: "bun add", args: ["<package>"] },
    remove: { command: "bun remove", args: ["<package>"] },
    install: { command: "bun install", args: [] },
    update: { command: "bun upgrade", args: ["<package>"] },
    run: { command: "bun run", args: ["<script>"] },
    exec: { command: "bunx", args: ["<command>"] },
  },
  [PackageManager.DENO]: {
    add: { command: "deno add", args: ["<package>"] },
    remove: { command: "deno remove", args: ["<package>"] },
    install: { command: "deno install", args: [] },
    update: { command: "deno outdated --update", args: ["<package>"] },
    run: { command: "deno task", args: ["<script>"] },
    exec: { command: "deno run", args: ["<command>"] },
  },
  [PackageManager.PNPM]: {
    add: { command: "pnpm add", args: ["<package>"] },
    remove: { command: "pnpm remove", args: ["<package>"] },
    install: { command: "pnpm install", args: [] },
    update: { command: "pnpm update", args: ["<package>"] },
    run: { command: "pnpm run", args: ["<script>"] },
    exec: { command: "pnpm dlx", args: ["<command>"] },
  },
  [PackageManager.YARN]: {
    add: { command: "yarn add", args: ["<package>"] },
    remove: { command: "yarn remove", args: ["<package>"] },
    install: { command: "yarn install", args: [] },
    update: { command: "yarn upgrade", args: ["<package>"] },
    run: { command: "yarn run", args: ["<script>"] },
    exec: { command: "yarn exec", args: ["<command>"] },
  },
  [PackageManager.NPM]: {
    add: { command: "npm install", args: ["<package>"] },
    remove: { command: "npm uninstall", args: ["<package>"] },
    install: { command: "npm install", args: [] },
    update: { command: "npm update", args: ["<package>"] },
    run: { command: "npm run", args: ["<script>"] },
    exec: { command: "npx", args: ["<command>"] },
  },
};

// Transform to the expected format for consumers
export const CommandMatching = {
  add: {
    [PackageManager.BUN]: PackageManagerConfig[PackageManager.BUN].add,
    [PackageManager.DENO]: PackageManagerConfig[PackageManager.DENO].add,
    [PackageManager.PNPM]: PackageManagerConfig[PackageManager.PNPM].add,
    [PackageManager.YARN]: PackageManagerConfig[PackageManager.YARN].add,
    [PackageManager.NPM]: PackageManagerConfig[PackageManager.NPM].add,
  },
  remove: {
    [PackageManager.BUN]: PackageManagerConfig[PackageManager.BUN].remove,
    [PackageManager.DENO]: PackageManagerConfig[PackageManager.DENO].remove,
    [PackageManager.PNPM]: PackageManagerConfig[PackageManager.PNPM].remove,
    [PackageManager.YARN]: PackageManagerConfig[PackageManager.YARN].remove,
    [PackageManager.NPM]: PackageManagerConfig[PackageManager.NPM].remove,
  },
  install: {
    [PackageManager.BUN]: PackageManagerConfig[PackageManager.BUN].install,
    [PackageManager.DENO]: PackageManagerConfig[PackageManager.DENO].install,
    [PackageManager.PNPM]: PackageManagerConfig[PackageManager.PNPM].install,
    [PackageManager.YARN]: PackageManagerConfig[PackageManager.YARN].install,
    [PackageManager.NPM]: PackageManagerConfig[PackageManager.NPM].install,
  },
  update: {
    [PackageManager.BUN]: PackageManagerConfig[PackageManager.BUN].update,
    [PackageManager.DENO]: PackageManagerConfig[PackageManager.DENO].update,
    [PackageManager.PNPM]: PackageManagerConfig[PackageManager.PNPM].update,
    [PackageManager.YARN]: PackageManagerConfig[PackageManager.YARN].update,
    [PackageManager.NPM]: PackageManagerConfig[PackageManager.NPM].update,
  },
  run: {
    [PackageManager.BUN]: PackageManagerConfig[PackageManager.BUN].run,
    [PackageManager.DENO]: PackageManagerConfig[PackageManager.DENO].run,
    [PackageManager.PNPM]: PackageManagerConfig[PackageManager.PNPM].run,
    [PackageManager.YARN]: PackageManagerConfig[PackageManager.YARN].run,
    [PackageManager.NPM]: PackageManagerConfig[PackageManager.NPM].run,
  },
  exec: {
    [PackageManager.BUN]: PackageManagerConfig[PackageManager.BUN].exec,
    [PackageManager.DENO]: PackageManagerConfig[PackageManager.DENO].exec,
    [PackageManager.PNPM]: PackageManagerConfig[PackageManager.PNPM].exec,
    [PackageManager.YARN]: PackageManagerConfig[PackageManager.YARN].exec,
    [PackageManager.NPM]: PackageManagerConfig[PackageManager.NPM].exec,
  },
};
