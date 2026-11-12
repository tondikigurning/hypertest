import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const usersRoot = resolve(import.meta.dirname, "../../../.cache/automation-agent/users");
const legacyUserId = "local-preview-user";
const legacyDraftId = "default";
const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const draftIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const archiveAfterMs = 30 * 24 * 60 * 60 * 1000;

function userDirectory(userId) {
  if (userId !== legacyUserId && !userIdPattern.test(userId)) throw new Error("Invalid local preview identity.");
  return join(usersRoot, userId);
}

function indexPath(userId) {
  return join(userDirectory(userId), "drafts.json");
}

function legacySessionPath(userId) {
  return userId === legacyUserId
    ? resolve(import.meta.dirname, "../../../.cache/automation-agent/session.json")
    : join(userDirectory(userId), "session.json");
}

function readData(userId) {
  const path = indexPath(userId);
  const data = { drafts: [], pullRequests: [] };
  let changed = false;
  try {
    const saved = JSON.parse(readFileSync(path, "utf8"));
    if (Array.isArray(saved.drafts)) data.drafts = saved.drafts;
    if (Array.isArray(saved.pullRequests)) data.pullRequests = saved.pullRequests;
  } catch {
    // The local preview may not have created its draft index yet.
  }

  if (!data.drafts.some((draft) => draft.id === legacyDraftId)) {
    const pathToLegacySession = legacySessionPath(userId);
    if (existsSync(pathToLegacySession)) {
      const modifiedAt = statSync(pathToLegacySession).mtime.toISOString();
      let saved = {};
      try {
        saved = JSON.parse(readFileSync(pathToLegacySession, "utf8"));
      } catch {
        // Keep the existing session available even if its metadata needs repair.
      }
      data.drafts.unshift({
        id: legacyDraftId,
        title: "Recovered local draft",
        branch: typeof saved.branch === "string" ? saved.branch : undefined,
        targetBranch: typeof saved.baseBranch === "string" ? saved.baseBranch : "development",
        status: "active",
        createdAt: modifiedAt,
        lastActivityAt: modifiedAt,
        legacy: true,
      });
      changed = true;
    }
  }
  return { data, changed };
}

function saveData(userId, data) {
  const path = indexPath(userId);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
  renameSync(temporary, path);
}

function archiveInactive(data, now = Date.now()) {
  let changed = false;
  for (const draft of data.drafts) {
    if (draft.status !== "active" || typeof draft.lastActivityAt !== "string") continue;
    const lastActivity = Date.parse(draft.lastActivityAt);
    if (!Number.isFinite(lastActivity) || now - lastActivity < archiveAfterMs) continue;
    draft.status = "archived";
    draft.archivedAt = new Date(now).toISOString();
    changed = true;
  }
  return changed;
}

function keepSingleActiveDraft(data, now = Date.now()) {
  const activeDrafts = data.drafts.filter((draft) => draft.status === "active");
  if (activeDrafts.length < 2) return false;

  activeDrafts.sort((left, right) => {
    const leftActivity = Date.parse(left.lastActivityAt || left.createdAt || "");
    const rightActivity = Date.parse(right.lastActivityAt || right.createdAt || "");
    return (Number.isFinite(rightActivity) ? rightActivity : 0) - (Number.isFinite(leftActivity) ? leftActivity : 0);
  });

  const archivedAt = new Date(now).toISOString();
  for (const draft of activeDrafts.slice(1)) {
    draft.status = "archived";
    draft.archivedAt = archivedAt;
  }
  return true;
}

function saveIfChanged(userId, data, changed) {
  if (changed) saveData(userId, data);
}

export function listLocalDrafts(userId) {
  const { data, changed } = readData(userId);
  const archived = archiveInactive(data);
  const limited = keepSingleActiveDraft(data);
  saveIfChanged(userId, data, changed || archived || limited);
  return data.drafts.filter((draft) => draft.status !== "finalized");
}

