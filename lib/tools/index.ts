import { Tool } from "./types";
import { BashTool } from "./bash";
import { FileReadTool } from "./fileRead";
import { FileWriteTool } from "./fileWrite";
import { FileEditTool } from "./fileEdit";
import { GrepTool } from "./grep";
import { GlobTool } from "./globTool";

export const allTools: Tool[] = [
  BashTool,
  FileReadTool,
  FileWriteTool,
  FileEditTool,
  GrepTool,
  GlobTool,
];

export function getToolByName(name: string): Tool | undefined {
  return allTools.find((t) => t.name === name);
}

export function getToolSchemas() {
  return allTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}

export type { Tool, ToolResult, ToolDefinition } from "./types";
