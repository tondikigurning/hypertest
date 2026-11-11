import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { syncScenarioCatalog } from "./catalog-sync.mjs";

test("syncs scenario identity, module and Gherkin metadata from feature sources", async () => {
  const root = await mkdtemp(join(tmpdir(), "automation-catalog-sync-"));
  const featureDirectory = join(root, "auth");
  await mkdir(featureDirectory);
  await writeFile(
    join(featureDirectory, "login.feature"),
    `Feature: Login
  @TEN_AUT_AUTH_E2E_001 @flow:TEN_AUTH_LOGIN_FLOW @type:positive
  Scenario: Sign in
    Given an account exists
    When the user signs in
    Then the dashboard is visible
`,
  );
  let persisted;
  try {
    const count = await syncScenarioCatalog(root, {
      replace: async (scenarios) => {
        persisted = scenarios;
      },
    });
    assert.equal(count, 1);
    assert.equal(persisted[0].id, "TEN_AUT_AUTH_E2E_001");
    assert.equal(persisted[0].module, "auth");
    assert.equal(persisted[0].category, "Login");
    assert.deepEqual(persisted[0].steps, [
      "Given an account exists",
      "When the user signs in",
      "Then the dashboard is visible",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
