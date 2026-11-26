import { execFile } from "node:child_process";
import { devNull } from "node:os";
import { promisify } from "node:util";
import { getGithubCredential, saveGithubCredential } from "../auth/identity-store.mjs";

const execute = promisify(execFile);
const refreshes = new Map();
const reconnect =
  "GitHub authorization is unavailable or expired. Sign in with GitHub again and check repository access.";

export async function githubToken(
  userId,
  { request = fetch, load = getGithubCredential, save = saveGithubCredential } = {},
) {
  const credential = await load(userId);
  if (!credential) throw new Error(reconnect);
  if (!credential.expiresAt || credential.expiresAt.getTime() > Date.now() + 60000) return credential.accessToken;
  if (!credential.refreshToken || (credential.refreshExpiresAt && credential.refreshExpiresAt.getTime() <= Date.now()))
    throw new Error(reconnect);
  if (!refreshes.has(userId)) {
    const pending = (async () => {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (!clientId || !clientSecret) throw new Error(reconnect);
      const response = await request("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: credential.refreshToken,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(reconnect);
      const data = await response.json();
      if (data.error || typeof data.access_token !== "string" || !data.access_token) throw new Error(reconnect);
      const expiry = (seconds) =>
        Number.isSafeInteger(seconds) && seconds > 0 ? new Date(Date.now() + seconds * 1000) : null;
      await save(userId, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || undefined,
        expiresAt: expiry(data.expires_in),
        refreshExpiresAt: expiry(data.refresh_token_expires_in),
      });
      return data.access_token;
    })();
    refreshes.set(userId, pending);
    pending.finally(() => refreshes.delete(userId)).catch(() => {});
  }
  return refreshes.get(userId);
}

export function parseGithubRemote(value) {
  const match =
    /^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/i.exec(
      value.trim(),
    );
  if (!match || match[1] === "." || match[1] === ".." || match[2] === "." || match[2] === "..")
    throw new Error("Configure a GitHub repository as origin before using GitHub operations.");
  return { owner: match[1], repo: match[2], url: `https://github.com/${match[1]}/${match[2]}.git` };
}

function gitEnvironment(token) {
  const environment = { ...process.env };
  for (const key of Object.keys(environment))
    if (key.startsWith("GIT_TRACE") || key.startsWith("GIT_CONFIG_") || key === "GIT_CURL_VERBOSE")
      delete environment[key];
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_GLOBAL = devNull;
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_ASKPASS = "automation-disabled-askpass";
  environment.GIT_CONFIG_COUNT = token ? "5" : "4";
  environment.GIT_CONFIG_KEY_0 = "credential.helper";
  environment.GIT_CONFIG_VALUE_0 = "";
  environment.GIT_CONFIG_KEY_1 = "http.extraheader";
  environment.GIT_CONFIG_VALUE_1 = "";
  environment.GIT_CONFIG_KEY_2 = "http.https://github.com/.extraheader";
  environment.GIT_CONFIG_VALUE_2 = "";
  environment.GIT_CONFIG_KEY_3 = "http.followRedirects";
  environment.GIT_CONFIG_VALUE_3 = "false";
  if (token) {
    environment.GIT_CONFIG_KEY_4 = "http.https://github.com/.extraheader";
    environment.GIT_CONFIG_VALUE_4 = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
  }
  return environment;
}

