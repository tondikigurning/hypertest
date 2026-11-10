import fs from "node:fs";
import path from "node:path";
import type { Reporter, TestCase, TestModule } from "vitest/node";
import type { ScenarioMeta, ScenarioResult, ScenarioStatus } from "../schema/types";
import { componentNameFromFile, packageSlugFromName, writeResults } from "./writer";

interface GroupedResults {
  [componentName: string]: Array<ScenarioResult>;
}

/**
 * Vitest reporter that collects scenario metadata from test results,
 * groups them by component, and writes output according to TEST_* flags.
 *
 * Register in vitest.config.ts:
 *   reporters: ['default', '@hyperscal/test-utils/vitest/reporter']
 */
export default class ScenarioReporter implements Reporter {
  private results: Array<ScenarioResult> = [];
  private missingMeta: Array<string> = [];
  private repoRoot = process.cwd();
  private packageName = "unknown";

  onInit(vitest: { config: { root: string; name?: string } }): void {
    this.repoRoot = findRepoRoot(vitest.config.root);
    this.packageName = vitest.config.name ?? path.basename(vitest.config.root);
  }

  onTestCaseResult(testCase: TestCase): void {
    const meta = (testCase.meta() as unknown as Record<string, unknown>).scenario as
      | (ScenarioMeta & { runner: string })
      | undefined;

    if (!meta) {
      this.missingMeta.push(`${testCase.fullName} (${testCase.module.moduleId})`);
      return;
    }

    const result = testCase.result();
    const status = this.mapStatus(result?.state, meta.method);

    const scenarioResult: ScenarioResult = {
      meta: {
        id: meta.id,
        title: meta.title,
        ...(meta.expect ? { expect: meta.expect } : {}),
        type: meta.type,
        category: meta.category,
        method: meta.method,
        ...(meta.scenario && { scenario: meta.scenario }),
        ...(meta.tags && { tags: meta.tags }),
        ...(meta.refs && { refs: meta.refs }),
        ...(meta.reason && { reason: meta.reason }),
      },
      runner: meta.runner || "vitest",
      status,
      durationMs: testCase.diagnostic()?.duration ?? 0,
      executedAt: new Date(testCase.diagnostic()?.startTime ?? Date.now()).toISOString(),
      file: path.relative(this.repoRoot, testCase.module.moduleId).replace(/\\/g, "/"),
    };

    if (status === "failed" && result?.errors?.[0]) {
      scenarioResult.error = result.errors[0].message;
    }

    this.results.push(scenarioResult);
  }

  onTestRunEnd(_testModules: ReadonlyArray<TestModule>): void {
    const strict = process.env.TEST_STRICT === "1";

    if (strict && this.missingMeta.length > 0) {
      const list = this.missingMeta.map((t) => `  • ${t}`).join("\n");
      // biome-ignore lint/suspicious/noConsole: reporter output
      console.error(
        `\n[test-utils] TEST_STRICT=1: ${this.missingMeta.length} test(s) without scenario() metadata:\n${list}\n`,
      );
      // process.exit() is required — Vitest calls process.exit(0) after reporters,
      // overriding process.exitCode. Exit here before Vitest's own cleanup.
      process.exit(1);
    }

    if (this.results.length === 0) return;

    const passed = this.results.filter((r) => r.status === "passed").length;
    const failed = this.results.filter((r) => r.status === "failed").length;
    const skipped = this.results.filter((r) => r.status === "skipped").length;
    const manual = this.results.filter((r) => r.status === "manual").length;

    // biome-ignore lint/suspicious/noConsole: reporter output
    console.log(
      `\n[test-utils] Scenario results: ${passed} passed, ${failed} failed, ${skipped} skipped, ${manual} manual (${this.results.length} total)`,
    );

    const grouped = this.groupByComponent(this.results);
    const pkg = packageSlugFromName(this.packageName);

    for (const [componentName, componentResults] of Object.entries(grouped)) {
      writeResults(componentResults, {
        packageName: pkg,
        componentName,
        repoRoot: this.repoRoot,
      });
    }
  }

  private groupByComponent(results: Array<ScenarioResult>): GroupedResults {
    const grouped: GroupedResults = {};
    for (const r of results) {
      const name = componentNameFromFile(r.file);
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(r);
    }
    return grouped;
  }

  private mapStatus(state: "passed" | "failed" | "skipped" | "pending" | undefined, method: string): ScenarioStatus {
    if (method === "manual") return "manual";
    if (!state || state === "pending") return "skipped";
    if (state === "passed") return "passed";
    if (state === "failed") return "failed";
    return "skipped";
  }
}

/**
 * Walks up from `start` until it finds `pnpm-workspace.yaml` (repo root).
 * Falls back to `start` if not found.
 */
function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}
