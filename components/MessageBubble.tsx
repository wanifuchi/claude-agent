"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ToolResultBlock from "./ToolResultBlock";

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  isRunning?: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? "bg-terminal-accent/15 border-terminal-accent/30"
            : "bg-terminal-surface border-terminal-border"
        } border rounded-lg px-4 py-3`}
      >
        {/* Role label */}
        <div
          className={`text-xs font-bold mb-1 ${
            isUser ? "text-terminal-accent" : "text-terminal-green"
          }`}
        >
          {isUser ? "あなた" : "エージェント"}
        </div>

        {/* Tool calls */}
        {message.toolCalls?.map((tc, i) => (
          <ToolResultBlock
            key={i}
            name={tc.name}
            input={tc.input}
            output={tc.output}
            isError={tc.isError}
            isRunning={tc.isRunning}
          />
        ))}

        {/* Text content */}
        {message.content && (
          <div className="message-content text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
