import OpenAI from "openai";
import type { AIProvider, ProviderMessage, ToolSchema, StreamCallbacks, ProviderResponse, ProviderToolCall } from "./types";

function toOpenAITools(tools: ToolSchema[]): OpenAI.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

export function createOpenAIProvider(baseURL?: string, apiKeyEnv?: string): AIProvider {
  return {
    async chat(messages, systemPrompt, tools, model, callbacks): Promise<ProviderResponse> {
      const client = new OpenAI({
        apiKey: apiKeyEnv ? process.env[apiKeyEnv] : process.env.OPENAI_API_KEY,
        ...(baseURL && { baseURL }),
      });

      const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const stream = await client.chat.completions.create({
        model,
        messages: openaiMessages,
        tools: toOpenAITools(tools),
        stream: true,
      });

      let textContent = "";
      const toolCallsMap = new Map<number, { id: string; name: string; args: string }>();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          textContent += delta.content;
          callbacks.onText(delta.content);
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCallsMap.get(tc.index);
            if (!existing) {
              toolCallsMap.set(tc.index, {
                id: tc.id || "",
                name: tc.function?.name || "",
                args: tc.function?.arguments || "",
              });
            } else {
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name += tc.function.name;
              if (tc.function?.arguments) existing.args += tc.function.arguments;
            }
          }
        }
      }

      const toolCalls: ProviderToolCall[] = [];
      for (const [, tc] of toolCallsMap) {
        try {
          toolCalls.push({
            id: tc.id,
            name: tc.name,
            input: JSON.parse(tc.args),
          });
        } catch {
          // skip malformed
        }
      }

      return {
        textContent,
        toolCalls,
        stopReason: toolCalls.length > 0 ? "tool_use" : "end_turn",
      };
    },
  };
}

export const openaiProvider = createOpenAIProvider();
export const deepseekProvider = createOpenAIProvider("https://api.deepseek.com", "DEEPSEEK_API_KEY");
