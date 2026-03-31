import { readFile, writeFile } from "fs/promises";
import { resolve, relative } from "path";
import { Tool, ToolResult } from "./types";

export const FileEditTool: Tool = {
  name: "Edit",
  description:
    "Performs exact string replacement in a file. The old_string must be unique in the file unless replace_all is true.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to the file to edit",
      },
      old_string: {
        type: "string",
        description: "The exact text to find and replace",
      },
      new_string: {
        type: "string",
        description: "The replacement text",
      },
      replace_all: {
        type: "boolean",
        description: "Replace all occurrences (default: false)",
      },
    },
    required: ["file_path", "old_string", "new_string"],
  },
  isReadOnly: false,

  async execute(input, workspaceDir): Promise<ToolResult> {
    const filePath = resolve(workspaceDir, input.file_path as string);

    if (!filePath.startsWith(workspaceDir)) {
      return { output: "", error: "Access denied: path outside workspace", isError: true };
    }

    try {
      const content = await readFile(filePath, "utf-8");
      const oldStr = input.old_string as string;
      const newStr = input.new_string as string;
      const replaceAll = (input.replace_all as boolean) || false;

      if (oldStr === newStr) {
        return { output: "", error: "old_string and new_string are identical", isError: true };
      }

      const occurrences = content.split(oldStr).length - 1;

      if (occurrences === 0) {
        return { output: "", error: "old_string not found in file", isError: true };
      }

      if (occurrences > 1 && !replaceAll) {
        return {
          output: "",
          error: `old_string found ${occurrences} times. Use replace_all or provide more context to make it unique.`,
          isError: true,
        };
      }

      const updated = replaceAll
        ? content.split(oldStr).join(newStr)
        : content.replace(oldStr, newStr);

      await writeFile(filePath, updated, "utf-8");

      const relPath = relative(workspaceDir, filePath);
      const replaced = replaceAll ? occurrences : 1;
      return { output: `Edited ${relPath}: replaced ${replaced} occurrence(s)` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { output: "", error: msg, isError: true };
    }
  },
};
