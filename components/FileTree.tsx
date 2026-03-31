"use client";

import { useState, useEffect, useCallback } from "react";

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

export default function FileTree() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/files");
      if (!res.ok) {
        if (res.status === 404) {
          setTree([]);
          return;
        }
        throw new Error("取得失敗");
      }
      const data = await res.json();
      setTree(data.tree || []);
    } catch {
      setError("ファイル一覧を取得できませんでした");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return (
    <div className="border-t border-terminal-border">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10px] font-bold text-terminal-muted uppercase tracking-wider">
          ファイル
        </span>
        <button
          onClick={fetchTree}
          className="text-terminal-muted hover:text-terminal-accent text-xs transition-colors"
          title="更新"
        >
          ↻
        </button>
      </div>

      <div className="px-1 pb-2 max-h-60 overflow-y-auto text-xs">
        {loading && (
          <div className="text-terminal-muted px-2 py-1">読み込み中...</div>
        )}
        {error && (
          <div className="text-terminal-red px-2 py-1">{error}</div>
        )}
        {!loading && !error && tree.length === 0 && (
          <div className="text-terminal-muted px-2 py-1">ファイルなし</div>
        )}
        {tree.map((node) => (
          <TreeNode key={node.path} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}

function TreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-default hover:bg-terminal-border/30 transition-colors ${
          node.isDir ? "text-terminal-blue" : "text-terminal-text"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => node.isDir && setOpen(!open)}
      >
        <span className="w-4 text-center text-terminal-muted">
          {node.isDir ? (open ? "▾" : "▸") : "·"}
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      {node.isDir && open && node.children?.map((child) => (
        <TreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
