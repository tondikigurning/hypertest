import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { sendDraftRunFrame } from "./agent-routes.mjs";
import { createDraftRunEventReceiver } from "./agent-sandbox.mjs";

test("sandbox updates preserve the run identity and only retain live JPEG frames", () => {
  const run = { id: "host-run", done: false };
  const events = createDraftRunEventReceiver(run);
  const frame = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  events.receive({ type: "run", run: { id: "container-run", stage: "executing" } });
  assert.equal(run.id, "host-run");
  events.receive({ type: "frame", data: frame.toString("base64") });
  assert.deepEqual(events.liveFrame(), frame);
  events.receive({ type: "frame-clear" });
  assert.equal(events.liveFrame(), undefined);
  events.receive({ type: "frame", data: Buffer.from("not a JPEG").toString("base64") });
  assert.equal(events.liveFrame(), undefined);
  events.receive({ type: "frame", data: frame.toString("base64") });
  events.receive({ type: "run", run: { executionDone: true } });
  assert.equal(events.liveFrame(), undefined);
  events.receive({ type: "frame", data: frame.toString("base64") });
  assert.equal(events.liveFrame(), undefined);
});

test("draft frames require the active run identity and support conditional polling", async (t) => {
  let active = true;
  let frame;
  const service = { active: () => active, matches: (id) => id === "run-1", liveFrame: () => frame };
  const app = express();
  app.get("/frame", (req, res) => sendDraftRunFrame(service, req, res));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/frame`;
  assert.equal((await fetch(`${url}?run=other`)).status, 404);
  assert.equal((await fetch(`${url}?run=run-1`)).status, 204);
  frame = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const response = await fetch(`${url}?run=run-1`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^image\/jpeg/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), frame);
  const unchanged = await fetch(`${url}?run=run-1`, { headers: { "If-None-Match": response.headers.get("etag") } });
  assert.equal(unchanged.status, 304);
  active = false;
  assert.equal((await fetch(`${url}?run=run-1`)).status, 404);
});
