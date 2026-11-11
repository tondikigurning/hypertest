import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogController } from "./catalog-controller.mjs";

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return body;
    },
  };
}

const scenario = {
  key: "auth/login.feature:3",
  id: "TEN_AUT_AUTH_E2E_001",
  module: "auth",
  status: "",
  lastRun: "",
  duration: "",
  evidenceUrl: "",
};

test("serves the database catalog with run state cleared when no environment is selected", async () => {
  let resultReads = 0;
  const handler = createCatalogController({
    catalog: { list: async () => [scenario] },
    results: {
      list: async () => {
        resultReads += 1;
        return [];
      },
    },
    availableEnvironments: [{ id: "dev" }],
  });
  const res = response();
  await handler({ query: {} }, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, [{ ...scenario, status: "", lastRun: "", duration: "", evidenceUrl: "" }]);
  assert.equal(resultReads, 0);
});

test("overlays only the selected environment results on the database catalog", async () => {
  const handler = createCatalogController({
    catalog: { list: async () => [scenario] },
    results: {
      list: async (environment) => {
        assert.equal(environment, "dev");
        return [
          {
            scenarioId: scenario.id,
            status: "passed",
            executedAt: new Date("2026-11-10T00:00:00Z"),
            durationMs: 25,
            evidenceUrl: "https://drive.google.com/drive/folders/run-1",
            examples: [],
          },
        ];
      },
    },
    availableEnvironments: [{ id: "dev" }],
  });
  const res = response();
  await handler({ query: { environment: "dev" } }, res, (error) => {
    throw error;
  });

  assert.equal(res.body[0].status, "passed");
  assert.equal(res.body[0].duration, "25ms");
  assert.equal(res.body[0].evidenceUrl, "https://drive.google.com/drive/folders/run-1");
  assert.equal(res.body[0].lastRun, "2026-11-10T00:00:00.000Z");
});

test("does not assign a run result to duplicate scenario IDs", async () => {
  const duplicateScenarios = [scenario, { ...scenario, key: "auth/other.feature:8" }];
  const handler = createCatalogController({
    catalog: { list: async () => duplicateScenarios },
    results: {
      list: async () => [
        {
          scenarioId: scenario.id,
          status: "passed",
          executedAt: new Date("2026-11-10T00:00:00Z"),
          durationMs: 25,
          evidenceUrl: "https://drive.google.com/drive/folders/run-1",
          examples: [],
        },
      ],
    },
    availableEnvironments: [{ id: "dev" }],
  });
  const res = response();
  await handler({ query: { environment: "dev" } }, res, (error) => {
    throw error;
  });

  assert.equal(res.body.length, 2);
  for (const item of res.body) {
    assert.equal(item.status, "");
    assert.equal(item.lastRun, "");
    assert.equal(item.duration, "");
    assert.equal(item.evidenceUrl, "");
  }
});

test("rejects invalid environment selection before reading the catalog", async () => {
  let catalogReads = 0;
  const handler = createCatalogController({
    catalog: {
      list: async () => {
        catalogReads += 1;
        return [];
      },
    },
    availableEnvironments: [{ id: "dev" }],
  });
  const res = response();
  await handler({ query: { environment: ["dev", "stt"] } }, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: "Select a valid environment." });
  assert.equal(catalogReads, 0);
});
