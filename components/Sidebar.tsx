"use client";

import { useState, useMemo } from "react";
import type { ChatSession } from "@/lib/chatHistory";
import FileTree from "./FileTree";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, search]);

  // 日付グループ分け
  const groups = useMemo(() => {
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;
    const weekAgo = today - 7 * 86400000;

    const result: { label: string; items: ChatSession[] }[] = [
      { label: "今日", items: [] },
      { label: "昨日", items: [] },
      { label: "過去7日間", items: [] },
      { label: "それ以前", items: [] },
    ];

    for (const s of filtered) {
      if (s.updatedAt >= today) result[0].items.push(s);
      else if (s.updatedAt >= yesterday) result[1].items.push(s);
      else if (s.updatedAt >= weekAgo) result[2].items.push(s);
      else result[3].items.push(s);
    }

    return result.filter((g) => g.items.length > 0);
  }, [filtered]);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-terminal-surface border-r border-terminal-border flex flex-col items-center py-3 gap-3 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="text-terminal-muted hover:text-terminal-text transition-colors text-lg"
          title="サイドバーを開く"
        >
          ☰
        </button>
        <button
          onClick={onNewChat}
          className="text-terminal-muted hover:text-terminal-accent transition-colors text-lg"
          title="新しいチャット"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-terminal-surface border-r border-terminal-border flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-terminal-border">
        <span className="text-sm font-bold text-terminal-accent">Claude Agent</span>
        <button
          onClick={onToggleCollapse}
          className="text-terminal-muted hover:text-terminal-text transition-colors text-sm"
          title="サイドバーを閉じる"
        >
          ✕
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-terminal-border hover:border-terminal-accent hover:bg-terminal-accent/10 transition-all text-sm text-terminal-text"
        >
          <span className="text-terminal-accent">+</span>
          新しいチャット
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="検索..."
          className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-1.5 text-xs text-terminal-text placeholder:text-terminal-muted focus:outline-none focus:border-terminal-accent"
        />
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="text-[10px] font-bold text-terminal-muted uppercase tracking-wider px-2 py-1">
              {group.label}
            </div>
            {group.items.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
                  session.id === activeSessionId
                    ? "bg-terminal-accent/15 text-terminal-accent"
                    : "text-terminal-text hover:bg-terminal-border/30"
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <span className="truncate flex-1">{session.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-terminal-muted hover:text-terminal-red transition-all text-xs shrink-0"
                  title="削除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-center text-terminal-muted text-xs py-8">
            まだ会話がありません
          </div>
        )}

        {sessions.length > 0 && filtered.length === 0 && (
          <div className="text-center text-terminal-muted text-xs py-8">
            該当する会話が見つかりません
          </div>
        )}
      </div>

      {/* File Tree */}
      <FileTree />
    </div>
  );
}
