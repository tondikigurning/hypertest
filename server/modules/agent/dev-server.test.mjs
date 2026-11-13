import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("editing an API dependency does not interrupt a running agent process", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "automation-dev-server-"));
  const dependency = join(root, "dependency.mjs");
  const entry = join(root, "server.mjs");
  await writeFile(dependency, "export const value = 1;\n");
  await writeFile(entry, 'import "./dependency.mjs"; console.log("STARTED"); setInterval(() => {}, 1000);\n');
  const pkg = JSON.parse(await readFile(new URL("../../../package.json", import.meta.url), "utf8"));
  const args = pkg.scripts["dev:api"].split(/\s+/).slice(1, -1);
  const child = spawn(process.execPath, [...args, entry], { stdio: ["ignore", "pipe", "pipe"] });
  t.after(async () => {
    child.kill();
    await rm(root, { recursive: true, force: true });
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  const deadline = Date.now() + 5000;
  while (!output.includes("STARTED") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.match(output, /STARTED/);
  await writeFile(dependency, "export const value = 2;\n");
  await new Promise((resolve) => setTimeout(resolve, 1600));
  assert.equal((output.match(/STARTED/g) || []).length, 1, "API restarted while work could be running");
});
