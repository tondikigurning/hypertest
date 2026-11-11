import assert from "node:assert/strict";
import { once } from "node:events";
import { request } from "node:http";
import test from "node:test";
import { createApp } from "./app.mjs";
import { createDriveEvidenceHandler } from "./modules/evidence/evidence-controller.mjs";

test("serves the local API and rejects an invalid run origin", async (t) => {
  const server = createApp({
    catalogHandler: (_req, res) => res.json([]),
    evidenceHandler: createDriveEvidenceHandler({ catalog: async () => [] }),
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const send = (path, { method = "GET", host = "localhost:3110", origin, body } = {}) =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          host: "127.0.0.1",
          port: server.address().port,
          path,
          method,
          headers: { host, ...(origin && { origin }) },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        },
      );
      req.on("error", reject);
      req.end(body);
    });

  const catalog = await send("/automation/api/scenarios");
  assert.equal(catalog.status, 200);
  assert.ok(Array.isArray(catalog.body));

  const config = await send("/automation/api/local/config");
  assert.equal(config.status, 200);
  assert.equal(typeof config.body.target, "string");
  assert.equal(config.body.defaultEnvironment, "stt1");
  assert.equal(new URL(config.body.target).origin, "https://converge.stt1.hyperscal.com");
  assert.ok(config.body.environments.some((environment) => environment.id === "stt1"));
  assert.equal((await send("/automation/api/local/config", { host: "example.com:3110" })).status, 403);
  assert.equal((await send("/automation/api/local/run")).body, null);
  assert.equal((await send("/automation/api/local/live?run=missing")).status, 404);
  assert.equal((await send("/automation/api/local/evidence?run=missing")).status, 404);
  assert.equal(
    (await send("/automation/api/local/cancel?run=missing", { method: "POST", origin: "http://localhost:3110" }))
      .status,
    409,
  );
  assert.equal(
    (await send("/automation/api/local/cancel?run=missing", { method: "POST", origin: "http://example.com" })).status,
    403,
  );

  const evidence = await send("/automation/api/evidence?scenario=missing");
  assert.equal(evidence.status, 404);
  assert.equal(evidence.body.error, "Evidence folder is unavailable.");
  assert.equal((await send("/automation/api/evidence", { host: "example.com:3110" })).status, 403);

  const denied = await send("/automation/api/local/run", {
    method: "POST",
    origin: "http://example.com",
    body: "{}",
  });
  assert.equal(denied.status, 403);
  const malformed = await send("/automation/api/local/run", {
    method: "POST",
    origin: "http://localhost:3110",
    body: "{",
  });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error, "Invalid request.");
  const invalidSelection = await send("/automation/api/local/run", {
    method: "POST",
    origin: "http://localhost:3110",
    body: JSON.stringify({
      selection: { kind: "scenario", scenarioId: "invalid" },
      environment: config.body.defaultEnvironment,
      variables: { E2E_USERNAME: "test-user", E2E_PASSWORD: "test-password" },
    }),
  });
  assert.equal(invalidSelection.status, 400);
  assert.equal(invalidSelection.body.error, "Invalid run selection.");
  assert.equal((await send("/automation/api/missing")).status, 404);
});
