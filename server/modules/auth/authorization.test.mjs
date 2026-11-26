import assert from "node:assert/strict";
import test from "node:test";
import { mayUseApi } from "./authorization.mjs";

test("authorization separates shared reads and runs from authoring", () => {
  const viewer = { role: "viewer", mustChangePassword: false };
  const engineer = { role: "engineer", mustChangePassword: false };
  for (const path of [
    "/api/scenarios",
    "/api/evidence/example",
    "/api/evidence",
    "/api/local/config",
    "/api/local/run",
    "/api/local/live",
    "/api/local/evidence",
    "/api/agent/prds",
    "/api/agent/prd-versions",
    "/api/agent/pull-requests",
  ])
    assert.equal(mayUseApi(viewer, "GET", path), true, path);
  for (const path of ["/api/local/run", "/api/local/cancel"]) assert.equal(mayUseApi(viewer, "POST", path), true, path);
  for (const path of ["/api/local/config", "/api/local/live", "/api/local/evidence"])
    assert.equal(mayUseApi(viewer, "POST", path), false, path);
  for (const path of [
    "/api/agent/drafts",
    "/api/agent/session",
    "/api/agent/credentials",
    "/api/agent/diff",
    "/api/agent/prd-versions",
    "/api/agent/finalize",
  ]) {
    assert.equal(mayUseApi(viewer, "POST", path), false, path);
    assert.equal(mayUseApi(engineer, "POST", path), true, path);
  }
  assert.equal(mayUseApi({ ...viewer, mustChangePassword: true }, "GET", "/api/scenarios"), false);
  assert.equal(mayUseApi(viewer, "DELETE", "/api/scenarios"), false);
  assert.equal(mayUseApi(viewer, "POST", "/api/agent/pull-requests/refresh"), false);
  assert.equal(mayUseApi(null, "GET", "/api/scenarios"), false);
  assert.equal(mayUseApi(viewer, "GET", "/api/agent/drafts"), false);
  assert.equal(mayUseApi(viewer, "GET", "/api/local/future-private-resource"), false);
  for (const path of [
    "/api/agent/draft-targets",
    "/api/agent/workspace",
    "/api/agent/session",
    "/api/agent/settings",
    "/api/agent/models",
    "/api/agent/usage",
    "/api/agent/draft-run",
    "/api/agent/draft-run-evidence",
    "/api/agent/diff",
    "/api/agent/context-files",
    "/api/agent/messages",
    "/api/agent/approval",
    "/api/agent/sync",
    "/api/agent/finalize",
    "/api/agent/credentials",
    "/api/agent/encryption",
    "/api/agent/prd-versions/forged",
    "/api/agent/prd-versions/forged/activate",
  ]) {
    for (const method of ["GET", "POST", "PUT", "DELETE"]) {
      assert.equal(mayUseApi(viewer, method, path), false, `${method} ${path}`);
      assert.equal(mayUseApi(engineer, method, path), true, `${method} ${path}`);
    }
  }
});

import { once } from "node:events";
import express from "express";
import { createAuthorization } from "./authorization.mjs";

test("authorization ignores browser identity headers and enforces origin", async () => {
  const app = express();
  app.use(
    createAuthorization({
      resolvePrincipal: async (req) =>
        req.headers.cookie === "test=viewer" ? { id: "viewer", role: "viewer" } : undefined,
    }),
  );
  app.use((req, res) => res.json({ principal: req.workspacePrincipal.id }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const previous = process.env.WEB_PORT;
  process.env.WEB_PORT = String(server.address().port);
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const spoof = await fetch(`${origin}/api/agent/drafts`, { headers: { "X-Automation-Dummy-User": "engineer" } });
    assert.equal(spoof.status, 401);
    const forbidden = await fetch(`${origin}/api/agent/drafts`, {
      headers: { cookie: "test=viewer", "X-Automation-Dummy-User": "engineer" },
    });
    assert.equal(forbidden.status, 403);
    const allowed = await fetch(`${origin}/api/scenarios`, { headers: { cookie: "test=viewer" } });
    assert.equal((await allowed.json()).principal, "viewer");
    const crossOrigin = await fetch(`${origin}/api/local/run`, {
      method: "POST",
      headers: { cookie: "test=viewer", origin: "http://evil.test" },
    });
    assert.equal(crossOrigin.status, 403);
  } finally {
    server.close();
    if (previous === undefined) delete process.env.WEB_PORT;
    else process.env.WEB_PORT = previous;
  }
});
