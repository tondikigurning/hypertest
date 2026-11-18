import assert from "node:assert/strict";
import test from "node:test";
import { effortPresetKey, readEffortPresets, writeEffortPreset } from "./agent-effort-preferences";

test("effort presets survive reloads and remain isolated by provider and model", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  writeEffortPreset(storage, "9router", "cx/gpt-6.1-terra", "high");
  writeEffortPreset(storage, "openai-compatible", "cx/gpt-6.1-terra", "low");
  writeEffortPreset(storage, "9router", "cx/gpt-6.1-sol", "xhigh");
  const restored = readEffortPresets(storage);
  assert.equal(restored[effortPresetKey("9router", "cx/gpt-6.1-terra")], "high");
  assert.equal(restored[effortPresetKey("openai-compatible", "cx/gpt-6.1-terra")], "low");
  assert.equal(restored[effortPresetKey("9router", "cx/gpt-6.1-sol")], "xhigh");
});

test("invalid or unavailable preference storage does not prevent selecting effort", () => {
  for (const value of ["not json", "null", "[]", '"high"']) {
    assert.deepEqual(readEffortPresets({ getItem: () => value, setItem: () => {} }), {});
  }
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  const presets = writeEffortPreset(blocked, "9router", "model", "high");
  assert.equal(presets[effortPresetKey("9router", "model")], "high");
});
