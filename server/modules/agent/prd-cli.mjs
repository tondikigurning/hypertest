import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { closeDatabase, database } from "../../database.mjs";
import { agentPrds } from "../results/schema.mjs";
import { createPrdDatabase } from "./prd-database.mjs";
import { prdIdentity } from "./prd-identity.mjs";

const identity = process.env.PRD_IDENTITY;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function main() {
  const [action, path] = process.argv.slice(2);
  if (identity && !uuid.test(identity)) throw new Error("PRD_IDENTITY must be a valid browser identity.");
  if (!identity && action === "read") {
    const id = typeof path === "string" && prdIdentity(path);
    if (!id) throw new Error("Choose a valid PRD identifier.");
    const rows = await database()
      .select({ state: agentPrds.state })
      .from(agentPrds)
      .where(and(eq(agentPrds.module, id.module), eq(agentPrds.menu, id.menu)));
    const matches = rows.flatMap(({ state }) => {
      const active = state.versions.find((version) => version.id === state.activeVersionId);
      return active ? [active.content] : [];
    });
    if (!matches.length) throw new Error("PRD not found.");
    if (matches.length > 1)
      throw new Error(
        "Multiple PRDs match this menu. Set PRD_IDENTITY to select the intended browser identity.",
      );
    return process.stdout.write(matches[0]);
  }
  if (!identity) throw new Error("Set PRD_IDENTITY to the intended browser identity for list or write.");
  const store = createPrdDatabase(identity);
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
