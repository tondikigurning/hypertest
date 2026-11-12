import assert from "node:assert/strict";
import test from "node:test";
import { legacyR2EvidencePrefix, parseR2EvidenceLocation, r2EvidenceLocation, r2EvidencePrefix } from "./r2-client.mjs";

const featurePath = "case-management/survey-template-manager";
const scenarioId = "TEN_STM_LST_E2E_002";

test("new R2 evidence prefixes omit the generic roots", () => {
  const prefix = r2EvidencePrefix("stt1", "scenarios", featurePath, scenarioId);

  assert.equal(prefix, `stt1/${featurePath}/${scenarioId}/`);
  assert.equal(prefix.includes("E2E Evidence"), false);
  assert.equal(prefix.includes("/scenarios/"), false);
  assert.equal(prefix.endsWith("/latest/"), false);
});

test("R2 evidence locations preserve storage prefixes through URL parsing", () => {
  const prefix = r2EvidencePrefix("stt1", "scenarios", featurePath, scenarioId);
  const location = r2EvidenceLocation("automation-evidence", prefix);

  assert.equal(location, `r2://automation-evidence/${prefix}`);
  assert.equal(parseR2EvidenceLocation(location)?.prefix, prefix);
});

test("legacy R2 evidence locations saved with generic roots remain readable", () => {
  const prefix = legacyR2EvidencePrefix("stt1", "scenarios", featurePath, scenarioId);
  const legacyLocation = `r2://automation-evidence/${prefix}`;

  assert.equal(parseR2EvidenceLocation(legacyLocation)?.prefix, prefix);
});
