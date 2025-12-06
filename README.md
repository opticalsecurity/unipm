# unipm

![Build](https://img.shields.io/github/actions/workflow/status/opticalsecurity/unipm/.github/workflows/ci.yaml)
![Version](https://img.shields.io/github/v/release/opticalsecurity/unipm)
![License](https://img.shields.io/github/license/opticalsecurity/unipm)

**unipm** is an open-source CLI to manage dependencies in Node.js and Deno projects,  
automatically using the right package manager (npm, pnpm, yarn, bun, deno)  
based on your project. Stop worrying about which command to use in each repo:  
unipm detects and runs it for you!

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
```

unipm automatically detects the package manager of a project with various methods, executed in this order:

1. Manual override (from the interactive switcher)
2. `preferredPackageManager` field in `unipm.config.json` in the current working directory
3. `packageManager` field in package.json
4. Any supported lockfiles present
5. Any supported package manager installed in the system (Priority: bun > deno > pnpm > yarn > npm)

---

## Configuration

You can configure unipm per project by adding an `unipm.config.json` file in the directory where you run the CLI. The file is optional; unipm falls back to auto-detection when a setting is missing.

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
- `ci`: Enables CI-safe mode, which disables background update checks and interactive package-manager switching. The `CI` environment variable wins if set.

> Environment variables always take precedence over config values, so you can temporarily override a project's defaults without changing the file.

---

## Available commands

| Command       | Alias              | Description                              |
| ------------- | ------------------ | ---------------------------------------- |
| add \<pkg\>   | a                  | Installs a dependency                    |
| remove \<pkg\>| r                  | Uninstalls a dependency                  |
| install       | i                  | Installs all project dependencies        |
| update        | u                  | Updates dependencies                     |
| run \<script\>|                    | Runs a script from package.json          |
| exec \<cmd\>  | x                  | Runs a command using the package manager |
| detect        |                    | Detects the current project pm           |
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
