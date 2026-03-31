import { NextRequest } from "next/server";
import archiver from "archiver";
import { createReadStream, statSync } from "fs";
import { readdir, stat } from "fs/promises";
import { join, relative } from "path";
import { PassThrough } from "stream";

function getWorkspaceDir(): string {
  return process.env.WORKSPACE_DIR || "/tmp/claude-agent-workspace";
}

const IGNORE = new Set(["node_modules", ".git", ".next", "__pycache__", ".DS_Store"]);

async function getFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(d: string) {
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE.has(entry.name)) continue;
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        const s = statSync(full);
        // 10MB以上のファイルはスキップ
        if (s.size < 10 * 1024 * 1024) {
          files.push(full);
        }
      }
    }
  }

  try {
    await walk(dir);
  } catch {
    // workspace doesn't exist yet
  }

  return files;
}

export async function GET(req: NextRequest) {
  const workspaceDir = getWorkspaceDir();

  const files = await getFiles(workspaceDir);

  if (files.length === 0) {
    return new Response(
      JSON.stringify({ error: "ワークスペースにファイルがありません" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const archive = archiver("zip", { zlib: { level: 9 } });
  const passThrough = new PassThrough();

  archive.pipe(passThrough);

  for (const file of files) {
    const relPath = relative(workspaceDir, file);
    archive.file(file, { name: relPath });
  }

  archive.finalize();

  // Convert Node stream to Web ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      passThrough.on("data", (chunk) => controller.enqueue(chunk));
      passThrough.on("end", () => controller.close());
      passThrough.on("error", (err) => controller.error(err));
    },
  });

  const timestamp = new Date().toISOString().slice(0, 10);

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="workspace-${timestamp}.zip"`,
    },
  });
}
