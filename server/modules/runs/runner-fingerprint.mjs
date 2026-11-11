import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Include generated output too: another bddgen invocation must invalidate reuse. */
export function runnerFingerprint(paths) {
  const hash = createHash("sha256");
  function visit(path) {
    hash.update(path);
    if (!existsSync(path)) {
      hash.update("missing");
      return;
    }
    const entries = readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) hash.update(file).update(readFileSync(file));
    }
  }
  for (const path of paths.directories) visit(path);
  for (const file of paths.files) {
    hash.update(file);
    hash.update(existsSync(file) ? readFileSync(file) : "missing");
  }
  return hash.digest("hex");
}
