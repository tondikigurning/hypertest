import { it, type TestContext } from "vitest";
import type { AuthoredScenarioMeta, ScenarioMeta } from "../schema/types";
import { validateMeta } from "../schema/validate";

type ScenarioBody = (ctx: TestContext) => Promise<void> | void;

/**
 * Checks whether the scenario's tags match the TEST_TAGS filter.
 * TEST_TAGS is a comma-separated list; the scenario must have ALL listed tags to pass.
 * If TEST_TAGS is not set, all scenarios pass.
 */
function matchesTags(scenarioTags: Array<string> | undefined, envTags: string | undefined): boolean {
  if (!envTags) return true;
  const required = envTags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (required.length === 0) return true;
  if (!scenarioTags || scenarioTags.length === 0) return false;
  const normalized = scenarioTags.map((t) => t.toLowerCase());
  return required.every((tag) => normalized.includes(tag));
}

/**
 * Wraps a Vitest test with scenario metadata.
 * Metadata is set FIRST (before body execution) so it is always captured by the reporter,
 * even if the test is skipped or fails.
 */
export function scenario(meta: AuthoredScenarioMeta, body: ScenarioBody): void {
  const normalizedMeta = normalizeScenarioMeta(meta);
  validateMeta(normalizedMeta);

  it(normalizedMeta.title, async (ctx) => {
    // Set metadata immediately so the reporter always captures it
    (ctx.task.meta as unknown as Record<string, unknown>).scenario = { ...normalizedMeta, runner: "vitest" };

    // Dynamic skip based on TEST_TAGS filter
    if (!matchesTags(normalizedMeta.tags, process.env.TEST_TAGS)) {
      ctx.skip();
      return;
    }

    await body(ctx);
  });
}

/**
 * Registers a manual scenario — no test body executes, but it appears in reports.
 * The reporter renders it with status "manual".
 */
scenario.manual = (meta: AuthoredScenarioMeta): void => {
  const normalizedMeta = normalizeScenarioMeta(meta);
  validateMeta(normalizedMeta);

  if (normalizedMeta.method !== "manual") {
    throw new Error(`[test-utils] scenario.manual() requires method: "manual", got: "${normalizedMeta.method}".`);
  }

  it(normalizedMeta.title, (ctx) => {
    (ctx.task.meta as unknown as Record<string, unknown>).scenario = { ...normalizedMeta, runner: "vitest" };
    // No-op body — manual scenarios don't execute logic
  });
};

function normalizeScenarioMeta(meta: AuthoredScenarioMeta): ScenarioMeta {
  const normalizedExpect = meta.expect?.trim();

  return {
    ...meta,
    ...(meta.method === "e2e"
      ? { expect: normalizedExpect || meta.title }
      : normalizedExpect
        ? { expect: normalizedExpect }
        : {}),
  };
}
