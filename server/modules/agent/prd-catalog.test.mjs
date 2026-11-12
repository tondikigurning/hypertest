import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { listPrds } from "./prd-catalog.mjs";

test("lists only regular submodule Markdown files and preserves their review state", async () => {
  const root = await mkdtemp(join(tmpdir(), "hypertest-prd-"));
  try {
    assert.deepEqual(await listPrds(root), []);
    await mkdir(join(root, "docs/prd/sales"), { recursive: true });
    await writeFile(join(root, "docs/prd/sales/orders.md"), "---\nstatus: draft\n---\n[observed] Needs review");
    await writeFile(join(root, "docs/prd/sales/notes.txt"), "ignored");
    const result = await listPrds(root);
    assert.equal(result.length, 1);
    assert.equal(result[0].status, "draft");
    assert.match(result[0].content, /\[observed\]/);
    assert.equal(result[0].submodule, "orders");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not follow a linked PRD directory", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "hypertest-prd-"));
  try {
    await mkdir(join(root, "docs"));
    await mkdir(join(root, "outside/module"), { recursive: true });
    await writeFile(join(root, "outside/module/secret.md"), "secret");
    try {
      await symlink(join(root, "outside"), join(root, "docs/prd"), "junction");
    } catch (error) {
      if (error.code === "EPERM") return t.skip("symlink creation unavailable");
      throw error;
    }
    assert.deepEqual(await listPrds(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
