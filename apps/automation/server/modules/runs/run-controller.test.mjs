import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { startRun } from "./run-controller.mjs";

function post(body, origin = "http://localhost:3110") {
  const req = new EventEmitter();
  req.method = "POST";
  req.url = "/run";
  req.headers = { host: "localhost:3110", origin };
  req.socket = { remoteAddress: "127.0.0.1" };
  const response = new Promise((resolve) => {
    const res = {
      statusCode: 200,
      setHeader() {},
      end(data) {
        resolve({ status: this.statusCode, body: JSON.parse(data) });
      },
    };
    startRun(req, res);
  });
  req.emit("data", body);
  req.emit("end");
  return response;
}

test("rejects malformed and null run requests without starting a run", async () => {
  assert.equal((await post("{")).status, 400);
  assert.equal((await post("null")).status, 400);
  assert.equal((await post("{}")).body.error, "Set all environment variables before running a scenario.");
});

test("rejects requests from a different origin", async () => {
  assert.equal((await post("{}", "http://example.com")).status, 403);
});

test("rejects an unknown environment before resolving the selection", async () => {
  const response = await post(
    JSON.stringify({
      environment: "https://example.com/",
      variables: { E2E_USERNAME: "user", E2E_PASSWORD: "password" },
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Select a valid environment.");
});
