import { createHash } from "node:crypto";
import { closeDatabase } from "../../database.mjs";
import { createPrdDatabase } from "./prd-database.mjs";

const identity = process.env.AUTOMATION_PRD_IDENTITY;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function main() {
  if (!uuid.test(identity || "")) throw new Error("Set AUTOMATION_PRD_IDENTITY to the intended browser identity.");
  const store = createPrdDatabase(identity);
  const [action, path] = process.argv.slice(2);
  if (action === "list") return process.stdout.write(`${JSON.stringify(await store.list())}\n`);
  if (action === "read") {
    const content = await store.read(path);
    if (content === undefined) throw new Error("PRD not found.");
    return process.stdout.write(content);
  }
  if (action !== "write") throw new Error("Use list, read <identifier>, or write <identifier> with JSON on stdin.");
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 600000) throw new Error("Input too large.");
  }
  const { content, expected, approvedSha256 } = JSON.parse(input);
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
