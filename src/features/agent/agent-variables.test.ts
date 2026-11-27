import assert from "node:assert/strict";
import { test } from "node:test";
import { clearVariableSecrets, readVariables, setVariablesPrincipal, writeVariables } from "../runs/run-variables";
import { readAgentVariables } from "./agent-variables";

test("passwords survive refreshes while case customer IDs stay in memory", () => {
  const originals = { localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
  const local = new Map<string, string>([
    ["automation-run-variables:v1:alice", JSON.stringify({ E2E_USERNAME: "old-user", E2E_CASE_CUSTOMER_ID: "old-id" })],
  ]);
  const session = new Map<string, string>([["automation-run-variables", "old secret"]]);
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value) } });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value), removeItem: (key: string) => session.delete(key) } });
  try {
    setVariablesPrincipal("alice");
    writeVariables(
      { E2E_USERNAME: "user", E2E_PASSWORD: "password", E2E_CASE_CUSTOMER_ID: "123" },
      [
        { name: "E2E_USERNAME", secret: false },
        { name: "E2E_PASSWORD", secret: true },
        { name: "E2E_CASE_CUSTOMER_ID", secret: false },
      ],
    );
    assert.deepEqual(readAgentVariables(), { E2E_USERNAME: "user", E2E_PASSWORD: "password" });
    assert.equal(readVariables().E2E_CASE_CUSTOMER_ID, "123");
    const persisted = JSON.parse(local.get("automation-run-variables:v1:alice") || "{}");
    assert.equal(persisted.E2E_USERNAME, "user");
    assert.equal(persisted.E2E_PASSWORD, undefined);
    assert.equal(session.get("automation-run-variables:secrets:v1:alice"), JSON.stringify({ E2E_PASSWORD: "password" }));
    assert.equal(persisted.E2E_CASE_CUSTOMER_ID, undefined);
    assert.equal(session.has("automation-run-variables"), false);
    setVariablesPrincipal("bob");
    assert.deepEqual(readVariables(), {});
    setVariablesPrincipal("alice");
    assert.equal(readVariables().E2E_PASSWORD, "password");
    assert.equal(readVariables().E2E_USERNAME, "user");
    assert.equal(readVariables().E2E_CASE_CUSTOMER_ID, undefined);
    clearVariableSecrets();
    assert.equal(readVariables().E2E_PASSWORD, undefined);
    assert.equal(session.has("automation-run-variables:secrets:v1:alice"), false);
    assert.equal(readVariables().E2E_CASE_CUSTOMER_ID, undefined);
    assert.equal(readVariables().E2E_USERNAME, "user");
  } finally {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originals.localStorage });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originals.sessionStorage });
  }
});
