"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble, { Message, ToolCall } from "@/components/MessageBubble";
import ModelSelector from "@/components/ModelSelector";
import Sidebar from "@/components/Sidebar";
import {
  ChatSession,
  loadSessions,
  saveSessions,
  createSession,
  generateTitle,
} from "@/lib/chatHistory";

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [providerId, setProviderId] = useState("anthropic");
  const [modelId, setModelId] = useState("claude-sonnet-4-20250514");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 初回ロード
  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    if (loaded.length > 0) {
      const latest = [...loaded].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setActiveSessionId(latest.id);
      setMessages(latest.messages as Message[]);
    }
  }, []);

  // セッション保存
  useEffect(() => {
    if (!activeSessionId) return;
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: messages as ChatSession["messages"], updatedAt: Date.now() }
          : s
      );
      saveSessions(updated);
      return updated;
    });
  }, [messages, activeSessionId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function handleNewChat() {
    const session = createSession();
    setSessions((prev) => {
      const updated = [session, ...prev];
      saveSessions(updated);
      return updated;
    });
    setActiveSessionId(session.id);
    setMessages([]);
    inputRef.current?.focus();
  }

  function handleSelectSession(id: string) {
    const session = sessions.find((s) => s.id === id);
    if (session) {
      setActiveSessionId(id);
      setMessages(session.messages as Message[]);
    }
  }

  function handleDeleteSession(id: string) {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSessions(updated);
      if (id === activeSessionId) {
        if (updated.length > 0) {
          const latest = [...updated].sort((a, b) => b.updatedAt - a.updatedAt)[0];
          setActiveSessionId(latest.id);
          setMessages(latest.messages as Message[]);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
      return updated;
    });
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // セッションがなければ自動作成
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const session = createSession();
      currentSessionId = session.id;
      setSessions((prev) => {
        const updated = [session, ...prev];
        saveSessions(updated);
        return updated;
      });
      setActiveSessionId(currentSessionId);
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    // 最初のメッセージならタイトルを設定
    if (messages.length === 0) {
      const title = generateTitle(trimmed);
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === currentSessionId ? { ...s, title } : s
        );
        saveSessions(updated);
        return updated;
      });
    }

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", toolCalls: [] },
    ]);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, providerId, modelId }),
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
              // skip
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
            ? { ...m, content: m.content + `\n\n**エラー:** ${msg}` }
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
              content: m.content + `\n\n**エラー:** ${data.error}`,
            };

          default:
            return m;
        }
      })
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-3 border-b border-terminal-border bg-terminal-surface">
          <div className="w-3 h-3 rounded-full bg-terminal-green" />
          <h1 className="text-lg font-bold text-terminal-text">
            {sessions.find((s) => s.id === activeSessionId)?.title || "Claude Agent"}
          </h1>
          <span className="text-xs text-terminal-muted flex-1">
            ブラウザで動くAIコーディングエージェント
          </span>
          <ModelSelector
            providerId={providerId}
            modelId={modelId}
            onChangeProvider={setProviderId}
            onChangeModel={setModelId}
          />
          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = "/api/download";
              a.download = "";
              a.click();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-terminal-border rounded-lg text-terminal-muted hover:text-terminal-accent hover:border-terminal-accent transition-colors"
            title="ワークスペースのファイルをZIPでダウンロード"
          >
            <span>↓</span>
            ダウンロード
          </button>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-terminal-muted">
              <div className="text-4xl mb-4">⌘</div>
              <p className="text-lg mb-2">Claude Agent</p>
              <p className="text-sm">
                ファイルの読み書き・編集、コマンド実行、コード検索ができます。
              </p>
              <p className="text-xs mt-2">
                何でも日本語で話しかけてください。
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isLoading={isLoading && i === messages.length - 1 && m.role === "assistant"}
            />
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
                isLoading
                  ? "エージェントが作業中..."
                  : "メッセージを入力...（Shift+Enterで送信）"
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
              {isLoading ? "..." : "送信"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
