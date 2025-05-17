import { PackageManager } from "./PackageManagers";

export const CommandVariants = {
  add: {
    [PackageManager.BUN]: {
      command: "bun add",
      args: ["<package>"],
    },
    [PackageManager.PNPM]: {
      command: "pnpm add",
      args: ["<package>"],
    },
    [PackageManager.YARN]: {
      command: "yarn add",
      args: ["<package>"],
    },
    [PackageManager.NPM]: {
      command: "npm install",
      args: ["<package>"],
    },
  },
  remove: {
    [PackageManager.BUN]: {
      command: "bun remove",
      args: ["<package>"],
    },
    [PackageManager.PNPM]: {
      command: "pnpm remove",
      args: ["<package>"],
    },
    [PackageManager.YARN]: {
      command: "yarn remove",
      args: ["<package>"],
    },
    [PackageManager.NPM]: {
      command: "npm uninstall",
      args: ["<package>"],
    },
  },
  install: {
    [PackageManager.BUN]: {
      command: "bun install",
      args: [],
    },
    [PackageManager.PNPM]: {
      command: "pnpm install",
      args: [],
    },
    [PackageManager.YARN]: {
      command: "yarn install",
      args: [],
    },
    [PackageManager.NPM]: {
      command: "npm install",
      args: [],
    },
  },
  update: {
    [PackageManager.BUN]: {
      command: "bun upgrade",
      args: ["<package>"],
    },
    [PackageManager.PNPM]: {
      command: "pnpm update",
      args: ["<package>"],
    },
    [PackageManager.YARN]: {
      command: "yarn upgrade",
      args: ["<package>"],
    },
    [PackageManager.NPM]: {
      command: "npm update",
      args: ["<package>"],
    },
  },
  run: {
    [PackageManager.BUN]: {
      command: "bun run",
      args: ["<script>"],
    },
    [PackageManager.PNPM]: {
      command: "pnpm run",
      args: ["<script>"],
    },
    [PackageManager.YARN]: {
      command: "yarn run",
      args: ["<script>"],
    },
    [PackageManager.NPM]: {
      command: "npm run",
      args: ["<script>"],
    },
  },
  exec: {
    [PackageManager.BUN]: {
      command: "bunx",
      args: ["<command>"],
    },
    [PackageManager.PNPM]: {
      command: "pnpm dlx",
      args: ["<command>"],
    },
    [PackageManager.YARN]: {
      command: "yarn exec",
      args: ["<command>"],
    },
    [PackageManager.NPM]: {
      command: "npx",
      args: ["<command>"],
    },
  },
};
