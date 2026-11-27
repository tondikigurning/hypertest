import assert from "node:assert/strict";
import { test } from "node:test";
import { clearVariables, readVariables, setVariablesPrincipal, writeVariables } from "../runs/run-variables";
import { readAgentVariables } from "./agent-variables";

test("all variables survive refreshes in the tab and clear together after use", () => {
  const originals = { localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
  const local = new Map<string, string>([
    ["automation-run-variables:v1:alice", JSON.stringify({ E2E_USERNAME: "old-user", E2E_CASE_CUSTOMER_ID: "old-id" })],
  ]);
  const session = new Map<string, string>([["automation-run-variables", "old secret"]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => local.set(key, value),
      removeItem: (key: string) => local.delete(key),
    },
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => session.set(key, value),
      removeItem: (key: string) => session.delete(key),
    },
  });
  try {
    setVariablesPrincipal("alice");
    assert.deepEqual(readVariables(), { E2E_USERNAME: "old-user", E2E_CASE_CUSTOMER_ID: "old-id" });
    assert.equal(local.has("automation-run-variables:v1:alice"), false);

    writeVariables({ E2E_USERNAME: "user", E2E_PASSWORD: "password", E2E_CASE_CUSTOMER_ID: "123" });
    assert.deepEqual(readAgentVariables(), { E2E_USERNAME: "user", E2E_PASSWORD: "password" });
    const persisted = JSON.parse(session.get("automation-run-variables:v2:alice") || "{}");
    assert.deepEqual(persisted, {
      E2E_USERNAME: "user",
      E2E_PASSWORD: "password",
      E2E_CASE_CUSTOMER_ID: "123",
    });
    assert.equal(session.has("automation-run-variables"), false);

    setVariablesPrincipal("bob");
    assert.deepEqual(readVariables(), {});
    setVariablesPrincipal("alice");
    assert.deepEqual(readVariables(), persisted);

    clearVariables();
    assert.deepEqual(readVariables(), {});
    assert.equal(session.has("automation-run-variables:v2:alice"), false);
  } finally {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originals.localStorage });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originals.sessionStorage });
  }
});
