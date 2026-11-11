/** Combine all completed Playwright examples for each selected scenario. */
export function mergeRunResults(results, progress) {
  return results
    .map((result) => {
      const tests = Object.values(progress.tests).filter((test) => test.scenarioId === result.meta.id);
      if (!tests.length || tests.some((test) => !["passed", "failed", "timedOut", "skipped"].includes(test.status)))
        return null;
      const status = tests.some((test) => test.status === "failed" || test.status === "timedOut")
        ? "failed"
        : tests.some((test) => test.status === "skipped")
          ? "skipped"
          : "passed";
      const examples = tests.map((test) => ({
        id: test.testId,
        title: test.title,
        status: test.status,
        durationMs: test.durationMs ?? 0,
        startedAt: test.startedAt,
        evidenceNames: [],
      }));
      return {
        ...result,
        status,
        durationMs: examples.reduce((sum, example) => sum + example.durationMs, 0),
        executedAt:
          tests
            .map((test) => test.startedAt)
            .filter(Boolean)
            .sort()[0] || result.executedAt,
        examples,
        evidenceAttachments: tests.flatMap((test) =>
          (test.attachments || []).map((file) => ({
            ...file,
            exampleId: test.testId,
          })),
        ),
      };
    })
    .filter(Boolean);
}
