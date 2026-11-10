import fs from "node:fs";
import path from "node:path";

const SCENARIO_ID = /^@?[A-Z]{2,4}_[A-Z0-9_]+_E2E_\d{3,4}$/;

/** Append-only events for the Automation worker; each Playwright example keeps its own test ID. */
export default class AutomationReporter {
  constructor() {
    const output = process.env.AUTOMATION_EVENTS_FILE;
    if (!output || !path.isAbsolute(output)) throw new Error("AUTOMATION_EVENTS_FILE must be an absolute path");
    this.output = output;
    this.stepIds = new WeakMap();
    this.nextStepId = 0;
    fs.mkdirSync(path.dirname(output), { recursive: true });
  }

  emit(event) {
    fs.appendFileSync(this.output, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`, { mode: 0o600 });
  }

  scenario(test) {
    const id = test.tags?.find((tag) => SCENARIO_ID.test(tag));
    return id ? { scenarioId: id.replace(/^@/, ""), testId: test.id, title: test.title } : null;
  }

  onBegin(_config, suite) {
    const tests = suite
      .allTests()
      .map((test) => this.scenario(test))
      .filter(Boolean);
    this.emit({ type: "run-started", tests });
  }

  onTestBegin(test) {
    const scenario = this.scenario(test);
    if (scenario) this.emit({ type: "test-started", ...scenario });
  }

  onStepBegin(test, _result, step) {
    const scenario = this.scenario(test);
    if (!scenario || step.category !== "test.step" || step.parent?.category === "test.step") return;
    const stepId = ++this.nextStepId;
    this.stepIds.set(step, stepId);
    this.emit({ type: "step-started", testId: scenario.testId, stepId, title: step.title });
  }

  onStepEnd(test, _result, step) {
    const scenario = this.scenario(test);
    const stepId = this.stepIds.get(step);
    if (!scenario || !stepId) return;
    this.emit({
      type: "step-finished",
      testId: scenario.testId,
      stepId,
      status: step.error ? "failed" : "passed",
      durationMs: step.duration,
    });
  }

  onTestEnd(test, result) {
    const scenario = this.scenario(test);
    if (!scenario) return;
    this.emit({
      type: "test-finished",
      ...scenario,
      status: result.status,
      durationMs: result.duration,
      startedAt: result.startTime.toISOString(),
      attachments: result.attachments
        .filter((item) => item.path && /^(image|video)\//.test(item.contentType))
        .map((item) => ({ path: item.path, contentType: item.contentType })),
      error: result.errors?.[0]?.message?.slice(0, 1000),
    });
  }

  onEnd(result) {
    this.emit({ type: "run-finished", status: result.status });
  }
}
