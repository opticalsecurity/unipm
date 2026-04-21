# Copilot Instructions for unipm

## Project Overview

unipm is a Bun-first package manager compatibility CLI. It has a native `unipm` command surface, but it also supports transparent alias mode when invoked as `npm`, `pnpm`, `yarn`, or `npx`.

## Architecture

```
src/cli/index.ts      → Thin entry point that delegates to `src/core/cli.ts`
src/core/cli.ts       → Chooses native mode vs alias compatibility mode
src/core/invocation.ts → Detects how the binary was invoked (`unipm` vs `npm`/`pnpm`/`yarn`/`npx`)
src/core/compatibility.ts → Translates npm/pnpm/yarn/npx syntax to Bun or `bunx`
src/core/binaries.ts  → Resolves Bun/bunx binaries and detects self-alias recursion
src/core/registry.ts  → Command registry, resolves commands by name/alias
src/core/detection.ts → Detects package manager (package.json → lockfile → available commands)
src/core/matching.ts  → Maps unipm commands to package manager-specific commands
src/core/execution.ts → Executes shell commands with live output
src/commands/*.ts     → Individual command implementations (add, remove, install, etc.)
src/types/*.ts        → TypeScript enums/types (PackageManager, DetectionSource, Lockfile)
src/utils/*.ts        → Logger, parser for help-text templates
```

**Native `unipm` detection priority**: `packageManager` field in package.json → lockfile detection → available system commands (bun > pnpm > yarn > npm)

**Alias mode target**: translate common npm/pnpm/yarn/npx commands to Bun directly; for unsupported frontend-specific commands, fall back to `bunx <frontend> ...`.

## Development Commands

```bash
bun run build              # Cross-platform binaries to ./out/
bun run build --target bun-linux-x64  # Single platform build
bun run test               # Run tests with vitest
bun run test:coverage      # With Istanbul coverage
```

## Key Patterns

### Adding a New Command
1. Create `src/commands/<name>.ts` exporting a `Command()` function
2. Return object with `name`, `description`, `aliases[]`, and `execute(args: string[])` 
3. Register in `src/core/registry.ts` imports and `commands` array
4. Add command mapping in `src/core/matching.ts` → `PackageManagerConfig` and `CommandMatching`

Example from `src/commands/add.ts`:
```typescript
export function Command() {
  return {
    name: "add",
    aliases: ["a"],
    execute: async (args: string[]) => {
      const detectedPM = await DetectPackageManager();
      const cmd = CommandMatching.add[detectedPM.name];
      await executePackageManagerCommand(cmd.command, args);
    }
  };
}
```

### Package Manager Mapping
Add entries to `PackageManagerConfig` in `src/core/matching.ts` for each supported PM:
```typescript
[PackageManager.NPM]: {
  add: { command: "npm install", args: ["<package>"] },
  // ...
}
```

### Styled Output
Use `parseContent()` from `src/utils/parser.ts` with templates from `src/constants/help-text.ts`:
```typescript
parseContent(AddContent, { packageManager: "bun", command: "bun add react" });
```
Template syntax: `[#variables.key]` for interpolation, `[#text.color]` for chalk styles.

### Logging
Use `Logger` class from `src/utils/logger.ts`: `Logger.info()`, `Logger.success()`, `Logger.error()`, `Logger.debug()` (DEBUG env required).

## Testing

Tests use **Vitest** with a Bun shim loaded from `src/tests/setup.ts`, so the suite can run under Node or Bun. Mock `Bun.file()` and `Bun.spawn()` for detection tests:
```typescript
// See src/tests/detection.test.ts for mocking patterns
Bun.file = vi.fn(() => ({ exists: () => Promise.resolve(true), json: () => Promise.resolve({}) }));
```

## Type Safety

- Always use `PackageManager` enum, never raw strings like `"npm"`
- Detection results use `DetectPackageManagerOutput` type with `DetectionSource` enum
- Lockfiles defined in `Lockfile` enum

## Build Artifacts

Build script (`src/scripts/build.ts`) produces binaries named: `unipm-YY-MM-DD-<sha>-<platform>-<arch>` in `./out/`
