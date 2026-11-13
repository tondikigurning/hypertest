import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const repoRoot = resolve(import.meta.dirname, "../../../");
const workspacesRoot = join(repoRoot, ".cache/automation-agent/workspaces");
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function git(args, cwd = repoRoot) {
  return execute("git", args, {
    cwd,
    timeout: 120000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    windowsHide: true,
  });
}

async function localBranchExists(name) {
  try {
    await git(["show-ref", "--verify", "--quiet", `refs/heads/${name}`]);
    return true;
  } catch {
    return false;
  }
}

async function originExists() {
  try {
    await git(["remote", "get-url", "origin"]);
    return true;
  } catch {
    return false;
  }
}

function normalizeTargetBranch(value) {
  if (typeof value !== "string") throw new Error("Choose a valid target branch.");
  const branch = value.startsWith("origin/") ? value.slice("origin/".length) : value;
  if (!branch || branch.startsWith("-") || branch.length > 160) throw new Error("Choose a valid target branch.");
  return branch;
}

async function resolveTarget(targetBranch, { refresh = true } = {}) {
  const branch = normalizeTargetBranch(targetBranch);
  await git(["check-ref-format", "--branch", branch]);
  if (await originExists()) {
    if (refresh) {
      try {
        await git(["fetch", "--no-tags", "origin", branch]);
      } catch (error) {
        throw new Error("Could not fetch the latest target branch from origin. Check the remote and GitHub access.", {
          cause: error,
        });
      }
    }
    const remoteRef = `refs/remotes/origin/${branch}`;
    try {
      const result = await git(["rev-parse", "--verify", `${remoteRef}^{commit}`]);
      return { branch, ref: remoteRef, commit: result.stdout.trim(), remote: true };
    } catch {
      throw new Error(`The target branch '${branch}' was not found on origin.`);
    }
  }
  try {
    const result = await git(["rev-parse", "--verify", `${branch}^{commit}`]);
    return { branch, ref: branch, commit: result.stdout.trim(), remote: false };
  } catch {
    throw new Error(`The target branch '${branch}' is not available in this local repository.`);
  }
}

function validateWorktreePath(workspace) {
  const absolute = resolve(workspace);
  const rel = relative(workspacesRoot, absolute);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("The draft workspace path is invalid.");
  return absolute;
}

