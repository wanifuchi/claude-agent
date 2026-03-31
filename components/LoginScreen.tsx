"use client";

import { useState } from "react";

interface LoginScreenProps {
  onSuccess: () => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.ok) {
        onSuccess();
      } else {
        setError(data.error || "認証に失敗しました");
        setPassword("");
      }
    } catch {
      setError("通信エラーが発生しました");
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center h-screen bg-terminal-bg">
      <div className="w-80 bg-terminal-surface border border-terminal-border rounded-xl p-6">
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">⌘</div>
          <h1 className="text-lg font-bold text-terminal-text">Claude Agent</h1>
          <p className="text-xs text-terminal-muted mt-1">パスワードを入力してください</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            autoFocus
            className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-4 py-2.5 text-sm text-terminal-text placeholder:text-terminal-muted focus:outline-none focus:border-terminal-accent mb-3"
          />

          {error && (
            <p className="text-terminal-red text-xs mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-2.5 bg-terminal-accent text-terminal-bg font-bold text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {loading ? "確認中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