export function createGithubOperations(userId, { run = execute, request = fetch, token = githubToken } = {}) {
  async function repository(workspace) {
    const options = { cwd: workspace, timeout: 30000, windowsHide: true, env: gitEnvironment() };
    try {
      const headers = await run(
        "git",
        ["config", "--local", "--includes", "--name-only", "--get-regexp", "^http\\..*extraheader$"],
        options,
      );
      if (headers.stdout.trim())
        throw new Error(
          "Remove repository-specific Git HTTP authorization headers before using per-user GitHub access.",
        );
    } catch (error) {
      if (error.code !== 1) throw error;
    }
    const result = await run("git", ["remote", "get-url", "origin"], options);
    return parseGithubRemote(result.stdout);
  }
  async function git(workspace, args, accessToken) {
    try {
      return await run("git", args, {
        cwd: workspace,
        timeout: 120000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        env: gitEnvironment(accessToken),
      });
    } catch {
      throw new Error("GitHub operation failed. Check repository access or sign in with GitHub again.");
    }
  }
  async function api(path, accessToken, options = {}) {
    const response = await request(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Automation-Workspace",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(
        response.status === 401 || response.status === 403 || response.status === 404
          ? reconnect
          : "GitHub could not complete the request. Retry later.",
      );
    return response.json();
  }
  async function fetchTarget({ workspace, targetBranch }) {
    if (typeof targetBranch !== "string" || !targetBranch || targetBranch.startsWith("-"))
      throw new Error("Invalid target branch.");
    const repo = await repository(workspace);
    const accessToken = await token(userId);
    await git(workspace, ["check-ref-format", "--branch", targetBranch]);
    await git(
      workspace,
      ["fetch", "--no-tags", repo.url, `+refs/heads/${targetBranch}:refs/remotes/origin/${targetBranch}`],
      accessToken,
    );
  }
  async function publish({ workspace, branch, baseBranch, title, description }) {
    if (
      !/^draft\/local\/[a-z0-9-]+-[a-f0-9]{8}$/.test(branch) ||
      typeof baseBranch !== "string" ||
      !baseBranch ||
      baseBranch.startsWith("-")
    )
      throw new Error("Invalid draft branch.");
    const repo = await repository(workspace);
    const accessToken = await token(userId);
    await fetchTarget({ workspace, targetBranch: baseBranch });
    await git(workspace, ["merge-base", "--is-ancestor", `refs/remotes/origin/${baseBranch}`, "HEAD"]);
    const root = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/pulls`;
    const query = new URLSearchParams({
      head: `${repo.owner}:${branch}`,
      base: baseBranch,
      state: "all",
      per_page: "100",
    });
    const existing = await api(`${root}?${query}`, accessToken);
    if (!Array.isArray(existing)) throw new Error("GitHub returned an invalid pull-request response.");
    let pr = existing.find((item) => item.state === "open");
    if (!pr && existing.length) throw new Error("A pull request for this branch has already been closed or merged.");
    await git(workspace, ["push", "--no-verify", repo.url, `HEAD:refs/heads/${branch}`], accessToken);
    if (!pr) {
      try {
        pr = await api(root, accessToken, {
          method: "POST",
          body: JSON.stringify({ title, body: description, head: branch, base: baseBranch }),
        });
      } catch {
        const retry = await api(`${root}?${query}`, accessToken);
        pr = Array.isArray(retry) ? retry.find((item) => item.state === "open") : undefined;
      }
    }
    if (
      !pr ||
      !Number.isInteger(pr.number) ||
      typeof pr.html_url !== "string" ||
      !pr.html_url.startsWith(`https://github.com/${repo.owner}/${repo.repo}/pull/`)
    )
      throw new Error("The pull request could not be confirmed. Retry after checking GitHub.");
    return { number: pr.number, url: pr.html_url, state: "OPEN" };
  }
  async function refresh({ workspace, pullRequests }) {
    const repo = await repository(workspace);
    const accessToken = await token(userId);
    const prefix = `https://github.com/${repo.owner}/${repo.repo}/pull/`;
    const results = [];
    for (const item of pullRequests) {
      if (!Number.isInteger(item.number) || item.url !== prefix + item.number) continue;
      const current = await api(
        `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/pulls/${item.number}`,
        accessToken,
      );
      if (current.html_url !== item.url || !["open", "closed"].includes(current.state))
        throw new Error("GitHub returned an invalid pull-request response.");
      results.push({
        ...item,
        title: current.title || item.title,
        status: current.merged_at ? "MERGED" : current.state.toUpperCase(),
        mergedAt: current.merged_at || undefined,
        closedAt: current.closed_at || undefined,
      });
    }
    return results;
  }
  return { fetchTarget, publish, refresh };
}
