import { exec } from "child_process";
import { Tool, ToolResult } from "./types";

const BLOCKED_COMMANDS = [
  /\brm\s+-rf\s+[\/~]/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  />(\/dev\/sd|\/dev\/disk)/,
  /\bshutdown\b/,
  /\breboot\b/,
];

export const BashTool: Tool = {
  name: "Bash",
  description:
    "Executes a bash command and returns its output. Use for system commands, running scripts, git operations, and terminal tasks.",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The bash command to execute",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (max 120000)",
      },
    },
    required: ["command"],
  },
  isReadOnly: false,

  async execute(input, workspaceDir): Promise<ToolResult> {
    const command = input.command as string;
    const timeout = Math.min((input.timeout as number) || 120000, 120000);

    for (const pattern of BLOCKED_COMMANDS) {
      if (pattern.test(command)) {
        return {
          output: "",
          error: `Blocked: dangerous command pattern detected`,
          isError: true,
        };
      }
    }

    return new Promise((resolve) => {
      exec(
        command,
        {
          cwd: workspaceDir,
          timeout,
          maxBuffer: 1024 * 1024,
          env: { ...process.env, HOME: process.env.HOME },
        },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              output: stdout || "",
              error: stderr || error.message,
              isError: true,
            });
          } else {
            resolve({
              output: stdout + (stderr ? `\n[stderr]: ${stderr}` : ""),
            });
          }
        }
      );
    });
  },
};
