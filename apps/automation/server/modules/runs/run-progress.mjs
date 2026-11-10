/** Reduce trusted reporter events into a run view. Each outline example keeps its own test ID. */
export function createRunProgress() {
  return { status: "pending", tests: {}, startedAt: null, finishedAt: null };
}

export function applyRunEvent(state, event) {
  const next = { ...state, tests: { ...state.tests } };
  if (event.type === "run-started") {
    next.status = "running";
    next.startedAt = event.at;
    for (const test of event.tests) {
      if (test.testId && !next.tests[test.testId]) next.tests[test.testId] = { ...test, status: "pending" };
    }
  } else if (event.type === "test-started" && next.tests[event.testId]) {
    next.tests[event.testId] = { ...next.tests[event.testId], status: "running", startedAt: event.at };
  } else if (event.type === "step-started" && next.tests[event.testId]) {
    const test = next.tests[event.testId];
    next.tests[event.testId] = {
      ...test,
      steps: [...(test.steps || []), { id: event.stepId, title: event.title, status: "running" }],
    };
  } else if (event.type === "step-finished" && next.tests[event.testId]) {
    const test = next.tests[event.testId];
    next.tests[event.testId] = {
      ...test,
      steps: (test.steps || []).map((step) =>
        step.id === event.stepId ? { ...step, status: event.status, durationMs: event.durationMs } : step,
      ),
    };
  } else if (event.type === "test-finished" && next.tests[event.testId]) {
    const test = next.tests[event.testId];
    next.tests[event.testId] = {
      ...test,
      steps: (test.steps || []).map((step) => (step.status === "running" ? { ...step, status: "interrupted" } : step)),
      status: event.status,
      startedAt: event.startedAt,
      finishedAt: event.at,
      durationMs: event.durationMs,
      attachments: event.attachments ?? [],
      error: event.error,
    };
  } else if (event.type === "run-finished") {
    next.status = event.status;
    next.finishedAt = event.at;
    for (const [id, test] of Object.entries(next.tests)) {
      if (test.status === "pending" || test.status === "running")
        next.tests[id] = {
          ...test,
          status: "interrupted",
          steps: (test.steps || []).map((step) =>
            step.status === "running" ? { ...step, status: "interrupted" } : step,
          ),
        };
    }
  }
  return next;
}

/** Call after a worker exits without a run-finished event; never infer a pass. */
export function interruptRun(state, at = new Date().toISOString()) {
  if (state.finishedAt) return state;
  const next = { ...state, status: "interrupted", finishedAt: at, tests: { ...state.tests } };
  for (const [id, test] of Object.entries(next.tests)) {
    if (test.status === "pending" || test.status === "running")
      next.tests[id] = {
        ...test,
        status: "interrupted",
        steps: (test.steps || []).map((step) =>
          step.status === "running" ? { ...step, status: "interrupted" } : step,
        ),
      };
  }
  return next;
}
