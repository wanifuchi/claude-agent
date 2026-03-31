"use client";

import { useState } from "react";

interface ToolResultBlockProps {
  name: string;
  input: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  isRunning?: boolean;
}

export default function ToolResultBlock({
  name,
  input,
  output,
  isError,
  isRunning,
}: ToolResultBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const icon = isRunning ? "⟳" : isError ? "✗" : "✓";
  const color = isRunning
    ? "text-terminal-orange"
    : isError
    ? "text-terminal-red"
    : "text-terminal-green";

  const summary = getSummary(name, input);

  return (
    <div className="my-1.5 border border-terminal-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-terminal-surface hover:bg-terminal-border/30 transition-colors text-left text-sm"
      >
        <span className={`${color} font-bold`}>{icon}</span>
        <span className="text-terminal-accent font-semibold">{name}</span>
        <span className="text-terminal-muted truncate flex-1">{summary}</span>
        <span className="text-terminal-muted text-xs">
          {expanded ? "▼" : "▶"}
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2 bg-terminal-bg text-xs border-t border-terminal-border">
          <div className="text-terminal-muted mb-1">入力:</div>
          <pre className="text-terminal-blue whitespace-pre-wrap mb-2">
            {JSON.stringify(input, null, 2)}
          </pre>
          {output && (
            <>
              <div className="text-terminal-muted mb-1">出力:</div>
              <pre
                className={`whitespace-pre-wrap max-h-64 overflow-y-auto ${
                  isError ? "text-terminal-red" : "text-terminal-text"
                }`}
              >
                {output.length > 3000
                  ? output.slice(0, 3000) + "\n... (省略)"
                  : output}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function getSummary(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "Bash":
      return String(input.command || "").slice(0, 80);
    case "Read":
      return String(input.file_path || "");
    case "Write":
      return String(input.file_path || "");
    case "Edit":
      return String(input.file_path || "");
    case "Grep":
      return `"${input.pattern}" ${input.path || ""}`;
    case "Glob":
      return String(input.pattern || "");
    default:
      return "";
  }
}
