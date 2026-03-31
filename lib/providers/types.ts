export interface ProviderConfig {
  id: string;
  name: string;
  models: ModelOption[];
  requiresApiKey: string; // env var name
}

export interface ModelOption {
  id: string;
  name: string;
}

export interface ProviderMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolSchema {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface StreamCallbacks {
  onText: (text: string) => void;
}

export interface ProviderToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ProviderResponse {
  textContent: string;
  toolCalls: ProviderToolCall[];
  stopReason: "end_turn" | "tool_use";
}

export interface AIProvider {
  chat(
    messages: ProviderMessage[],
    systemPrompt: string,
    tools: ToolSchema[],
    model: string,
    callbacks: StreamCallbacks
  ): Promise<ProviderResponse>;
}
