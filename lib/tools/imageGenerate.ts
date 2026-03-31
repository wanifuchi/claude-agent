import OpenAI from "openai";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { Tool, ToolResult } from "./types";

export const ImageGenerateTool: Tool = {
  name: "ImageGenerate",
  description:
    "DALL-E 3を使って画像を生成します。プロンプトを英語で指定してください。生成された画像はワークスペースに保存されます。OPENAI_API_KEY環境変数が必要です。",
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "画像生成のプロンプト（英語推奨）",
      },
      filename: {
        type: "string",
        description: "保存するファイル名（例: image.png）",
      },
      size: {
        type: "string",
        description: "画像サイズ: 1024x1024, 1792x1024, 1024x1792",
      },
    },
    required: ["prompt", "filename"],
  },
  isReadOnly: false,

  async execute(input, workspaceDir): Promise<ToolResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { output: "", error: "OPENAI_API_KEY が設定されていません", isError: true };
    }

    const prompt = input.prompt as string;
    const filename = input.filename as string;
    const size = (input.size as string) || "1024x1024";

    try {
      const client = new OpenAI({ apiKey });
      const response = await client.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: size as "1024x1024" | "1792x1024" | "1024x1792",
        response_format: "b64_json",
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        return { output: "", error: "画像データが返されませんでした", isError: true };
      }

      const buffer = Buffer.from(b64, "base64");
      const outDir = join(workspaceDir, "generated");
      await mkdir(outDir, { recursive: true });
      const filePath = join(outDir, filename);
      await writeFile(filePath, buffer);

      return {
        output: `画像を生成して generated/${filename} に保存しました（${(buffer.length / 1024).toFixed(0)} KB）\nプロンプト: ${prompt}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { output: "", error: msg, isError: true };
    }
  },
};
