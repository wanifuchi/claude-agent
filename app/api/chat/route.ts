import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getToolByName, getToolSchemas } from "@/lib/tools";
import { buildSystemPrompt } from "@/lib/systemPrompt";

const MAX_TURNS = 30;

function getWorkspaceDir(): string {
  return process.env.WORKSPACE_DIR || "/tmp/claude-agent-workspace";
}

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as {
    messages: Anthropic.MessageParam[];
  };

  const workspaceDir = getWorkspaceDir();
  const client = new Anthropic();
  const systemPrompt = buildSystemPrompt(workspaceDir);
  const tools = getToolSchemas();

  // Ensure workspace exists
  const { mkdir } = await import("fs/promises");
  await mkdir(workspaceDir, { recursive: true });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      const conversationMessages = [...messages];
      let turns = 0;

      try {
        while (turns < MAX_TURNS) {
          turns++;

          const response = await client.messages.create({
            model: "claude-sonnet-4-6-20250627",
            max_tokens: 16384,
            system: systemPrompt,
            tools: tools as Anthropic.Tool[],
            messages: conversationMessages,
          });

          let hasToolUse = false;
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of response.content) {
            if (block.type === "text") {
              send("text", { text: block.text });
            } else if (block.type === "tool_use") {
              hasToolUse = true;
              send("tool_use", {
                name: block.name,
                input: block.input,
              });

              const tool = getToolByName(block.name);
              let resultContent: string;
              let isError = false;

              if (tool) {
                const result = await tool.execute(
                  block.input as Record<string, unknown>,
                  workspaceDir
                );
                resultContent = result.isError
                  ? `Error: ${result.error}`
                  : result.output;
                isError = !!result.isError;

                send("tool_result", {
                  name: block.name,
                  output: resultContent,
                  isError,
                });
              } else {
                resultContent = `Error: Unknown tool "${block.name}"`;
                isError = true;
                send("tool_result", {
                  name: block.name,
                  output: resultContent,
                  isError: true,
                });
              }

              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: resultContent,
                is_error: isError,
              });
            }
          }

          conversationMessages.push({
            role: "assistant",
            content: response.content,
          });

          if (hasToolUse && toolResults.length > 0) {
            conversationMessages.push({
              role: "user",
              content: toolResults,
            });
            continue;
          }

          break;
        }

        send("done", {});
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        send("error", { error: msg });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
