import { exec } from "child_process";
import { resolve, relative } from "path";
import { Tool, ToolResult } from "./types";

export const GrepTool: Tool = {
  name: "Grep",
  description:
    "Searches file contents using regex patterns (powered by grep -rn). Returns matching lines with file paths and line numbers.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Regex pattern to search for",
      },
      path: {
        type: "string",
        description: "Directory or file to search in (default: workspace root)",
      },
      glob: {
        type: "string",
        description: "File pattern filter (e.g. '*.ts', '*.py')",
      },
    },
    required: ["pattern"],
  },
  isReadOnly: true,

  async execute(input, workspaceDir): Promise<ToolResult> {
    const pattern = input.pattern as string;
    const searchPath = resolve(workspaceDir, (input.path as string) || ".");
    const glob = input.glob as string | undefined;

    if (!searchPath.startsWith(workspaceDir)) {
      return { output: "", error: "Access denied: path outside workspace", isError: true };
    }

    const includeFlag = glob ? `--include='${glob}'` : "";
    const cmd = `grep -rn ${includeFlag} --color=never -m 200 '${pattern.replace(/'/g, "'\\''")}' '${searchPath}' 2>/dev/null | head -250`;

    return new Promise((resolve) => {
      exec(cmd, { cwd: workspaceDir, timeout: 30000, maxBuffer: 512 * 1024 }, (error, stdout) => {
        if (!stdout.trim()) {
          resolve({ output: "No matches found." });
        } else {
          const output = stdout
            .split("\n")
            .map((line) => {
              try {
                return line.replace(workspaceDir + "/", "");
              } catch {
                return line;
              }
            })
            .join("\n");
          resolve({ output });
        }
      });
    });
  },
};
