import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";
import { draftArtifactPath } from "./draft-artifacts.mjs";

test("draft screenshots resolve from the runner's mounted temp directory", () => {
  const directory = resolve("fixture-artifacts", "hyperscal-automation-fixture");
  assert.equal(
    draftArtifactPath(directory, "/run-data/hyperscal-automation-fixture/output/orders/screenshot.png"),
    join(directory, "output/orders/screenshot.png"),
  );
});

test("draft evidence cannot escape its selected run output", () => {
  const directory = resolve("fixture-artifacts", "hyperscal-automation-fixture");
  for (const path of [
    "/run-data/other-run/output/screenshot.png",
    "/run-data/hyperscal-automation-fixture/auth.json",
    "/run-data/hyperscal-automation-fixture/output/../auth.json",
    "/run-data/hyperscal-automation-fixture/output/..\\..\\auth.json",
    "/run-data/hyperscal-automation-fixture/output/screenshot.png:secret",
  ])
    assert.equal(draftArtifactPath(directory, path), undefined);
});
