import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

// Run after compiling the generated selector.ts and list.ts with the repository TypeScript compiler.
// node docs/automation/skill-evaluation/verify-generated-e2e.mjs <compiled-output-directory>
if (!process.argv[2]) throw new Error("Pass the compiled POM output directory");
const output = path.resolve(process.argv[2]);
const require = createRequire(new URL("../../../e2e/package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const extension = ".js";
const { SelectorPage } = await import(pathToFileURL(path.join(output, "selector" + extension)).href);
const { ListPage } = await import(pathToFileURL(path.join(output, "list" + extension)).href);

async function fixture(body, run) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // No outbound traffic is permitted, including from generated implementations.
    await page.route("**/*", (route) => route.abort());
    await page.setContent(body);
    await run(page);
  } finally {
    await browser.close();
  }
}

test("generated selector resolves a delayed dialog with an ordinary text title", { timeout: 12000 }, async () => {
  await fixture(
    `<button id="create">Create New</button><script>
    document.getElementById('create').onclick = () => setTimeout(() => document.body.insertAdjacentHTML('beforeend', '<div role="dialog"><div>Select Report Type</div><button disabled>Next</button></div>'), 250);
  </script>`,
    async (page) => {
      const subject = new SelectorPage(page);
      await subject.open();
      await subject.expectNextDisabled();
      assert.equal(await page.getByRole("dialog").count(), 1);
    },
  );
});

test("generated reset waits for current results even when row count is unchanged", { timeout: 12000 }, async () => {
  await fixture(
    `<input data-testid="search" value="old"><button data-testid="reset">Reset</button><div data-testid="results" aria-busy="false"><div role="row">old row</div></div><script>
    document.querySelector('button').onclick = () => {
      document.querySelector('input').value = '';
      const results = document.querySelector('[data-testid="results"]');
      results.setAttribute('aria-busy','true');
      setTimeout(() => { results.innerHTML = '<div role="row">restored row</div>'; results.setAttribute('aria-busy','false'); }, 250);
    };
  </script>`,
    async (page) => {
      await new ListPage(page).reset();
      assert.equal(await page.getByRole("row").textContent(), "restored row");
      assert.equal(await page.getByTestId("search").inputValue(), "");
    },
  );
});

test("generated no-match check ignores a stale empty state while results are busy", { timeout: 12000 }, async () => {
  await fixture(
    `<input data-testid="search"><button data-testid="reset">Reset</button><div data-testid="results" aria-busy="true">No Data Available</div><script>
    setTimeout(() => { const results=document.querySelector('[data-testid="results"]');results.innerHTML='<div role="row">matching row</div>';results.setAttribute('aria-busy','false'); },250);
  </script>`,
    async (page) => {
      assert.equal(await new ListPage(page).hasNoMatches(), false);
    },
  );
});

test("generated no-match check confirms settled empty results", { timeout: 12000 }, async () => {
  await fixture(
    `<input data-testid="search"><button data-testid="reset">Reset</button><div data-testid="results" aria-busy="false">No Data Available</div>`,
    async (page) => {
      assert.equal(await new ListPage(page).hasNoMatches(), true);
    },
  );
});

test("generated no-match check propagates readiness failure", { timeout: 12000 }, async () => {
  await fixture(
    `<input data-testid="search"><button data-testid="reset">Reset</button><div data-testid="results" aria-busy="true">No Data Available</div>`,
    async (page) => {
      await assert.rejects(new ListPage(page).hasNoMatches());
    },
  );
});

test("generated no-match check rejects an unresolved result instead of returning unavailable", {
  timeout: 12000,
}, async () => {
  await fixture(
    `<input data-testid="search"><button data-testid="reset">Reset</button><div data-testid="results" aria-busy="false"></div>`,
    async (page) => {
      await assert.rejects(new ListPage(page).hasNoMatches());
    },
  );
});

test("generated no-match check rejects conflicting row and empty-state evidence", { timeout: 12000 }, async () => {
  await fixture(
    `<input data-testid="search"><button data-testid="reset">Reset</button><div data-testid="results" aria-busy="false"><div role="row">matching row</div><p>No Data Available</p></div>`,
    async (page) => {
      await assert.rejects(new ListPage(page).hasNoMatches());
    },
  );
});
