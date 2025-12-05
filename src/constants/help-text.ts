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

export const SetAliasContent = `
[#text.bold][#text.cyan]🔗 Creating alias: [#text.reset][#variables.aliasName]
`;

export const SetAliasSuccessContent = `
[#text.bold][#text.green]✓ Alias created successfully![#text.reset]

[#text.cyan]Alias:[#text.reset] [#variables.aliasName]
[#text.cyan]Points to:[#text.reset] [#variables.unipmPath]
[#text.cyan]Location:[#text.reset] [#variables.aliasPath]

[#text.dim]You can now use '[#variables.aliasName]' instead of 'unipm'[#text.reset]
`;
