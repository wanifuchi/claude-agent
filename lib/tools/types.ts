export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  isReadOnly: boolean;
}

export interface ToolResult {
  output: string;
  error?: string;
  isError?: boolean;
}

export interface Tool extends ToolDefinition {
  execute(input: Record<string, unknown>, workspaceDir: string): Promise<ToolResult>;
}
