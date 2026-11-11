import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, "../../../");
const branchIsPublishable = (branch) =>
  /^draft\/local\/[a-z0-9-]+-[a-f0-9]{8}$/.test(branch) || /^automation\/agent-[a-f0-9-]+$/.test(branch);

/** Publish a reviewed branch, tolerating a retry after a successful push or PR creation. */
export async function publishDraft({ workspace, branch, baseBranch, title, description }, run = execute) {
  if (!branchIsPublishable(branch)) throw new Error("The draft branch is invalid.");
  if (typeof baseBranch !== "string" || !baseBranch || baseBranch.startsWith("-"))
    throw new Error("The destination repository's target branch could not be determined.");
  const options = {
    cwd: workspace,
    timeout: 120000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GH_PROMPT_DISABLED: "1" },
    windowsHide: true,
  };
  try {
    await run("git", ["check-ref-format", "--branch", baseBranch], options);
    await run("git", ["fetch", "--no-tags", "origin", baseBranch], options);
    await run("git", ["merge-base", "--is-ancestor", `refs/remotes/origin/${baseBranch}`, "HEAD"], options);
  } catch {
    throw new Error(
      "The target branch moved. Synchronize the draft with the latest target branch, review it, and retry.",
    );
  }

  const lookup = async () => {
    const result = await run(
      "gh",
      [
        "pr",
        "list",
        "--base",
        baseBranch,
        "--head",
        branch,
        "--state",
        "all",
        "--json",
        "number,url,state",
        "--limit",
        "20",
      ],
      options,
    );
    const found = JSON.parse(result.stdout);
    if (!Array.isArray(found)) throw new Error("Invalid PR response");
    return found;
  };
  try {
    const existing = await lookup();
    const open = existing.find((item) => item.state === "OPEN");
    if (!open && existing.length) throw new Error("A pull request for this branch has already been closed or merged.");
    await run("git", ["push", "--set-upstream", "origin", `HEAD:refs/heads/${branch}`], options);
    if (open) return open;
    try {
      await run(
        "gh",
        [
          "pr",
          "create",
          "--base",
          baseBranch,
          "--head",
          branch,
          "--title",
          title,
          "--body",
          description || "Prepared in Q-Rex. Review scenario intent, implementation and verification before merging.",
        ],
        options,
      );
    } catch {
      // A network failure can occur after GitHub created the PR; lookup makes retry idempotent.
    }
    const result = (await lookup()).find((item) => item.state === "OPEN");
    if (!result?.url || !Number.isInteger(result.number)) throw new Error("PR was not confirmed");
    return result;
  } catch (error) {
    if (error.message?.startsWith("A pull request")) throw error;
    throw new Error("Could not create the pull request. Your draft is retained; check GitHub CLI access and retry.");
  }
}

/** Refresh local PR history from the GitHub CLI account configured on this computer. */
export async function refreshPullRequests(pullRequests, run = execute) {
  if (!Array.isArray(pullRequests)) throw new Error("Pull-request history is unavailable.");
  const options = {
    cwd: root,
    timeout: 30000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, GH_PROMPT_DISABLED: "1", GIT_TERMINAL_PROMPT: "0" },
    windowsHide: true,
  };
  const refreshed = [];
  for (const item of pullRequests) {
    if (!Number.isInteger(item.number) || typeof item.url !== "string") continue;
    let result;
    try {
      result = await run(
        "gh",
        [
          "pr",
          "view",
          String(item.number),
          "--json",
          "number,title,url,state,mergedAt,closedAt,headRefName,baseRefName",
        ],
        options,
      );
    } catch {
      throw new Error(
        "Could not refresh PR status. Confirm GitHub CLI is installed and authenticated on this computer.",
      );
    }
    const current = JSON.parse(result.stdout);
    if (!current || current.url !== item.url || !["OPEN", "CLOSED"].includes(current.state))
      throw new Error("GitHub returned an invalid pull-request status.");
    refreshed.push({
      ...item,
      title: current.title || item.title,
      status: current.mergedAt ? "MERGED" : current.state,
      branch: current.headRefName || item.branch,
      baseBranch: current.baseRefName || item.baseBranch,
      mergedAt: current.mergedAt || undefined,
      closedAt: current.closedAt || undefined,
    });
  }
  return refreshed;
}
