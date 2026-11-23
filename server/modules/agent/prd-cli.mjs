import { createHash } from "node:crypto";
import { closeDatabase } from "../../database.mjs";
import { createPrdDatabase } from "./prd-database.mjs";
import { prdIdentity } from "./prd-identity.mjs";

async function main() {
  const store = createPrdDatabase();
  const [action, path] = process.argv.slice(2);
  if (action === "list") return process.stdout.write(`${JSON.stringify(await store.list())}\n`);
  if (action === "read") {
    const content = await store.read(path);
    if (content === undefined) throw new Error("PRD not found.");
    return process.stdout.write(content);
  }
  if (action === "versions") {
    const id = typeof path === "string" && prdIdentity(path);
    if (!id) throw new Error("Choose a valid PRD identifier.");
    return process.stdout.write(`${JSON.stringify(await store.versions(id.module, id.menu))}\n`);
  }
  if (action !== "write" && action !== "delete")
    throw new Error("Use list, read, versions, write, or delete with a PRD identifier and JSON input when needed.");
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 600000) throw new Error("Input too large.");
  }
  const payload = JSON.parse(input);
  if (action === "delete") {
    const id = typeof path === "string" && prdIdentity(path);
    if (!id) throw new Error("Choose a valid PRD identifier.");
    if (typeof payload.versionId !== "string" || typeof payload.expectedContent !== "string")
      throw new Error("Provide versionId and expectedContent (the exact version content) in JSON.");
    const result = await store.mutate("delete", {
      ...id,
      versionId: payload.versionId,
      expectedContent: payload.expectedContent,
    });
    return process.stdout.write(`${JSON.stringify(result)}\n`);
  }
  const { content, expected, approvedSha256 } = payload;
  if (typeof content !== "string" || (expected !== null && typeof expected !== "string"))
    throw new Error("Provide content and expected (current content or null) in JSON.");
  const before = await store.read(path);
  if ((before ?? null) !== expected) throw new Error("The PRD changed. Read it again before editing.");
  const digest = createHash("sha256").update(content).digest("hex");
  await store.write(path, content, {
    expected,
    redact: (value) => value,
    requestApproval: async () => approvedSha256 === digest,
  });
  process.stdout.write(`${JSON.stringify({ saved: true, sha256: digest })}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