export async function listDraftTargets() {
  const hasOrigin = await originExists();
  const result = hasOrigin
    ? await git(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"])
    : await git(["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
  const targets = new Set();
  for (const value of result.stdout
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)) {
    if (value === "origin/HEAD") continue;
    targets.add(value.startsWith("origin/") ? value.slice("origin/".length) : value);
  }
  const branches = [...targets].sort((left, right) => left.localeCompare(right));
  let currentBranch = "";
  try {
    currentBranch = (await git(["branch", "--show-current"])).stdout.trim();
  } catch {
    // A detached local checkout still offers the standard development default when present.
  }
  const defaultBranch = branches.includes("development")
    ? "development"
    : branches.includes(currentBranch)
      ? currentBranch
      : branches[0];
  return { branches, defaultBranch };
}

export async function createDraftWorkspace({ userId, draftId, branch, targetBranch }) {
  if (!idPattern.test(userId) || !idPattern.test(draftId)) throw new Error("The local draft identity is invalid.");
  if (typeof branch !== "string" || !/^draft\/local\/[a-z0-9-]+-[a-f0-9]{8}$/.test(branch))
    throw new Error("The local draft branch name is invalid.");
  const target = await resolveTarget(targetBranch);
  const workspace = validateWorktreePath(join(workspacesRoot, userId, draftId, "workspace"));
  mkdirSync(dirname(workspace), { recursive: true });

  if (existsSync(workspace)) {
    const topLevel = await git(["rev-parse", "--show-toplevel"], workspace);
    if (resolve(topLevel.stdout.trim()) !== workspace)
      throw new Error("A different worktree already exists at this draft path. It has been preserved.");
    const checkedOutBranch = await git(["branch", "--show-current"], workspace);
    let currentBranch = checkedOutBranch.stdout.trim();
    if (!currentBranch && (await localBranchExists(branch))) {
      const branchHead = (await git(["rev-parse", branch])).stdout.trim();
      if (branchHead === target.commit) await git(["branch", "-D", branch]);
      else {
        await git(["switch", branch], workspace);
        currentBranch = branch;
      }
    }
    if (currentBranch && currentBranch !== branch)
      throw new Error("A different worktree already exists at this draft path. It has been preserved.");
    const mergeBase = currentBranch
      ? await git(["merge-base", target.ref, branch], workspace).catch(() => undefined)
      : undefined;
    const head = await git(["rev-parse", "HEAD"], workspace);
    return {
      workspace,
      branch: currentBranch || undefined,
      branchCandidate: branch,
      baseCommit: mergeBase?.stdout.trim() || target.commit,
      expectedHead: head.stdout.trim(),
      baseBranch: target.branch,
    };
  }

  if (await localBranchExists(branch)) {
    const branchHead = (await git(["rev-parse", branch])).stdout.trim();
    if (branchHead === target.commit) await git(["branch", "-D", branch]);
    else await git(["worktree", "add", workspace, branch]);
  }
  if (!existsSync(workspace)) await git(["worktree", "add", "--detach", workspace, target.ref]);
  const head = await git(["rev-parse", "HEAD"], workspace);
  return {
    workspace,
    branch: (await git(["branch", "--show-current"], workspace)).stdout.trim() || undefined,
    branchCandidate: branch,
    baseCommit: target.commit,
    expectedHead: head.stdout.trim(),
    baseBranch: target.branch,
  };
}

async function listConflicts(workspace) {
  const result = await git(["diff", "--name-only", "--diff-filter=U", "-z"], workspace);
  return result.stdout
    .split("\0")
    .filter(Boolean)
    .map((file) => file.replaceAll("\\", "/"));
}

async function mergeIsInProgress(workspace) {
  try {
    await git(["rev-parse", "--verify", "-q", "MERGE_HEAD"], workspace);
    return true;
  } catch {
    return false;
  }
}

export function draftMergeInProgress(workspace) {
  return mergeIsInProgress(validateWorktreePath(workspace));
}

export async function synchronizeDraftWorkspace({ workspace, branch, targetBranch }) {
  workspace = validateWorktreePath(workspace);
  if (typeof targetBranch !== "string" || !targetBranch) throw new Error("This draft has no target branch.");
  const currentBranch = (await git(["branch", "--show-current"], workspace)).stdout.trim();
  if (!currentBranch) {
    branch ||= `draft/local/recovered-${randomUUID().slice(0, 8)}`;
    await git(["check-ref-format", "--branch", branch]);
    await git(["switch", "-c", branch], workspace);
  } else if (branch && branch !== currentBranch) {
    throw new Error("The draft worktree branch changed outside the review flow. Inspect it before continuing.");
  } else {
    branch = currentBranch;
  }

  const target = await resolveTarget(targetBranch);
  const mergeInProgress = await mergeIsInProgress(workspace);
  if (mergeInProgress) {
    const conflicts = await listConflicts(workspace);
    return {
      status: conflicts.length ? "conflicts" : "merge-ready",
      branch,
      targetBranch: target.branch,
      baseCommit: target.commit,
      conflicts,
    };
  }

  const before = (await git(["rev-parse", "HEAD"], workspace)).stdout.trim();
  const alreadyContainsTarget = await git(["merge-base", "--is-ancestor", target.ref, "HEAD"], workspace)
    .then(() => true)
    .catch(() => false);
  if (!alreadyContainsTarget) {
    try {
      await git(["merge", "--no-edit", target.ref], workspace);
    } catch (error) {
      const conflicts = await listConflicts(workspace);
      if (!conflicts.length)
        throw new Error("Could not synchronize the draft with its target branch. Check the workspace and Git status.", {
          cause: error,
        });
      return { status: "conflicts", branch, targetBranch: target.branch, baseCommit: target.commit, conflicts };
    }
  }

  const after = (await git(["rev-parse", "HEAD"], workspace)).stdout.trim();
  return {
    status: before === after && alreadyContainsTarget ? "current" : "updated",
    branch,
    targetBranch: target.branch,
    baseCommit: target.commit,
    conflicts: [],
  };
}
