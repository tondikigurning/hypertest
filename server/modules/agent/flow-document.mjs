import { lstat, readFile } from "node:fs/promises";
import { safeWorkspacePath } from "./agent-tools.mjs";

export async function readFlowDocument(workspace, module, menu) {
  if (![module, menu].every((part) => typeof part === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(part)))
    throw new Error("Choose a valid module and menu.");
  const path = await safeWorkspacePath(workspace, `e2e/tests/bdd/features/${module}/${menu}.flows.md`);
  const info = await lstat(path).catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!info) return { content: null };
  if (!info.isFile() || info.nlink > 1 || info.size > 262144)
    throw new Error("Flow document is unavailable or exceeds 256 KB.");
  return { content: await readFile(path, "utf8") };
}
