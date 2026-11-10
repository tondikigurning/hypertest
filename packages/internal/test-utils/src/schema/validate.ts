import { SCENARIO_METHODS, SCENARIO_TYPES, type ScenarioMeta } from "./types";

const ID_PATTERN = /^[A-Z]{2,4}_[A-Z0-9_]+_(UT|IT|E2E|MAN)_\d{3,4}$/;

/**
 * Validates a ScenarioMeta object at runtime.
 * Throws with a clear, actionable error message on invalid/missing fields.
 */
export function validateMeta(meta: unknown): asserts meta is ScenarioMeta {
  if (meta == null || typeof meta !== "object") {
    throw new Error("[test-utils] scenario() requires a metadata object as the first argument.");
  }

  const m = meta as Record<string, unknown>;
  const errors: Array<string> = [];

  // id
  if (typeof m.id !== "string" || m.id.trim() === "") {
    errors.push("`id` is required and must be a non-empty string (e.g. 'DV_PIP_UT_001').");
  } else if (!ID_PATTERN.test(m.id)) {
    errors.push(
      `\`id\` "${m.id}" does not match the required pattern <PKG>_<COMPONENT>_<TIER>_<NNN> (e.g. 'DV_PIP_UT_001').`,
    );
  }

  // title
  if (typeof m.title !== "string" || m.title.trim() === "") {
    errors.push("`title` is required and must be a non-empty string.");
  }

  // expect (optional generally, required for e2e)
  if (m.expect !== undefined && (typeof m.expect !== "string" || m.expect.trim() === "")) {
    errors.push("`expect` must be a non-empty string when provided.");
  }
  if (m.method === "e2e" && (typeof m.expect !== "string" || m.expect.trim() === "")) {
    errors.push('`expect` is required when method is "e2e".');
  }

  // type
  if (!SCENARIO_TYPES.includes(m.type as (typeof SCENARIO_TYPES)[number])) {
    errors.push(`\`type\` must be one of: ${SCENARIO_TYPES.join(", ")}. Got: "${m.type}".`);
  }

  // category
  if (typeof m.category !== "string" || m.category.trim() === "") {
    errors.push("`category` is required and must be a non-empty string.");
  }

  // method
  if (!SCENARIO_METHODS.includes(m.method as (typeof SCENARIO_METHODS)[number])) {
    errors.push(`\`method\` must be one of: ${SCENARIO_METHODS.join(", ")}. Got: "${m.method}".`);
  }

  // scenario (optional generally, required for e2e)
  if (m.scenario !== undefined && (typeof m.scenario !== "string" || m.scenario.trim() === "")) {
    errors.push("`scenario` must be a non-empty string when provided.");
  }
  if (m.method === "e2e" && (typeof m.scenario !== "string" || m.scenario.trim() === "")) {
    errors.push('`scenario` is required when method is "e2e" (include Given/When/Then steps).');
  }

  // tags (optional)
  if (m.tags !== undefined) {
    if (!Array.isArray(m.tags) || !m.tags.every((t) => typeof t === "string")) {
      errors.push("`tags` must be an array of strings when provided.");
    }
  }

  // refs (optional)
  if (m.refs !== undefined) {
    if (!Array.isArray(m.refs) || !m.refs.every((r) => typeof r === "string")) {
      errors.push("`refs` must be an array of strings when provided.");
    }
  }

  // reason (required for manual)
  if (m.method === "manual" && (typeof m.reason !== "string" || m.reason.trim() === "")) {
    errors.push('`reason` is required when method is "manual" (explain why automation is not viable).');
  }

  if (errors.length > 0) {
    throw new Error(`[test-utils] Invalid scenario metadata:\n${errors.map((e) => `  • ${e}`).join("\n")}`);
  }
}
