import assert from "node:assert/strict";
import { once } from "node:events";
import { request } from "node:http";
import test from "node:test";
import { createApp } from "../../app.mjs";

test("agent API is local-only and rejects invalid messages and origins", async (t) => {
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const send = (method, path, { origin, body, user, host = "localhost:3110" } = {}) =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          host: "127.0.0.1",
          port: server.address().port,
          path,
          method,
          headers: { host, ...(origin && { origin }), ...(user && { "X-Automation-Dummy-User": user }) },
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
  assert.equal((await send("GET", "/automation/api/agent/session")).body.mode, "workspace-write");
  assert.equal((await send("GET", "/automation/api/agent/session", { host: "evil.test:3110" })).status, 403);
  assert.equal(
    (await send("POST", "/automation/api/agent/messages", { origin: "http://evil.test", body: "{}" })).status,
    403,
  );
  assert.equal(
    (
      await send("POST", "/automation/api/agent/messages", {
        origin: "http://localhost:3110",
        body: JSON.stringify({ message: "/unknown test" }),
      })
    ).status,
    400,
  );
  assert.equal(
    (await send("POST", "/automation/api/agent/messages", { origin: "http://localhost:3110", body: "{" })).status,
    400,
  );
  const firstUser = "11111111-1111-4111-8111-111111111111";
  const secondUser = "22222222-2222-4222-8222-222222222222";
  assert.equal((await send("GET", "/automation/api/agent/session", { user: firstUser })).body.messages.length, 0);
  assert.equal((await send("GET", "/automation/api/agent/session", { user: secondUser })).body.messages.length, 0);
  assert.equal((await send("GET", "/automation/api/agent/session", { user: "../bad" })).status, 400);
  const invalidEnvironment = await send("POST", "/automation/api/agent/messages", {
    origin: "http://localhost:3110",
    body: JSON.stringify({ message: "Explore", environment: "unknown" }),
  });
  assert.equal(invalidEnvironment.status, 400);
  assert.match(invalidEnvironment.body.error, /valid environment/);
  const staleClient = await send("POST", "/automation/api/agent/messages", {
    origin: "http://localhost:3110",
    body: JSON.stringify({ message: "Explain", scenarioKey: "feature:1" }),
  });
  assert.equal(staleClient.status, 400);
  assert.match(staleClient.body.error, /Refresh the app/);
});
