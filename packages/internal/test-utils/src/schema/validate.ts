import { SCENARIO_TYPES, type ScenarioMeta } from "./types";

const ID_PATTERN = /^[A-Z]{2,4}_[A-Z0-9_]+_E2E_\d{3,4}$/;

/** Validates metadata parsed from a Playwright BDD scenario. */
export function validateMeta(meta: unknown): asserts meta is ScenarioMeta {
  if (meta == null || typeof meta !== "object") {
    throw new Error("[test-utils] Scenario metadata must be an object.");
  }

  const value = meta as Record<string, unknown>;
  const errors: Array<string> = [];

  if (typeof value.id !== "string" || !ID_PATTERN.test(value.id)) {
    errors.push("`id` must match the E2E pattern <APP>_<COMPONENT>_E2E_<NNN>.");
  }
  if (typeof value.title !== "string" || value.title.trim() === "") {
    errors.push("`title` is required and must be a non-empty string.");
  }
  if (typeof value.expect !== "string" || value.expect.trim() === "") {
    errors.push("`expect` is required and must be a non-empty string.");
  }
  if (!SCENARIO_TYPES.includes(value.type as (typeof SCENARIO_TYPES)[number])) {
    errors.push(`\`type\` must be one of: ${SCENARIO_TYPES.join(", ")}. Got: "${value.type}".`);
  }
  if (typeof value.category !== "string" || value.category.trim() === "") {
    errors.push("`category` is required and must be a non-empty string.");
  }
  if (value.method !== "e2e") {
    errors.push('`method` must be "e2e".');
  }
  if (typeof value.scenario !== "string" || value.scenario.trim() === "") {
    errors.push("`scenario` is required and must contain Given/When/Then steps.");
  }
  if (value.tags !== undefined && (!Array.isArray(value.tags) || !value.tags.every((tag) => typeof tag === "string"))) {
    errors.push("`tags` must be an array of strings when provided.");
  }
  if (value.refs !== undefined && (!Array.isArray(value.refs) || !value.refs.every((ref) => typeof ref === "string"))) {
    errors.push("`refs` must be an array of strings when provided.");
  }

  if (errors.length > 0) {
    throw new Error(`[test-utils] Invalid BDD scenario metadata:\n${errors.map((error) => `  • ${error}`).join("\n")}`);
  }
}
