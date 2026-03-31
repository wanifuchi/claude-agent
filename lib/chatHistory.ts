export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: SerializedMessage[];
}

export interface SerializedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: {
    name: string;
    input: Record<string, unknown>;
    output?: string;
    isError?: boolean;
  }[];
}

const STORAGE_KEY = "claude-agent-history";

export function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function createSession(): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: "新しいチャット",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
}

export function generateTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= 30) return trimmed;
  return trimmed.slice(0, 30) + "...";
}
