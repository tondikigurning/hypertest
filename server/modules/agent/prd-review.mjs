import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

function reviewed(content) {
  const frontMatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || "";
  return /^status\s*:\s*["']?reviewed["']?\s*(?:#.*)?$/im.test(frontMatter);
}

function validatedLines(content) {
  return content.split(/\r?\n/).filter((line) => /\[validated\]/i.test(line));
}

export function requiresPrdReview(before, after) {
  if (before === after) return false;
  if (reviewed(after)) return true;
  const previous = new Map();
  for (const line of validatedLines(before)) previous.set(line, (previous.get(line) || 0) + 1);
  for (const line of validatedLines(after)) {
    const remaining = previous.get(line) || 0;
    if (!remaining) return true;
    previous.set(line, remaining - 1);
  }
  return false;
}

export async function authorizePrdWrite({ workspace, path, content, requestApproval, signal, redact }) {
  const normalized = path.replaceAll("\\", "/");
  if (!/^docs\/prd\/.+\.md$/i.test(normalized)) return;
  const absolute = join(workspace, ...normalized.split("/"));
  const readCurrent = async () => {
    try {
      return await readFile(absolute, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return "";
      throw error;
    }
  };
  const before = await readCurrent();
  if (!requiresPrdReview(before, content)) return;
  if (redact(content) !== content)
    throw new Error(
      "The PRD contains text that cannot be displayed safely for review. Remove sensitive content first.",
    );
  const digest = createHash("sha256").update(content).digest("hex");
  const approved = await requestApproval({
    kind: "prd-review",
    reason: `Review the complete proposed PRD at ${normalized}. Approving accepts its shown status and the items marked validated in this version. SHA-256: ${digest}`,
    command: content,
    signal,
  });
  if (!approved || signal?.aborted) throw new Error("The proposed PRD was not approved; the file was not changed.");
  if ((await readCurrent()) !== before)
    throw new Error("The PRD changed while awaiting review. Review the current file and try again.");
  return true;
}
