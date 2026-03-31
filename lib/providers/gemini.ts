import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, ProviderMessage, ToolSchema, StreamCallbacks, ProviderResponse, ProviderToolCall } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGeminiTools(tools: ToolSchema[]): any[] {
  return tools.map((t) => {
    const props = (t.input_schema as Record<string, unknown>).properties as Record<string, Record<string, unknown>> | undefined;
    const required = (t.input_schema as Record<string, unknown>).required as string[] | undefined;

    const geminiProps: Record<string, unknown> = {};
    if (props) {
      for (const [key, val] of Object.entries(props)) {
        geminiProps[key] = {
          type: "STRING",
          description: (val as Record<string, unknown>).description as string || "",
        };
      }
    }

    return {
      name: t.name,
      description: t.description,
      parameters: {
        type: "OBJECT",
        properties: geminiProps,
        required: required || [],
      },
    };
  });
}

export const geminiProvider: AIProvider = {
  async chat(messages, systemPrompt, tools, model, callbacks): Promise<ProviderResponse> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: toGeminiTools(tools) }],
    });

    const geminiHistory = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = genModel.startChat({ history: geminiHistory });
    const lastMsg = messages[messages.length - 1]?.content || "";

    const result = await chat.sendMessageStream(lastMsg);

    let textContent = "";
    const toolCalls: ProviderToolCall[] = [];

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        textContent += text;
        callbacks.onText(text);
      }

      const calls = chunk.functionCalls();
      if (calls) {
        for (const call of calls) {
          toolCalls.push({
            id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: call.name,
            input: (call.args as Record<string, unknown>) || {},
          });
        }
      }
    }

    return {
      textContent,
      toolCalls,
      stopReason: toolCalls.length > 0 ? "tool_use" : "end_turn",
    };
  },
};
