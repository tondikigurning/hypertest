import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedWebHost, isLocalRequest } from "./local-request.mjs";

test("allows only the configured local web host and port", () => {
  const previousPort = process.env.AUTOMATION_WEB_PORT;
  const previousHosts = process.env.AUTOMATION_WEB_ALLOWED_HOSTS;
  try {
    process.env.AUTOMATION_WEB_PORT = "3120";
    delete process.env.AUTOMATION_WEB_ALLOWED_HOSTS;

    assert.equal(isAllowedWebHost("localhost:3120"), true);
    assert.equal(isAllowedWebHost("127.0.0.1:3120"), true);
    assert.equal(isAllowedWebHost("localhost:3110"), false);
    assert.equal(isAllowedWebHost("127.0.0.1.evil:3120"), false);
    assert.equal(isLocalRequest({ headers: { host: "localhost:3120" }, socket: { remoteAddress: "127.0.0.1" } }), true);
    assert.equal(
      isLocalRequest({ headers: { host: "localhost:3120" }, socket: { remoteAddress: "192.0.2.10" } }),
      false,
    );
  } finally {
    if (previousPort === undefined) delete process.env.AUTOMATION_WEB_PORT;
    else process.env.AUTOMATION_WEB_PORT = previousPort;
    if (previousHosts === undefined) delete process.env.AUTOMATION_WEB_ALLOWED_HOSTS;
    else process.env.AUTOMATION_WEB_ALLOWED_HOSTS = previousHosts;
  }
});
