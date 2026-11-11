import { execFile } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { enrichScenario, parseFeature } from "../catalog/scenario-catalog.mjs";

const git = promisify(execFile);
const prefix = "e2e/tests/bdd/features/";
const semantic = ({ title, feature, tags, background, steps, outline }) =>
  JSON.stringify({ title, feature, tags, background, steps, outline });

/** Compare source intent against the session's immutable base, without relying on generated catalogs. */
export async function draftScenarios(workspace, baseCommit) {
  const options = { cwd: workspace, maxBuffer: 4 * 1024 * 1024, timeout: 30000 };
  const tracked = await git("git", ["diff", "--name-only", "-z", baseCommit, "--", prefix], options);
  const untracked = await git("git", ["ls-files", "--others", "--exclude-standard", "-z", "--", prefix], options);
  const paths = [
    ...new Set(`${tracked.stdout}\0${untracked.stdout}`.split("\0").filter((file) => file.endsWith(".feature"))),
  ];
  const changes = [];
  for (const file of paths) {
    const relative = file.slice(prefix.length);
    let beforeText = "";
    try {
      beforeText = (await git("git", ["show", `${baseCommit}:${file}`], options)).stdout;
    } catch (error) {
      if (error.code !== 128) throw error;
    }
    let afterText = "";
    try {
      const absolute = join(workspace, file);
      const info = await lstat(absolute);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 262144)
        throw new Error("A draft feature is not a reviewable regular file.");
      afterText = await readFile(absolute, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const before = parseFeature(beforeText, relative);
    const after = parseFeature(afterText, relative);
    const counts = (items, key) => {
      const result = new Map();
      for (const item of items) {
        const value = key(item);
        if (value) result.set(value, (result.get(value) ?? 0) + 1);
      }
      return result;
    };
    const beforeIds = counts(before, (item) => item.id);
    const afterIds = counts(after, (item) => item.id);
    const beforeSemantics = counts(before, semantic);
    const afterSemantics = counts(after, semantic);
    const matchedBefore = new Set();
    for (const item of after) {
      const uniqueIdMatch =
        item.id && beforeIds.get(item.id) === 1 && afterIds.get(item.id) === 1
          ? before.find((candidate) => candidate.id === item.id)
          : undefined;
      const exactCandidates = before.filter((candidate) => semantic(candidate) === semantic(item));
      const uniqueSemanticMatch =
        beforeSemantics.get(semantic(item)) === 1 && afterSemantics.get(semantic(item)) === 1
          ? exactCandidates[0]
          : undefined;
      const previous = uniqueIdMatch || uniqueSemanticMatch;
      if (previous) {
        matchedBefore.add(previous.key);
        if (semantic(previous) !== semantic(item))
          changes.push({ kind: "changed", before: enrichScenario(previous), after: enrichScenario(item) });
      } else {
        const duplicateId = Boolean(item.id && ((beforeIds.get(item.id) ?? 0) > 1 || (afterIds.get(item.id) ?? 0) > 1));
        const ambiguousSemantic = exactCandidates.length > 1 || afterSemantics.get(semantic(item)) > 1;
        changes.push({
          kind: "added",
          after: enrichScenario(item),
          identityAmbiguous: duplicateId || ambiguousSemantic,
        });
      }
    }
    for (const item of before) {
      if (matchedBefore.has(item.key)) continue;
      const duplicateId = Boolean(item.id && ((beforeIds.get(item.id) ?? 0) > 1 || (afterIds.get(item.id) ?? 0) > 0));
      const ambiguousIdentity = duplicateId || beforeSemantics.get(semantic(item)) > 1;
      changes.push({ kind: "deleted", before: enrichScenario(item), identityAmbiguous: ambiguousIdentity });
    }
  }
  return changes;
}
