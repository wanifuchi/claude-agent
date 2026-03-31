import Anthropic from "@anthropic-ai/sdk";
import { allTools, getToolByName, getToolSchemas } from "./tools";
import { buildSystemPrompt } from "./systemPrompt";
import type { ToolResult } from "./tools/types";

const MAX_TURNS = 30;

export interface AgentMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: ToolResult;
  isToolUse?: boolean;
}

interface StreamCallbacks {
  onText: (text: string) => void;
  onToolUse: (toolName: string, input: Record<string, unknown>) => void;
  onToolResult: (toolName: string, result: ToolResult) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function runAgent(
  messages: Anthropic.MessageParam[],
  workspaceDir: string,
  callbacks: StreamCallbacks
) {
  const client = new Anthropic();
  const systemPrompt = buildSystemPrompt(workspaceDir);
  const tools = getToolSchemas();

  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;

    try {
      const stream = await client.messages.stream({
        model: "claude-sonnet-4-6-20250627",
        max_tokens: 16384,
        system: systemPrompt,
        tools: tools as Anthropic.Tool[],
        messages,
      });

      const response = await stream.finalMessage();

      // Process content blocks
      let hasToolUse = false;
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          callbacks.onText(block.text);
        } else if (block.type === "tool_use") {
          hasToolUse = true;
          const toolName = block.name;
          const toolInput = block.input as Record<string, unknown>;

          callbacks.onToolUse(toolName, toolInput);

          // Execute the tool
          const tool = getToolByName(toolName);
          if (tool) {
            const result = await tool.execute(toolInput, workspaceDir);
            callbacks.onToolResult(toolName, result);

            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result.isError
                ? `Error: ${result.error}`
                : result.output,
              is_error: result.isError,
            });
          } else {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: `Error: Unknown tool "${toolName}"`,
              is_error: true,
            });
          }
        }
      }

      // Add assistant message to conversation
      messages.push({ role: "assistant", content: response.content });

      // If there were tool uses, add results and continue the loop
      if (hasToolUse && toolResults.length > 0) {
        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // No tool use — we're done
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      callbacks.onError(msg);
      break;
    }
  }

  if (turns >= MAX_TURNS) {
    callbacks.onText("\n\n[Max turns reached]");
  }

  callbacks.onDone();
}
