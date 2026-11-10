import { execFile } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { parseFeature } from "../catalog/scenario-catalog.mjs";

const git = promisify(execFile);
const prefix = "apps/tenants/tests/bdd/features/";
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
    const beforeIds = before.map((item) => item.id).filter(Boolean);
    const afterIds = after.map((item) => item.id).filter(Boolean);
    if (new Set(beforeIds).size !== beforeIds.length || new Set(afterIds).size !== afterIds.length)
      throw new Error("Draft preview cannot match duplicate scenario IDs. Fix the duplicate IDs in this feature.");
    const old = new Map(before.filter((item) => item.id).map((item) => [item.id, item]));
    const current = new Map(after.filter((item) => item.id).map((item) => [item.id, item]));
    for (const item of after) {
      const previous = item.id ? old.get(item.id) : undefined;
      if (!previous) changes.push({ kind: "added", after: item });
      else if (semantic(previous) !== semantic(item)) changes.push({ kind: "changed", before: previous, after: item });
    }
    for (const item of before) if (item.id && !current.has(item.id)) changes.push({ kind: "deleted", before: item });
  }
  return changes;
}
