import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execute = promisify(execFile);

/** Publish a reviewed branch, tolerating a retry after a successful push or PR creation. */
export async function publishDraft({ workspace, branch, baseBranch, title }, run = execute) {
  if (!/^automation\/agent-[a-f0-9-]+$/.test(branch)) throw new Error("The draft branch is invalid.");
  if (typeof baseBranch !== "string" || !baseBranch || baseBranch.startsWith("-"))
    throw new Error("The destination repository's base branch could not be determined.");
  const options = {
    cwd: workspace,
    timeout: 120000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    windowsHide: true,
  };
  try {
    await run("git", ["check-ref-format", "--branch", baseBranch], options);
    await run("git", ["merge-base", "--is-ancestor", baseBranch, "HEAD"], options);
  } catch {
    throw new Error(
      "Cannot finalize: update the draft with the latest destination base branch and resolve any conflicts, then review it again.",
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
          "Prepared in Testasaurus. Review scenario intent, implementation and verification before merging.",
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
    throw new Error("Could not create the pull request. Your draft is retained; check GitHub access and retry.");
  }
}
