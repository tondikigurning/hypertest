import assert from "node:assert/strict";
import { access, writeFile } from "node:fs/promises";
import test from "node:test";
import { startExplorationBrowser } from "./exploration-browser.mjs";

function fakeBrowser({ failLogin = false } = {}) {
  const filled = [];
  const page = {
    goto: async () => {},
    waitForFunction: async () => {},
    waitForURL: async () => {},
    waitForResponse: async () => ({ ok: () => !failLogin }),
    locator: (selector) => ({
      first: () => ({
        waitFor: async () => {},
        fill: async (value) => filled.push([selector, value]),
        click: async () => {},
      }),
    }),
  };
  const context = { newPage: async () => page, storageState: async ({ path }) => writeFile(path, "private state") };
  const browser = { newContext: async () => context, close: async () => {} };
  return { chromium: { launch: async () => browser }, filled };
}

test("hands an authenticated session to playwright-cli without passing credentials and removes temporary state", async () => {
  const fake = fakeBrowser();
  const commands = [];
  let state;
  const name = await startExplorationBrowser(
    {
      workspace: ".",
      target: "https://example.invalid/",
      variables: { E2E_USERNAME: "user", E2E_PASSWORD: "password" },
    },
    {
      chromium: fake.chromium,
      runCli: async (args) => {
        commands.push(args);
        if (args[0] === "state-load") {
          state = args[1];
          await access(state);
        }
      },
    },
  );
  assert.match(name, /^testasaurus-/);
  assert.deepEqual(
    fake.filled.map((entry) => entry[1]),
    ["user", "password"],
  );
  assert.deepEqual(
    commands.map((entry) => entry[0]),
    ["open", "state-load", "goto"],
  );
  assert.ok(!JSON.stringify(commands).includes("password"));
  await assert.rejects(access(state));
});

test("login failure is sanitized and does not launch the CLI", async () => {
  const fake = fakeBrowser({ failLogin: true });
  let invoked = false;
  await assert.rejects(
    startExplorationBrowser(
      {
        workspace: ".",
        target: "https://example.invalid/",
        variables: { E2E_USERNAME: "user", E2E_PASSWORD: "secret" },
      },
      {
        chromium: fake.chromium,
        runCli: async () => {
          invoked = true;
        },
      },
    ),
    /Could not start the exploration browser/,
  );
  assert.equal(invoked, false);
});
