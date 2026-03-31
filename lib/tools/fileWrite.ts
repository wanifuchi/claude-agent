import { writeFile, mkdir } from "fs/promises";
import { resolve, dirname, relative } from "path";
import { Tool, ToolResult } from "./types";

export const FileWriteTool: Tool = {
  name: "Write",
  description:
    "Creates or overwrites a file with the given content. Creates parent directories if needed.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to the file to write",
      },
      content: {
        type: "string",
        description: "Content to write to the file",
      },
    },
    required: ["file_path", "content"],
  },
  isReadOnly: false,

  async execute(input, workspaceDir): Promise<ToolResult> {
    const filePath = resolve(workspaceDir, input.file_path as string);

    if (!filePath.startsWith(workspaceDir)) {
      return { output: "", error: "Access denied: path outside workspace", isError: true };
    }

    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, input.content as string, "utf-8");
      const relPath = relative(workspaceDir, filePath);
      const lines = (input.content as string).split("\n").length;
      return { output: `Wrote ${lines} lines to ${relPath}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { output: "", error: msg, isError: true };
    }
  },
};
