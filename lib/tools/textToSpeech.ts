import OpenAI from "openai";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { Tool, ToolResult } from "./types";

export const TextToSpeechTool: Tool = {
  name: "TextToSpeech",
  description:
    "OpenAI TTSを使ってテキストを音声に変換します。生成された音声ファイルはワークスペースに保存されます。OPENAI_API_KEY環境変数が必要です。",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "読み上げるテキスト",
      },
      filename: {
        type: "string",
        description: "保存するファイル名（例: speech.mp3）",
      },
      voice: {
        type: "string",
        description: "声の種類: alloy, echo, fable, onyx, nova, shimmer",
      },
    },
    required: ["text", "filename"],
  },
  isReadOnly: false,

  async execute(input, workspaceDir): Promise<ToolResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { output: "", error: "OPENAI_API_KEY が設定されていません", isError: true };
    }

    const text = input.text as string;
    const filename = input.filename as string;
    const voice = (input.voice as string) || "nova";

    try {
      const client = new OpenAI({ apiKey });
      const response = await client.audio.speech.create({
        model: "tts-1",
        voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
        input: text,
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      const outDir = join(workspaceDir, "generated");
      await mkdir(outDir, { recursive: true });
      const filePath = join(outDir, filename);
      await writeFile(filePath, buffer);

      return {
        output: `音声を生成して generated/${filename} に保存しました（${(buffer.length / 1024).toFixed(0)} KB）\n声: ${voice}\nテキスト: ${text.slice(0, 100)}${text.length > 100 ? "..." : ""}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { output: "", error: msg, isError: true };
    }
  },
};
