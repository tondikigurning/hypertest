import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFeature } from "../catalog/scenario-catalog.mjs";
import { prdIdentity } from "./prd-identity.mjs";

const featurePrefix = "e2e/tests/bdd/features/";

/** Shared component contracts have no owning product menu in their source path. */
function matchesMenuPrd(feature, prd) {
  const identity = prdIdentity(prd);
  if (!identity) return false;
  const parts = feature.slice(featurePrefix.length).split("/");
  if (parts.length < 2) return false;
  if (parts[0] === "_components") return true;
  const menu = parts[1].replace(/\.feature$/i, "");
  return parts[0] === identity.module && menu === identity.menu;
}

export function featureReviewPath(path) {
  const normalized = path.replaceAll("\\", "/");
  const lower = normalized.toLowerCase();
  return lower.startsWith(featurePrefix) && lower.endsWith(".feature") ? normalized : undefined;
}

export function contentDigest(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function flowReviewKey(feature) {
  return process.platform === "win32" ? feature.toLowerCase() : feature;
}

export async function readOptionalFile(workspace, path) {
  try {
    return await readFile(join(workspace, ...path.split("/")), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

export function changedScenarioFlows(path, before, after) {
  const relative = path.slice(featurePrefix.length);
  const semantic = ({ title, feature, tags, background, steps, outline }) =>
    JSON.stringify({ title, feature, tags, background, steps, outline });
  const oldScenarios = parseFeature(before, relative);
  const newScenarios = parseFeature(after, relative);
  const remaining = new Map();
  for (const scenario of oldScenarios) {
    const key = semantic(scenario);
    remaining.set(key, (remaining.get(key) || 0) + 1);
  }
  const changed = [];
  for (const scenario of newScenarios) {
    const key = semantic(scenario);
    const count = remaining.get(key) || 0;
    if (count) remaining.set(key, count - 1);
    else changed.push(scenario);
  }
  for (const scenario of oldScenarios) {
    const key = semantic(scenario);
    const count = remaining.get(key) || 0;
    if (count) {
      changed.push(scenario);
      remaining.set(key, count - 1);
    }
  }
  const flows = new Set();
  for (const scenario of changed) {
    const tags = scenario.tags.filter((tag) => tag.startsWith("@flow:")).map((tag) => tag.slice(6));
    if (!tags.length) flows.add("(no flow tag)");
    else for (const tag of tags) flows.add(tag);
  }
  return [...flows].sort();
}

export async function confirmFlowReview({
  workspace,
  featurePath,
  prdPath,
  flows,
  safePath,
  redact,
  requestApproval,
  signal,
  readPrd,
}) {
  const feature = featureReviewPath(featurePath);
  const prd = prdPath.replaceAll("\\", "/");
  if (!feature || !/^docs\/prd\/.+\.md$/i.test(prd))
    throw new Error("Choose a feature file and its matching PRD in docs/prd.");
  if (!matchesMenuPrd(feature, prd))
    throw new Error("Choose the owning menu PRD at docs/prd/<module>/<menu>.md for this feature.");
  await safePath(workspace, feature);
  if (typeof readPrd !== "function") throw new Error("PRD database store is unavailable.");
  const ids = flows.map((flow) => flow.id.trim());
  if (
    !ids.length ||
    flows.some((flow) => !flow.description.trim()) ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !/^(?:[A-Za-z0-9_-]+|\(no flow tag\))$/.test(id))
  )
    throw new Error("Provide distinct flow IDs and descriptions.");
  const featureContent = await readOptionalFile(workspace, feature);
  const prdContent = (await readPrd(prd)) || "";
  if (!prdContent.trim()) throw new Error("A matching PRD is required before confirming flows.");
  const list = flows.map((flow) => `${flow.id.trim()}: ${flow.description.trim()}`).join("\n");
  if (redact(list) !== list)
    throw new Error("The flow list contains text that cannot be safely displayed. Remove sensitive content first.");
  const accepted = await requestApproval({
    kind: "flow-review",
    reason: `Confirm the described flows for ${feature} using PRD ${prd}. This does not approve scenarios or live-data actions.`,
    command: list,
    signal,
  });
  if (!accepted || signal?.aborted) return undefined;
  await safePath(workspace, feature);
  if ((await readOptionalFile(workspace, feature)) !== featureContent || ((await readPrd(prd)) || "") !== prdContent)
    throw new Error("The feature or PRD changed while awaiting confirmation. Review the flow list again.");
  return {
    feature,
    featureDigest: contentDigest(featureContent),
    prd,
    prdDigest: contentDigest(prdContent),
    ids,
    flows: flows.map((flow) => ({ id: flow.id.trim(), description: flow.description.trim() })),
  };
}

export async function authorizeFlowWrite({ workspace, path, content, confirmations, readPrd }) {
  const feature = featureReviewPath(path);
  if (!feature) return;
  const before = await readOptionalFile(workspace, feature);
  const key = flowReviewKey(feature);
  if (confirmations[key] && confirmations[key].featureDigest !== contentDigest(before)) delete confirmations[key];
  const changedFlows = changedScenarioFlows(feature, before, content);
  if (!changedFlows.length) return;
  const approval = confirmations[key];
  if (typeof readPrd !== "function") throw new Error("PRD database store is unavailable.");
  if (
    !approval ||
    approval.featureDigest !== contentDigest(before) ||
    !Array.isArray(approval.ids) ||
    changedFlows.some((id) => !approval.ids.includes(id)) ||
    typeof approval.prd !== "string" ||
    !matchesMenuPrd(feature, approval.prd) ||
    approval.prdDigest !== contentDigest((await readPrd(approval.prd)) || "")
  )
    throw new Error("Confirm the affected flow list with the matching PRD before changing scenario intent.");
}
