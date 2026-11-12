import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAgentTools } from "./agent-tools.mjs";
import {
  closeExplorationBrowser,
  runExplorationBrowserCommand,
  startExplorationBrowser,
} from "./exploration-browser.mjs";

// Explicit smoke command: node --test server/modules/agent/exploration-browser.smoke.mjs
// Uses real Playwright and playwright-cli against synthetic loopback data only.
test("authenticated browser bridge explores a local fixture with real CLI commands", { timeout: 90000 }, async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "automation-agent-browser-smoke-"));
  const server = createServer((req, res) => {
    if (req.url === "/login" && req.method === "POST") {
      res.writeHead(200, { "content-type": "application/json", "set-cookie": "fixture-session=1; Path=/; HttpOnly" });
      res.end('{"ok":true}');
    } else if (req.url === "/login") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<form method="POST"><input id="identifier"><input id="password" type="password"><button type="submit">Login</button></form>
        <script>
          for (const id of ["identifier", "password"]) document.getElementById(id).__reactProps$fixture = {};
          document.querySelector('form').onsubmit = async (event) => {
            event.preventDefault();
            await fetch('/login', { method: 'POST' });
            location.href = '/';
          };
        </script>`);
    } else if (req.url === "/api/orders") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"items":[{"name":"E2E fixture order"}]}');
    } else if (req.headers.cookie?.includes("fixture-session=1")) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<span data-testid="user-profile-avatar">Fixture user</span><h1>Fixture dashboard</h1>
        <button id="orders">Orders</button><div id="result"></div>
        <script>document.getElementById('orders').onclick = async () => {
          const data = await (await fetch('/api/orders')).json();
          document.getElementById('result').textContent = data.items[0].name;
        };</script>`);
    } else {
      res.writeHead(401);
      res.end("Unauthenticated fixture request");
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  let browser;
  t.after(async () => {
    if (browser) await closeExplorationBrowser(workspace, browser);
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(workspace, { recursive: true, force: true });
  });
  const target = `http://127.0.0.1:${server.address().port}`;
  const variables = { E2E_USERNAME: "fixture-user", E2E_PASSWORD: "fixture-password" };
  let approvals = 0;
  const tools = createAgentTools({
    workspace,
    target,
    variables,
    ensureBrowser: async () => {
      browser ||= await startExplorationBrowser({ workspace, target, variables });
    },
    runBrowserCommand: (args) => runExplorationBrowserCommand(workspace, browser, args),
    requestApproval: async () => {
      approvals++;
      return true;
    },
  });
  const snapshot = await tools.playwright_cli.execute({ action: "snapshot" });
  assert.match(snapshot, /Fixture dashboard/);
  const reference = snapshot.match(/button "Orders" \[ref=(e\d+)\]/)?.[1];
  assert.ok(reference, "Authenticated CLI snapshot must expose current element references");
  assert.match(
    await tools.playwright_cli.execute({ action: "generate-locator", target: reference }),
    /getByRole|locator/,
  );
  await tools.playwright_cli.execute({ action: "click", target: reference, dataOwner: "e2e-owned" });
  assert.equal(approvals, 1);
  assert.match(await tools.playwright_cli.execute({ action: "snapshot" }), /E2E fixture order/);
  assert.match(await tools.playwright_cli.execute({ action: "requests" }), /\/api\/orders/);
  await tools.playwright_cli.execute({ action: "goto", value: "/" });
  assert.match(await tools.playwright_cli.execute({ action: "snapshot" }), /Fixture dashboard/);

  let outsideRequests = 0;
  const outside = createServer((_req, res) => {
    outsideRequests++;
    res.end("Outside the selected origin");
  });
  outside.listen(0, "127.0.0.1");
  await once(outside, "listening");
  try {
    // Bypass the tool's URL check to verify the named CLI session still retains its egress proxy after state-load.
    await runExplorationBrowserCommand(workspace, browser, ["goto", `http://127.0.0.1:${outside.address().port}/`]);
    assert.equal(outsideRequests, 0, "Authentication-state loading must preserve target-only egress");
  } finally {
    outside.closeAllConnections();
    await new Promise((resolve) => outside.close(resolve));
  }
});
