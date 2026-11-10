import { execFile, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const require = createRequire(resolve(import.meta.dirname, "../../../../tenants/package.json"));

function cliScript() {
  if (process.platform === "win32") {
    const shim = execFileSync("where.exe", ["playwright-cli.cmd"], { encoding: "utf8" }).trim().split(/\r?\n/)[0];
    return join(dirname(shim), "node_modules", "@playwright", "cli", "playwright-cli.js");
  }
  const shim = execFileSync("which", ["playwright-cli"], { encoding: "utf8" }).trim();
  return shim;
}

export async function startExplorationBrowser({ workspace, target, variables }, dependencies = {}) {
  if (
    !variables ||
    typeof variables.E2E_USERNAME !== "string" ||
    !variables.E2E_USERNAME.trim() ||
    typeof variables.E2E_PASSWORD !== "string" ||
    !variables.E2E_PASSWORD.trim() ||
    variables.E2E_USERNAME.length > 4096 ||
    variables.E2E_PASSWORD.length > 4096
  )
    throw new Error("Set the E2E username and password in Variables before browser exploration.");
  const name = `testasaurus-${randomUUID()}`;
  const directory = await mkdtemp(join(tmpdir(), "testasaurus-auth-"));
  const state = join(directory, "state.json");
  const runCli =
    dependencies.runCli ||
    (async (args) => {
      await execFileAsync(process.execPath, [cliScript(), `-s=${name}`, ...args], {
        cwd: workspace,
        timeout: 120000,
        windowsHide: true,
      });
    });
  let browser;
  let opened = false;
  try {
    const chromium = dependencies.chromium || require("playwright").chromium;
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ baseURL: target });
    const page = await context.newPage();
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.locator('form[method="POST"]').first().waitFor({ state: "visible", timeout: 30000 });
    await page.waitForFunction(
      () =>
        ["identifier", "password"].every((id) => {
          const input = document.getElementById(id);
          return input && Object.getOwnPropertyNames(input).some((key) => key.startsWith("__reactProps$"));
        }),
      null,
      { timeout: 30000 },
    );
    await page.locator("#identifier").first().fill(variables.E2E_USERNAME);
    await page.locator("#password").first().fill(variables.E2E_PASSWORD);
    const [response] = await Promise.all([
      page.waitForResponse(
        (result) =>
          result.request().method() === "POST" && ["/login", "/login.data"].includes(new URL(result.url()).pathname),
      ),
      page.locator('button[type="submit"]:has-text("Login")').first().click(),
    ]);
    if (!response.ok()) throw new Error("Login failed");
    await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 60000 });
    await page.locator('[data-testid="user-profile-avatar"]').first().waitFor({ state: "visible", timeout: 30000 });
    await context.storageState({ path: state });
    opened = true;
    await runCli(["open", "about:blank"]);
    await runCli(["state-load", state]);
    await runCli(["goto", target]);
    return name;
  } catch {
    if (opened) await runCli(["close"]).catch(() => {});
    throw new Error(
      "Could not start the exploration browser. Check Variables, target access, Playwright and playwright-cli.",
    );
  } finally {
    await browser?.close().catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
}

export async function closeExplorationBrowser(workspace, name) {
  try {
    await execFileAsync(process.execPath, [cliScript(), `-s=${name}`, "close"], {
      cwd: workspace,
      timeout: 15000,
      windowsHide: true,
    });
  } catch {
    /* The session may already have expired or been closed by the agent. */
  }
}
