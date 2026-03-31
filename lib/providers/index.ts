import type { AIProvider, ProviderConfig } from "./types";
import { anthropicProvider } from "./anthropic";
import { openaiProvider, deepseekProvider } from "./openai";
import { geminiProvider } from "./gemini";

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
    ],
    requiresApiKey: "ANTHROPIC_API_KEY",
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o mini" },
      { id: "o3-mini", name: "o3-mini" },
    ],
    requiresApiKey: "OPENAI_API_KEY",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    models: [
      { id: "gemini-2.5-pro-preview-05-06", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash-preview-05-20", name: "Gemini 2.5 Flash" },
    ],
    requiresApiKey: "GEMINI_API_KEY",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" },
    ],
    requiresApiKey: "DEEPSEEK_API_KEY",
  },
];

const providerMap: Record<string, AIProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
  deepseek: deepseekProvider,
};

export function getProvider(id: string): AIProvider {
  return providerMap[id] || anthropicProvider;
}

export function getAvailableProviders(): ProviderConfig[] {
  return PROVIDERS.filter((p) => !!process.env[p.requiresApiKey]);
}

export type { AIProvider, ProviderConfig, ProviderMessage, ToolSchema, StreamCallbacks, ProviderResponse } from "./types";
