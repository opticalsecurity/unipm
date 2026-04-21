# unipm

![Build](https://img.shields.io/github/actions/workflow/status/opticalsecurity/unipm/.github/workflows/ci.yaml)
![Version](https://img.shields.io/github/v/release/opticalsecurity/unipm)
![License](https://img.shields.io/github/license/opticalsecurity/unipm)

**unipm** is an open-source CLI focused on making modern package-manager tooling 
work transparently on top of **Bun**.

You can use it in two ways:

- As `unipm`, with its own command set and package-manager detection.
- As a transparent compatibility layer by aliasing `npm`, `pnpm`, `yarn`, or `npx` to `unipm`.

That means an agent, script, or human can keep running commands like `npm install`, 
and `unipm` will translate them to Bun-first execution when possible, falling back to 
the original frontend through `bunx` when Bun doesn't have an equivalent command.

---

## Index

- [Installation](#installation)
  - [Quick Install (Recommended)](#quick-install-recommended)
  - [Manual Installation](#manual-installation)
  - [Update](#update)
- [Basic usage](#basic-usage)
- [Configuration](#configuration)
- [Available commands](#available-commands)
- [Examples](#examples)
- [Versioning](#versioning)
- [Contributing](#contributing)
- [Author](#author)

---

## Installation

### Quick Install (Recommended)

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/opticalsecurity/unipm/master/scripts/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/opticalsecurity/unipm/master/scripts/install.ps1 | iex
```

### Manual Installation

1. Download the latest binary for your platform from [GitHub Releases](https://github.com/opticalsecurity/unipm/releases/latest)
2. Move the binary to a directory in your PATH:
   - **Linux/macOS:** `/usr/local/bin` or `~/.local/bin`
   - **Windows:** `%LOCALAPPDATA%\unipm` or any folder in your PATH
3. Make it executable (Linux/macOS): `chmod +x unipm`

The quick installers also bootstrap Bun if it is missing, because compatibility mode routes commands through Bun and `bunx`. If you install `unipm` manually, make sure Bun is available too.

### Update

Once installed, update to the latest version with:
```bash
unipm update-self
```

---

## Basic usage

```bash
# Install a dependency
unipm add react
# or shortcut
unipm i react

# Uninstall a dependency
unipm remove react
# or shortcut
unipm r react

# Install all project dependencies
unipm install
# or shortcut
unipm i

# Update dependencies
unipm update
# or shortcut
unipm u

# Create the standard compatibility aliases
unipm set-alias --compat
```

During any unipm command, press `s` to open the interactive package-manager switcher. It lets you pick a different package manager for the current run without changing project settings.

## Alias compatibility

Once compatibility aliases exist, these commands work through `unipm` without changing your habits:

```bash
# npm / pnpm / yarn style commands translated to Bun
npm install
npm install react -D
npm run build
npm test
pnpm dlx create-next-app@latest my-app
yarn build
npx eslint .

# Create aliases in one shot
unipm set-alias --compat
# or explicitly
unipm set-alias npm pnpm yarn npx
```

Alias mode is intentionally transparent:

- No unipm banner
- No timing footer
- No interactive package-manager switcher
- Bun-first translation for common package-manager workflows
- `bunx <frontend>` fallback for commands Bun does not model directly

unipm automatically detects the package manager of a project with various methods, executed in this order:

1. Manual override (from the [interactive switcher](#interactive-package-manager-switcher))
2. `preferredPackageManager` field in `unipm.config.json` in the current working directory
3. `packageManager` field in package.json
4. Any supported lockfiles present
5. Any supported package manager installed in the system (Priority: bun > deno > pnpm > yarn > npm)

---

### Interactive package-manager switcher

While a command is running, press `s` to open a menu where you can temporarily select a different package manager for that invocation. The manual choice only applies to the current run; future commands fall back to the normal detection order unless you switch again.

---

## Configuration

You can configure unipm per project by adding an `unipm.config.json` file in the directory where you run the CLI. The file is optional; unipm falls back to auto-detection when a setting is missing.

### Project config (`unipm.config.json`)

```json
{
  "preferredPackageManager": "pnpm",
  "debug": true,
  "colors": false,
  "ci": true
}
```

- `preferredPackageManager`: Forces unipm to use the specified package manager for the project.
- `debug`: Enables debug logging (can also be toggled with the `DEBUG` environment variable, which takes precedence).
- `colors`: Controls colored terminal output (overridden by `NO_COLOR` or `FORCE_COLOR` when set).
- `ci`: Enables CI-safe mode, which disables interactive package-manager switching. The `CI` environment variable wins if set.

> Environment variables always take precedence over config values, so you can temporarily override a project's defaults without changing the file.

### Runtime behavior

- Native `unipm` mode does not perform background update checks on startup by default, to keep cold start low.
- If you explicitly want background update checks, run with `UNIPM_AUTO_UPDATE_CHECK=1`.
- When `ci` resolves to `true`, unipm disables interactive package-manager switching to avoid blocking automation.
- The effective color setting is applied to both stdout and stderr, following the same rules as chalk: `NO_COLOR` turns colors off, `FORCE_COLOR` turns them on.
- If `debug` resolves to `true`, unipm sets `DEBUG=true` for the current process to surface verbose logging.

---

## Available commands

| Command       | Alias              | Description                              |
| ------------- | ------------------ | ---------------------------------------- |
| add \<pkg\>   | a                  | Installs a dependency                    |
| remove \<pkg\>| r                  | Uninstalls a dependency                  |
| install       | i                  | Installs deps or adds packages           |
| update        | u                  | Updates dependencies                     |
| run \<script\>|                    | Runs a script from package.json          |
| exec \<cmd\>  | x                  | Runs a command using the package manager |
| detect        |                    | Detects the current project pm           |
| set-alias     | alias              | Creates one or more command aliases      |
| update-self   | self-update        | Updates unipm to the latest version      |
| help          | h, --help, -h      | Shows help information                   |

---

## Examples

```bash
# Install express
unipm add express

# Uninstall lodash
unipm remove lodash

# Run a script
unipm run build

# Run a command
unipm exec tsc

# Make npm/pnpm/yarn/npx point to unipm
unipm set-alias --compat

# Keep using familiar commands
npm install react
yarn build
```

---

## Versioning

This project uses [Semantic Versioning (semver)](https://semver.org/).  
Example: `1.0.0`

---

## Contributing

All contributions are welcome!  
Open an issue or submit a PR.  
See [CONTRIBUTING.md](./CONTRIBUTING.md) for more info.

---

## Author

Made with love by Manu ([@opticalsecurity](https://github.com/opticalsecurity))  
La Plata, Buenos Aires 🇦🇷

---
