export interface CommandDefinition {
  name: string;
  description: string;
  aliases?: string[];
  execute?: (args: string[]) => Promise<any>;
}
