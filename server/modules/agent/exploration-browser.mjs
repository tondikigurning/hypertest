import { execFile, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { startTargetEgressProxy } from "./agent-egress-proxy-server.mjs";

const execFileAsync = promisify(execFile);
const require = createRequire(resolve(import.meta.dirname, "../../../e2e/package.json"));
const activeBrowsers = new Map();

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
  const name = `q-rex-${randomUUID()}`;
  const directory = await mkdtemp(join(tmpdir(), "q-rex-auth-"));
  const state = join(directory, "state.json");
  const configPath = join(directory, "playwright-cli.json");
  let egressProxy;
  let proxy;
  try {
    egressProxy = await startTargetEgressProxy({ target });
    proxy = { server: egressProxy.url, bypass: "<-loopback>" };
    await writeFile(
      configPath,
      JSON.stringify({
        browser: {
          launchOptions: { proxy, args: ["--proxy-bypass-list=<-loopback>"] },
          contextOptions: { proxy },
        },
      }),
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
  } catch (cause) {
    await egressProxy?.close().catch(() => {});
    await rm(directory, { recursive: true, force: true });
    throw new Error("Could not configure target-only browser egress.", { cause });
  }
  const runCli =
    dependencies.runCli ||
    (async (args) => {
      // The CLI accepts --config on open, not on state-load/goto or subsequent commands.
      // The named session retains the proxy and context options from open.
      await execFileAsync(
        process.execPath,
        [cliScript(), `-s=${name}`, ...args, ...(args[0] === "open" ? [`--config=${configPath}`] : [])],
        {
          cwd: workspace,
          timeout: 120000,
          windowsHide: true,
        },
      );
    });
  let browser;
  let opened = false;
  try {
    const chromium = dependencies.chromium || require("playwright").chromium;
    browser = await chromium.launch({ headless: true, proxy, args: ["--proxy-bypass-list=<-loopback>"] });
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
    await runCli(["open", "about:blank"]);
    opened = true;
    await runCli(["state-load", state]);
    await runCli(["goto", target]);
    activeBrowsers.set(name, { workspace, directory, configPath, egressProxy, runCli });
    return name;
  } catch (cause) {
    if (opened) await runCli(["close"]).catch(() => {});
    throw new Error(
      "Could not start the exploration browser. Check Variables, target access, Playwright and playwright-cli.",
      { cause },
    );
  } finally {
    await browser?.close().catch(() => {});
    if (!activeBrowsers.has(name)) {
      await egressProxy.close().catch(() => {});
      await rm(directory, { recursive: true, force: true });
    }
  }
}

export async function closeExplorationBrowser(workspace, name) {
  const browser = activeBrowsers.get(name);
  try {
    if (browser) await browser.runCli(["close"]);
    else
      await execFileAsync(process.execPath, [cliScript(), `-s=${name}`, "close"], {
        cwd: workspace,
        timeout: 15000,
        windowsHide: true,
      });
  } catch {
    /* The session may already have expired or been closed by the agent. */
  } finally {
    if (browser) {
      activeBrowsers.delete(name);
      await browser.egressProxy.close().catch(() => {});
      await rm(browser.directory, { recursive: true, force: true });
    }
  }
}

export async function runExplorationBrowserCommand(workspace, name, args) {
  if (!/^q-rex-[0-9a-f-]+$/i.test(name) || !Array.isArray(args) || args.length < 1 || args.length > 4)
    throw new Error("The browser command is invalid.");
  if (!args.every((argument) => typeof argument === "string" && argument.length <= 4000))
    throw new Error("The browser command contains an invalid argument.");
  const browser = activeBrowsers.get(name);
  if (!browser || browser.workspace !== workspace)
    throw new Error("The exploration browser has expired. Start a new scoped browser session.");
  return execFileAsync(process.execPath, [cliScript(), `-s=${name}`, ...args], {
    cwd: workspace,
    timeout: 60000,
    maxBuffer: 256 * 1024,
    windowsHide: true,
  });
}
