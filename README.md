# unipm

![Build](https://img.shields.io/github/actions/workflow/status/opticalsecurity/unipm/.github/workflows/build-release.yaml)
![Version](https://img.shields.io/github/v/release/opticalsecurity/unipm)
![License](https://img.shields.io/github/license/opticalsecurity/unipm)

**unipm** is an open-source CLI to manage dependencies in Node.js projects,  
automatically using the right package manager (npm, pnpm, yarn, bun, etc.)  
based on your project. Stop worrying about which command to use in each repo:  
unipm detects and runs it for you!

---

## Installation

1. Download latest binary (for your platform) from the [latest](https://github.com/opticalsecurity/unipm/releases/latest) GitHub release.
2. Move the binary to the required folder in your OS (/usr/bin for Linux and MacOS)
3. Open up a new terminal, and execute unipm.

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

1. 'packageManager' field in package.json
2. Any supported lockfiles present
3. Any supported package manager installed in the system (Priority: bun > pnpm > yarn > npm)

---

## Available commands

| Command      | Alias | Description                              |
| ------------ | ----- | ---------------------------------------- |
| add <pkg>    | i     | Installs a dependency                    |
| remove <pkg> | r     | Uninstalls a dependency                  |
| install      | i     | Installs all project dependencies        |
| update       | u     | Updates dependencies                     |
| run <script> |       | Runs a script from package.json          |
| exec <cmd>   | x     | Runs a command using the package manager |
| detect       |       | Detects the current project pm           |

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
