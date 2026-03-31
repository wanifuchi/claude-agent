import { readFile, stat } from "fs/promises";
import { resolve, relative } from "path";
import { Tool, ToolResult } from "./types";

export const FileReadTool: Tool = {
  name: "Read",
  description:
    "Reads a file and returns its contents with line numbers. Supports partial reads with offset and limit.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to the file to read (absolute or relative to workspace)",
      },
      offset: {
        type: "number",
        description: "Line number to start reading from (0-based)",
      },
      limit: {
        type: "number",
        description: "Number of lines to read",
      },
    },
    required: ["file_path"],
  },
  isReadOnly: true,

  async execute(input, workspaceDir): Promise<ToolResult> {
    const filePath = resolve(workspaceDir, input.file_path as string);

    if (!filePath.startsWith(workspaceDir)) {
      return { output: "", error: "Access denied: path outside workspace", isError: true };
    }

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        return { output: "", error: "Path is a directory, not a file", isError: true };
      }

      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const offset = (input.offset as number) || 0;
      const limit = (input.limit as number) || 2000;
      const sliced = lines.slice(offset, offset + limit);

      const numbered = sliced
        .map((line, i) => `${offset + i + 1}\t${line}`)
        .join("\n");

      const relPath = relative(workspaceDir, filePath);
      const total = lines.length;

      let result = numbered;
      if (offset + limit < total) {
        result += `\n\n... (${total - offset - limit} more lines)`;
      }

      return { output: `[${relPath}] (${total} lines)\n${result}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { output: "", error: msg, isError: true };
    }
  },
};
