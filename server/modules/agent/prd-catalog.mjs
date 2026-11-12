import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// Only regular files in the two-level PRD tree are exposed; symlinks are never followed.
export async function listPrds(workspace) {
  const base = join(workspace, "docs", "prd");
  async function entries(path) {
    try {
      const info = await lstat(path);
      if (!info.isDirectory() || info.isSymbolicLink()) return [];
      return await readdir(path, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }
  // Ensure intermediate directories are not symlinks either.
  const docs = await lstat(join(workspace, "docs")).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!docs?.isDirectory() || docs.isSymbolicLink()) return [];
  const result = [];
  for (const module of await entries(base)) {
    if (!module.isDirectory() || module.isSymbolicLink()) continue;
    for (const file of await entries(join(base, module.name))) {
      if (!file.isFile() || file.isSymbolicLink() || !file.name.endsWith(".md")) continue;
      const path = join(base, module.name, file.name);
      const info = await lstat(path);
      if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size > 262144) continue;
      const content = await readFile(path, "utf8");
      const frontMatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || "";
      const status = frontMatter.match(/^status\s*:\s*["']?([^\s"'#]+)["']?/im)?.[1] || "unknown";
      result.push({ module: module.name, submodule: file.name.slice(0, -3), status, content });
    }
  }
  return result.sort((a, b) => a.module.localeCompare(b.module) || a.submodule.localeCompare(b.submodule));
}
