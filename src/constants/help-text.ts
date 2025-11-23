export const AddContent = `
[#text.bold][#text.cyan]🔍 Detected package manager: [#text.reset][#variables.packageManager] [#variables.packageManagerVersion]

[#text.bold][#text.green]🗳  Adding package(s) using: [#text.dim][#variables.command][#text.reset]
`;

export const DetectContent = `
[#text.bold][#text.cyan]🔍 Detected package manager: [#text.reset][#variables.packageManager] [#variables.packageManagerVersion]

[#text.cyan]Detection method:[#text.reset] [#variables.detectionSource]
[#text.cyan]Detection hint:[#text.reset] [#variables.detectionHint]

[#variables.detectionMethod]
`;

export const HelpContent = `
[#text.green][#text.bold]Available commands:[#text.reset]
[#variables.commandsTable]
`;

export const InstallContent = `
[#text.bold][#text.cyan]🔍 Detected package manager: [#text.reset][#variables.packageManager] [#variables.packageManagerVersion]

[#text.bold][#text.green]🗳  Installing all packages using: [#text.dim][#variables.command][#text.reset]
`;

export const RemoveContent = `
[#text.bold][#text.cyan]🔍 Detected package manager: [#text.reset][#variables.packageManager] [#variables.packageManagerVersion]
[#text.bold][#text.yellow]🗑️  Removing package(s) using: [#text.dim][#variables.command][#text.reset]
`;

export const UpdateContent = `
[#text.bold][#text.cyan]🔍 Detected package manager: [#text.reset][#variables.packageManager] [#variables.packageManagerVersion]
[#text.bold][#text.blue]🔄 Updating package(s) using: [#text.dim][#variables.command][#text.reset]
`;
