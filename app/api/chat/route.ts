import { NextRequest } from "next/server";
import { getToolByName, getToolSchemas } from "@/lib/tools";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import { getProvider } from "@/lib/providers";
import type { ProviderMessage } from "@/lib/providers/types";

const MAX_TURNS = 30;

function getWorkspaceDir(): string {
  return process.env.WORKSPACE_DIR || "/tmp/claude-agent-workspace";
}

export async function POST(req: NextRequest) {
  const { messages, providerId, modelId } = (await req.json()) as {
    messages: ProviderMessage[];
    providerId?: string;
    modelId?: string;
  };

  const workspaceDir = getWorkspaceDir();
  const provider = getProvider(providerId || "anthropic");
  const model = modelId || "claude-sonnet-4-20250514";
  const systemPrompt = buildSystemPrompt(workspaceDir);
  const tools = getToolSchemas();

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

      const conversationMessages: ProviderMessage[] = [...messages];
      let turns = 0;

      try {
        while (turns < MAX_TURNS) {
          turns++;

          // リトライ付きAPI呼び出し
          let response = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              response = await provider.chat(
                conversationMessages,
                systemPrompt,
                tools,
                model,
                { onText: (text) => send("text", { text }) }
              );
              break;
            } catch (retryErr: unknown) {
              const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
              if ((msg.includes("overloaded") || msg.includes("529")) && attempt < 2) {
                send("text", { text: "\n\n*サーバー混雑中...再試行します...*\n\n" });
                await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
                continue;
              }
              throw retryErr;
            }
          }

          if (!response) throw new Error("リトライ上限に達しました");

          // ツール実行
          if (response.toolCalls.length > 0) {
            const toolResultTexts: string[] = [];

            for (const tc of response.toolCalls) {
              send("tool_use", { name: tc.name, input: tc.input });

              const tool = getToolByName(tc.name);
              let resultContent: string;
              let isError = false;

              if (tool) {
                const result = await tool.execute(tc.input, workspaceDir);
                resultContent = result.isError ? `Error: ${result.error}` : result.output;
                isError = !!result.isError;
              } else {
                resultContent = `Error: Unknown tool "${tc.name}"`;
                isError = true;
              }

              send("tool_result", { name: tc.name, output: resultContent, isError });
              toolResultTexts.push(`[${tc.name}]: ${resultContent}`);
            }

            // 会話にアシスタントのテキスト+ツール結果を追加して続行
            conversationMessages.push({
              role: "assistant",
              content: response.textContent || "ツールを実行します。",
            });
            conversationMessages.push({
              role: "user",
              content: `ツール実行結果:\n${toolResultTexts.join("\n\n")}`,
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
