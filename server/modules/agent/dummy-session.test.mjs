import assert from "node:assert/strict";
import { once } from "node:events";
import { request } from "node:http";
import test from "node:test";
import express from "express";
import { createAgentRouter } from "./agent-routes.mjs";

test("dummy identities use separate agent sessions", async (t) => {
  const sessions = new Map();
  const resolveSession = (id) => {
    if (!sessions.has(id)) {
      const state = { messages: [] };
      sessions.set(id, {
        snapshot: () => state,
        send: async (message) => state.messages.push(message),
      });
    }
    return sessions.get(id);
  };
  const app = express();
  app.use("/agent", createAgentRouter({ resolveSession }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const send = (user, method, path, body) =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          host: "127.0.0.1",
          port: server.address().port,
          path: `/agent${path}`,
          method,
          headers: { host: "localhost:3110", origin: "http://localhost:3110", "X-Automation-Dummy-User": user },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => resolve(JSON.parse(data)));
        },
      );
      req.on("error", reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
  await send("alice", "POST", "/messages", { message: "Private draft" });
  assert.deepEqual((await send("alice", "GET", "/session")).messages, ["Private draft"]);
  assert.deepEqual((await send("bob", "GET", "/session")).messages, []);
});
