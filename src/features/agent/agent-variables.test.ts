import assert from "node:assert/strict";
import { test } from "node:test";
import { readAgentVariables } from "./agent-variables";

test("agent credentials exclude runner variables stored in the same browser session", () => {
  const original = globalThis.sessionStorage;
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: { getItem: () => JSON.stringify({ E2E_USERNAME: "user", E2E_PASSWORD: "password", E2E_CASE_CUSTOMER_ID: "123" }) },
  });
  try {
    assert.deepEqual(readAgentVariables(), { E2E_USERNAME: "user", E2E_PASSWORD: "password" });
  } finally {
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: original });
  }
});