export function getLocalDraft(userId, draftId) {
  if (draftId !== legacyDraftId && !draftIdPattern.test(draftId || "")) return undefined;
  const { data, changed } = readData(userId);
  const archived = archiveInactive(data);
  const limited = keepSingleActiveDraft(data);
  saveIfChanged(userId, data, changed || archived || limited);
  return data.drafts.find((draft) => draft.id === draftId);
}

export function createLocalDraft(userId, { title, targetBranch }) {
  if (typeof title !== "string" || !title.trim() || title.trim().length > 80)
    throw new Error("Enter a draft name of up to 80 characters.");
  if (typeof targetBranch !== "string" || !targetBranch.trim() || targetBranch.length > 160)
    throw new Error("Choose a target branch.");

  const { data, changed } = readData(userId);
  const archived = archiveInactive(data);
  const limited = keepSingleActiveDraft(data);
  if (data.drafts.some((draft) => draft.status !== "finalized")) {
    saveIfChanged(userId, data, changed || archived || limited);
    throw new Error("Finalize the current draft before creating another.");
  }
  const now = new Date().toISOString();
  const id = randomUUID();
  const slug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "draft";
  const draft = {
    id,
    title: title.trim(),
    branch: `draft/local/${slug}-${id.slice(0, 8)}`,
    targetBranch: targetBranch.trim(),
    status: "active",
    createdAt: now,
    lastActivityAt: now,
  };
  data.drafts.unshift(draft);
  saveData(userId, data);
  return draft;
}

export function touchLocalDraft(userId, draftId) {
  const { data, changed } = readData(userId);
  const archived = archiveInactive(data);
  const limited = keepSingleActiveDraft(data);
  const draft = data.drafts.find((item) => item.id === draftId);
  if (!draft || draft.status !== "active") {
    saveIfChanged(userId, data, changed || archived || limited);
    throw new Error("This draft is unavailable or archived.");
  }
  draft.lastActivityAt = new Date().toISOString();
  saveData(userId, data);
  return draft;
}

export function restoreLocalDraft(userId, draftId) {
  const { data, changed } = readData(userId);
  const archived = archiveInactive(data);
  const limited = keepSingleActiveDraft(data);
  const draft = data.drafts.find((item) => item.id === draftId);
  if (!draft || draft.status !== "archived") {
    saveIfChanged(userId, data, changed || archived || limited);
    throw new Error("This archived draft could not be found.");
  }
  if (data.drafts.some((item) => item.id !== draftId && item.status === "active")) {
    saveIfChanged(userId, data, changed || archived || limited);
    throw new Error("Finalize the current draft before restoring another.");
  }
  draft.status = "active";
  draft.lastActivityAt = new Date().toISOString();
  delete draft.archivedAt;
  saveData(userId, data);
  return draft;
}

export function finalizeLocalDraft(userId, draftId, pullRequest) {
  const { data, changed } = readData(userId);
  const archived = archiveInactive(data);
  const limited = keepSingleActiveDraft(data);
  const draft = data.drafts.find((item) => item.id === draftId);
  if (!draft || draft.status !== "active") {
    saveIfChanged(userId, data, changed || archived || limited);
    throw new Error("This draft is unavailable or already finalized.");
  }
  const existing = data.pullRequests.find((item) => item.url === pullRequest.url);
  const record = {
    title: pullRequest.title,
    url: pullRequest.url,
    number: pullRequest.number,
    branch: pullRequest.branch,
    baseBranch: pullRequest.baseBranch,
    draftId,
    status: pullRequest.status || "OPEN",
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, record);
  else data.pullRequests.unshift(record);
  draft.status = "finalized";
  draft.finalizedAt = record.updatedAt;
  saveData(userId, data);
  return record;
}

export function listLocalPullRequests(userId) {
  const { data, changed } = readData(userId);
  saveIfChanged(userId, data, changed);
  return data.pullRequests;
}

export function updateLocalPullRequests(userId, pullRequests) {
  const { data } = readData(userId);
  const updates = new Map(pullRequests.map((item) => [item.url, item]));
  data.pullRequests = data.pullRequests.map((item) => {
    const update = updates.get(item.url);
    return update ? { ...item, ...update, updatedAt: new Date().toISOString() } : item;
  });
  saveData(userId, data);
  return data.pullRequests;
}
