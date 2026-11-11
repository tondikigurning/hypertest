import { join } from "node:path";

const sandboxWorkspace = "/draft";

function draftFingerprint(workspace, runnerFingerprint) {
  const e2e = join(workspace, "e2e");
  return runnerFingerprint({
    directories: [
      join(e2e, "tests/bdd"),
      join(e2e, ".features-gen"),
      join(workspace, "packages/internal/test-utils/src"),
    ],
    files: [
      join(e2e, "playwright.bdd.config.ts"),
      join(e2e, "package.json"),
      join(e2e, "tsconfig.json"),
      join(workspace, "pnpm-lock.yaml"),
    ],
  });
}

/** Run one validated draft scenario inside the Docker sandbox. */
export async function startDraftRunInProcess({ workspace, scenarioId, target, variables }) {
  if (workspace !== sandboxWorkspace || typeof scenarioId !== "string" || typeof target !== "string")
    throw new Error("The selected draft scenario is unavailable.");
  const [
    { automationCatalog, scenarioCatalog },
    { createLocalRunService },
    { resolveSelection },
    { runnerFingerprint },
  ] = await Promise.all([
    import("file:///workspace/server/modules/catalog/scenario-catalog.mjs"),
    import("file:///workspace/server/modules/runs/local-run-service.mjs"),
    import("file:///workspace/server/modules/runs/run-selection.mjs"),
    import("file:///workspace/server/modules/runs/runner-fingerprint.mjs"),
  ]);
  const featuresRoot = join(workspace, "e2e/tests/bdd/features");
  const features = scenarioCatalog(featuresRoot);
  const catalog = automationCatalog(featuresRoot);
  const selection = resolveSelection({ kind: "scenario", scenarioId }, features, catalog);
  const service = createLocalRunService({
    workspaceRoot: workspace,
    configFile: join(workspace, "e2e/playwright.bdd.config.ts"),
    fingerprint: () => draftFingerprint(workspace, runnerFingerprint),
    skipEvidenceUpload: true,
    maxRuntimeMs: 10 * 60 * 1000,
    safeProcessEnvironment: true,
  });
  service.start(selection, variables, target);
  return service;
}
