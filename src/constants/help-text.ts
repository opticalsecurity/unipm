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
