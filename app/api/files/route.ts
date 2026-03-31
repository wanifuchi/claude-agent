import { readdir, stat } from "fs/promises";
import { join, relative } from "path";

function getWorkspaceDir(): string {
  return process.env.WORKSPACE_DIR || "/tmp/claude-agent-workspace";
}

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

const IGNORE = new Set(["node_modules", ".git", ".next", "__pycache__", ".DS_Store"]);

async function buildTree(dir: string, root: string, depth: number): Promise<FileNode[]> {
  if (depth > 5) return [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const nodes: FileNode[] = [];

    const sorted = entries
      .filter((e) => !IGNORE.has(e.name) && !e.name.startsWith("."))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    for (const entry of sorted) {
      const full = join(dir, entry.name);
      const relPath = relative(root, full);

      if (entry.isDirectory()) {
        const children = await buildTree(full, root, depth + 1);
        nodes.push({ name: entry.name, path: relPath, isDir: true, children });
      } else {
        nodes.push({ name: entry.name, path: relPath, isDir: false });
      }
    }

    return nodes;
  } catch {
    return [];
  }
}

export async function GET() {
  const workspaceDir = getWorkspaceDir();

  try {
    await stat(workspaceDir);
  } catch {
    return Response.json({ tree: [] }, { status: 404 });
  }

  const tree = await buildTree(workspaceDir, workspaceDir, 0);
  return Response.json({ tree });
}
