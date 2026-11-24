export type RunSelection =
  | { kind: "scenario"; scenarioId: string }
  | { kind: "feature"; file: string }
  | { kind: "group"; path: string }
  | { kind: "flow"; file: string; flow: string };
export interface Run {
  id: string;
  scenarioId: string;
  scenarioIds: Array<string>;
  selection: RunSelection;
  target: string;
  stage: string;
  status: string;
  executionDone?: boolean;
  done: boolean;
  cancelRequested?: boolean;
  error?: string;
  evidenceUpload?: { status: "uploading" | "uploaded" | "unavailable" | "failed"; scenarioIds: Array<string> };
  tests: Array<{
    testId: string;
    scenarioId: string;
    title: string;
    status: string;
    durationMs?: number;
    steps: Array<{ id: number; title: string; status: string; durationMs?: number }>;
    attachments: Array<{ index: number; contentType: string }>;
  }>;
}
