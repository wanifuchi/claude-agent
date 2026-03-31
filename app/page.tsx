"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble, { Message, ToolCall } from "@/components/MessageBubble";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", toolCalls: [] },
    ]);

    try {
      // Build API messages from conversation
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(assistantId, currentEvent, data);
            } catch {
              // skip malformed data
            }
            currentEvent = "";
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: m.content + `\n\n**Error:** ${msg}` }
            : m
        )
      );
    }

    setIsLoading(false);
    inputRef.current?.focus();
  }

  function handleSSEEvent(
    assistantId: string,
    event: string,
    data: Record<string, unknown>
  ) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== assistantId) return m;

        switch (event) {
          case "text":
            return { ...m, content: m.content + (data.text as string) };

          case "tool_use":
            return {
              ...m,
              toolCalls: [
                ...(m.toolCalls || []),
                {
                  name: data.name as string,
                  input: data.input as Record<string, unknown>,
                  isRunning: true,
                },
              ],
            };

          case "tool_result": {
            const toolCalls = [...(m.toolCalls || [])];
            const lastIdx = toolCalls.findLastIndex(
              (tc) => tc.name === (data.name as string) && tc.isRunning
            );
            if (lastIdx >= 0) {
              toolCalls[lastIdx] = {
                ...toolCalls[lastIdx],
                output: data.output as string,
                isError: data.isError as boolean,
                isRunning: false,
              };
            }
            return { ...m, toolCalls };
          }

          case "error":
            return {
              ...m,
              content: m.content + `\n\n**Error:** ${data.error}`,
            };

          default:
            return m;
        }
      })
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-terminal-border bg-terminal-surface">
        <div className="w-3 h-3 rounded-full bg-terminal-green" />
        <h1 className="text-lg font-bold text-terminal-text">Claude Agent</h1>
        <span className="text-xs text-terminal-muted">
          browser-based coding agent
        </span>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-terminal-muted">
            <div className="text-4xl mb-4">⌘</div>
            <p className="text-lg mb-2">Claude Agent</p>
            <p className="text-sm">
              Ask me to read, write, edit files, run commands, or search code.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-terminal-border bg-terminal-surface px-5 py-3"
      >
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isLoading ? "Agent is working..." : "Type a message... (Enter to send)"
            }
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-terminal-bg border border-terminal-border rounded-lg px-4 py-2.5 text-sm text-terminal-text placeholder:text-terminal-muted focus:outline-none focus:border-terminal-accent resize-none disabled:opacity-50"
            style={{ minHeight: "42px", maxHeight: "200px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 200) + "px";
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-terminal-accent text-terminal-bg font-bold text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
