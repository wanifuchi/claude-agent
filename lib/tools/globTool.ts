import { glob } from "glob";
import { resolve, relative } from "path";
import { Tool, ToolResult } from "./types";

export const GlobTool: Tool = {
  name: "Glob",
  description:
    "Finds files matching a glob pattern. Returns file paths sorted by modification time.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Glob pattern (e.g. '**/*.ts', 'src/**/*.tsx')",
      },
      path: {
        type: "string",
        description: "Directory to search in (default: workspace root)",
      },
    },
    required: ["pattern"],
  },
  isReadOnly: true,

  async execute(input, workspaceDir): Promise<ToolResult> {
    const pattern = input.pattern as string;
    const searchPath = resolve(workspaceDir, (input.path as string) || ".");

    if (!searchPath.startsWith(workspaceDir)) {
      return { output: "", error: "Access denied: path outside workspace", isError: true };
    }

    try {
      const files = await glob(pattern, {
        cwd: searchPath,
        nodir: true,
        ignore: ["node_modules/**", ".git/**", ".next/**"],
        maxDepth: 10,
      });

      const limited = files.slice(0, 100);
      const result = limited.join("\n");
      const suffix = files.length > 100 ? `\n\n... and ${files.length - 100} more files` : "";

      return {
        output: limited.length > 0
          ? `Found ${files.length} file(s):\n${result}${suffix}`
          : "No files found matching pattern.",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { output: "", error: msg, isError: true };
    }
  },
};
