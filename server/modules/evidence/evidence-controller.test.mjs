import assert from "node:assert/strict";
import test from "node:test";
import {
  intermediateR2EvidencePrefix,
  legacyR2EvidencePrefix,
  r2EvidenceLocation,
  r2EvidencePrefix,
} from "../../../packages/internal/test-utils/src/export/r2-client.mjs";
import { createDriveEvidenceHandler } from "./evidence-controller.mjs";

const scenario = {
  key: "case-management/survey-template-manager.feature:39",
  file: "case-management/survey-template-manager.feature",
  id: "TEN_STM_LST_E2E_002",
  availability: "unknown",
};

test("evidence viewer reads both current and legacy R2 prefixes", async (t) => {
  const prefixes = [
    r2EvidencePrefix("stt1", "scenarios", "case-management/survey-template-manager", scenario.id),
    intermediateR2EvidencePrefix("stt1", "scenarios", "case-management/survey-template-manager", scenario.id),
    legacyR2EvidencePrefix("stt1", "scenarios", "case-management/survey-template-manager", scenario.id),
  ];

  for (const prefix of prefixes) {
    const prefixVersion = prefix.startsWith("E2E Evidence/")
      ? "legacy prefix"
      : prefix.endsWith("/latest/")
        ? "intermediate prefix"
        : "current prefix";
    await t.test(prefixVersion, async () => {
      const listedPrefixes = [];
      const storage = {
        bucket: "automation-evidence",
        async list(value) {
          listedPrefixes.push(value);
          return [];
        },
        async signDownload() {
          return "https://example.invalid/evidence";
        },
        close() {},
      };
      const handler = createDriveEvidenceHandler({
        catalog: async () => [scenario],
        results: {
          list: async () => [
            {
              scenarioId: scenario.id,
              uploadStatus: "uploaded",
              evidenceUrl: prefix.startsWith("E2E Evidence/")
                ? `r2://${storage.bucket}/${prefix}`
                : r2EvidenceLocation(storage.bucket, prefix),
              examples: [],
            },
          ],
        },
        r2: () => storage,
      });
      const params = new URLSearchParams({ scenario: scenario.key, environment: "stt1" });
      const request = {
        method: "GET",
        headers: { host: "127.0.0.1:3110" },
        socket: { remoteAddress: "127.0.0.1" },
        url: `/?${params}`,
      };
      const response = {
        statusCode: 200,
        headers: new Map(),
        setHeader(name, value) {
          this.headers.set(name, value);
        },
        end(body = "") {
          this.body = body;
        },
      };

      await handler(request, response);

      assert.equal(response.statusCode, 200);
      assert.deepEqual(listedPrefixes, [prefix]);
      assert.deepEqual(JSON.parse(response.body), []);
    });
  }
});
