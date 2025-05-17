export const DetectContent = `
unipm v[#variables.version]

[#text.green][#text.bold]Detected package manager:[#text.reset]
[#text.bold][#variables.packageManager][#text.reset] [#text.dim]v[#variables.packageManagerVersion][#text.reset]

[#text.cyan]Detection method:[#text.reset] [#variables.detectionSource]
[#text.cyan]Detection hint:[#text.reset] [#variables.detectionHint]

[#variables.detectionMethod]

[#text.yellow][#text.italic]Tip: use 'unipm help' to see all available commands.[#text.reset]
`;
