import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ProviderMessage, ToolSchema, StreamCallbacks, ProviderResponse, ProviderToolCall } from "./types";

export const anthropicProvider: AIProvider = {
  async chat(messages, systemPrompt, tools, model, callbacks): Promise<ProviderResponse> {
    const client = new Anthropic();

    const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const stream = client.messages.stream({
      model,
      max_tokens: 16384,
      system: systemPrompt,
      tools: tools as Anthropic.Tool[],
      messages: apiMessages,
    });

    stream.on("text", (text) => callbacks.onText(text));

    const response = await stream.finalMessage();

    let textContent = "";
    const toolCalls: ProviderToolCall[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        textContent += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      textContent,
      toolCalls,
      stopReason: toolCalls.length > 0 ? "tool_use" : "end_turn",
    };
  },
};
