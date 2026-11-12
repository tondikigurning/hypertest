import { execFile, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstatSync, readdirSync } from "node:fs";
import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { createRunEventReader } from "../runs/run-event-reader.mjs";
import { draftArtifactPath } from "./draft-artifacts.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "../../../");
const agentWorkspaces = join(root, ".cache", "automation-agent", "workspaces");
const dockerfile = join(root, "server/modules/agent/agent-sandbox.Dockerfile");
const sandboxSources = [
  ["server/modules/agent/agent-sandbox.Dockerfile", dockerfile],
  ["server/modules/agent/agent-sandbox-runner.mjs", join(root, "server/modules/agent/agent-sandbox-runner.mjs")],
  ["server/modules/agent/agent-egress-proxy.mjs", join(root, "server/modules/agent/agent-egress-proxy.mjs")],
  [
    "server/modules/agent/agent-egress-proxy-server.mjs",
    join(root, "server/modules/agent/agent-egress-proxy-server.mjs"),
  ],
  ["server/modules/agent/draft-run.mjs", join(root, "server/modules/agent/draft-run.mjs")],
  ["server/modules/runs/local-run-service.mjs", join(root, "server/modules/runs/local-run-service.mjs")],
];
const maxBuildMs = 15 * 60 * 1000;
const maxSnapshotBytes = 512 * 1024 * 1024;
const excludedWorkspacePath =
  /(?:^|\/)(?:\.git|node_modules|\.cache|\.features-gen|\.env(?:\.[^/]*)?|\.npmrc|\.netrc|\.git-credentials|\.ssh|\.aws|\.kube|\.auth|playwright-report|test-results|secrets?|credentials?|auth\.json|storage[-_.]?state|id_(?:rsa|ed25519)|[^/]*\.(?:pem|key|p12|pfx))(?:\/|$)/i;

const dockerIgnore = [
  ".git",
  "**/.git",
  "node_modules",
  "**/node_modules",
  ".cache",
  "**/.cache",
  ".env",
  ".env.*",
  "**/.env",
  "**/.env.*",
  ".npmrc",
  "**/.npmrc",
  ".git-credentials",
  "**/.git-credentials",
  "e2e/.features-gen",
  "e2e/playwright/.auth",
  "e2e/playwright-report",
  "e2e/test-results",
  "test-results",
  "playwright-report",
].join("\n");

function normalizeDockerPath(path) {
  return path.replaceAll("\\", "/");
}

async function docker(args, timeout = 30000, signal) {
  if (signal?.aborted) throw new Error("The isolated draft run was cancelled.");
  try {
    return await execFileAsync("docker", args, {
      cwd: root,
      timeout,
      signal,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (cause) {
    throw new Error(
      args[0] === "info"
        ? "Docker is required to run draft scenarios in the isolated agent sandbox."
        : "The Docker sandbox command failed. Check container resources and registry access.",
      { cause },
    );
  }
}

async function buildSandboxImage(baseCommit, image, signal) {
  const tempRoot = await mkdtemp(join(tmpdir(), "automation-agent-build-"));
  const context = join(tempRoot, "context");
  const archive = join(tempRoot, "source.tar");
  const verifiedRelative = relative(resolve(tmpdir()), resolve(tempRoot));
  const safeToRemove = Boolean(verifiedRelative && !verifiedRelative.startsWith("..") && !isAbsolute(verifiedRelative));
  if (!safeToRemove) throw new Error("The temporary sandbox build context is outside the system temp directory.");
  try {
    await mkdir(context);
    await execFileAsync("git", ["archive", "--format=tar", "--output", archive, baseCommit], {
      cwd: root,
      timeout: 30000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    // GNU tar on Windows treats the colon in an absolute drive path as a remote host.
    await execFileAsync("tar", ["-xf", "source.tar", "-C", "context"], {
      cwd: tempRoot,
      timeout: 60000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    for (const [relativePath, sourcePath] of sandboxSources) {
      const destination = join(context, ...relativePath.split("/"));
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(sourcePath, destination);
    }
    await writeFile(join(context, ".dockerignore"), dockerIgnore, { encoding: "utf8", mode: 0o600 });
    await docker(
      ["build", "--file", join(context, ...sandboxSources[0][0].split("/")), "--tag", image, context],
      maxBuildMs,
      signal,
    );
  } catch (cause) {
    if (signal?.aborted) throw new Error("The isolated draft run was cancelled.", { cause });
    if (cause instanceof Error && cause.message.startsWith("Docker is required")) throw cause;
    throw new Error("A sandbox image could not be built from the committed repository version.", { cause });
  } finally {
    if (safeToRemove) await rm(tempRoot, { recursive: true, force: true });
  }
}

async function sandboxImageKey(baseCommit) {
  const digest = createHash("sha256").update(baseCommit);
  for (const [relativePath, sourcePath] of sandboxSources)
    digest.update(relativePath).update(await readFile(sourcePath));
  return digest.digest("hex");
}

async function createSandboxWorkspaceSnapshot(workspace, destination) {
  const realRoot = await realpath(workspace);
  const tracked = await execFileAsync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: workspace,
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
  });
  await mkdir(destination, { recursive: true });
  let totalBytes = 0;
  let copiedFiles = 0;
  try {
    for (const entry of tracked.stdout.split("\0").filter(Boolean)) {
      const path = entry.replaceAll("\\", "/");
      const segments = path.split("/");
      if (
        path.startsWith("/") ||
        segments.some((segment) => !segment || segment === "." || segment === "..") ||
        excludedWorkspacePath.test(path)
      )
        continue;
      const source = resolve(workspace, ...segments);
      const sourceRelative = relative(realRoot, source);
      if (!sourceRelative || sourceRelative.startsWith("..") || isAbsolute(sourceRelative))
        throw new Error("A draft file is outside the selected workspace.");
      const info = await lstat(source).catch(() => undefined);
      if (!info?.isFile()) continue;
      const realSource = await realpath(source);
      const realRelative = relative(realRoot, realSource);
      if (!realRelative || realRelative.startsWith("..") || isAbsolute(realRelative))
        throw new Error("A draft file resolves outside the selected workspace.");
      totalBytes += info.size;
      copiedFiles++;
      if (info.size > 128 * 1024 * 1024 || totalBytes > maxSnapshotBytes || copiedFiles > 30000)
        throw new Error("The draft is too large to copy into the isolated test runner.");
      const target = join(destination, ...segments);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(realSource, target);
    }
    await mkdir(join(destination, "e2e", ".features-gen"), { recursive: true });
    return destination;
  } catch (cause) {
    await rm(destination, { recursive: true, force: true });
    throw cause;
  }
}

async function assertDependencyManifestsUnchanged(workspace, baseCommit) {
  const tracked = await execFileAsync("git", ["diff", "--name-only", baseCommit, "--"], {
    cwd: workspace,
    timeout: 30000,
  });
  const untracked = await execFileAsync("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
    cwd: workspace,
    timeout: 30000,
  });
  const files = [...tracked.stdout.split(/\r?\n/), ...untracked.stdout.split("\0")].filter(Boolean);
  if (
    files.some(
      (path) => path === "pnpm-lock.yaml" || path === "pnpm-workspace.yaml" || /(^|\/)package\.json$/.test(path),
    )
  )
    throw new Error(
      "Draft dependency manifests changed. Review and commit dependencies before running in the sandbox.",
    );
}

function publicRun(run) {
  return {
    id: run.id,
    scenarioId: run.scenarioId,
    target: run.target,
    stage: run.stage,
    done: run.done,
    error: run.error,
    status: run.status,
    timedOut: Boolean(run.timedOut),
    tests: run.tests || [],
    evidenceUpload: { status: "unavailable", scenarioIds: [] },
    isolated: true,
  };
}

/** Build and run one validated scenario in a quota-limited container with target-only egress. */
export async function startIsolatedDraftRun({ workspace, scenarioId, target, variables, baseCommit, patch, signal }) {
  if (typeof workspace !== "string" || typeof scenarioId !== "string" || typeof target !== "string")
    throw new Error("The selected draft scenario is unavailable.");
  const resolvedWorkspace = resolve(workspace);
  const allowedRoot = await realpath(agentWorkspaces).catch(() => undefined);
  const realWorkspace = await realpath(resolvedWorkspace).catch(() => undefined);
  const workspaceRelative = allowedRoot && realWorkspace ? relative(allowedRoot, realWorkspace) : "";
  if (
    !allowedRoot ||
    !realWorkspace ||
    !workspaceRelative ||
    workspaceRelative.startsWith("..") ||
    isAbsolute(workspaceRelative)
  )
    throw new Error("The selected workspace is outside the isolated agent worktree directory.");
  if (
    !variables ||
    typeof variables.E2E_USERNAME !== "string" ||
    variables.E2E_USERNAME.length > 4096 ||
    typeof variables.E2E_PASSWORD !== "string" ||
    variables.E2E_PASSWORD.length > 4096
  )
    throw new Error("Set E2E username and password in Variables before running a draft scenario.");
  const targetUrl = new URL(target);
  if (!new Set(["http:", "https:"]).has(targetUrl.protocol) || targetUrl.username || targetUrl.password)
    throw new Error("The selected test environment URL is invalid.");
  if (typeof baseCommit !== "string" || typeof patch !== "string" || !patch)
    throw new Error("Review the draft changes before running a scenario.");
  await assertDependencyManifestsUnchanged(realWorkspace, baseCommit);

  const runId = randomUUID();
  const networkName = `automation-agent-${runId}`;
  const proxyName = `${networkName}-proxy`;
  const containerName = `${networkName}-runner`;
  const digest = await sandboxImageKey(baseCommit);
  const image = `hypertest-agent-sandbox:${digest.slice(0, 16)}`;
  const targetPort = Number(targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80));
  const artifactRoot = await mkdtemp(join(tmpdir(), "automation-agent-draft-run-"));
  await mkdir(join(artifactRoot, "tmp"));
  let networkCreated = false;
  let proxyCreated = false;
  try {
    await createSandboxWorkspaceSnapshot(realWorkspace, join(artifactRoot, "draft"));
    await docker(["info", "--format", "{{.ServerVersion}}"], 15000, signal);
    await docker(["image", "inspect", image], 30000, signal).catch(() => buildSandboxImage(baseCommit, image, signal));
    await docker(
      ["network", "create", "--internal", "--label", "automation.agent.sandbox=true", networkName],
      30000,
      signal,
    );
    networkCreated = true;
    await docker(
      [
        "run",
        "--detach",
        "--name",
        proxyName,
        "--label",
        "automation.agent.sandbox=true",
        "--network",
        "bridge",
        "--read-only",
        "--cpus=0.25",
        "--memory=128m",
        "--pids-limit=32",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        image,
        "node",
        "/workspace/server/modules/agent/agent-egress-proxy.mjs",
        targetUrl.hostname,
        String(targetPort),
        targetUrl.protocol,
      ],
      30000,
      signal,
    );
    proxyCreated = true;
    await docker(["network", "connect", "--alias", "agent-egress", networkName, proxyName], 30000, signal);
  } catch (cause) {
    if (proxyCreated) await docker(["rm", "--force", proxyName]).catch(() => {});
    if (networkCreated) await docker(["network", "rm", networkName]).catch(() => {});
    await rm(artifactRoot, { recursive: true, force: true });
    if (signal?.aborted) throw new Error("The isolated draft run was cancelled.", { cause });
    if (cause instanceof Error && cause.message.startsWith("Docker is required")) throw cause;
    throw new Error("The isolated test sandbox could not be prepared. Check Docker and the local network.", { cause });
  }

  const run = {
    id: runId,
    scenarioId,
    target: targetUrl.href,
    stage: "starting isolated sandbox",
    done: false,
    tests: [],
    status: "running",
    error: undefined,
    timedOut: false,
  };
  let child;
  let output = "";
  let cleanupPromise;
  let eventReader;
  function artifactRunDirectory() {
    const temporaryRoot = join(artifactRoot, "tmp");
    try {
      const name = readdirSync(temporaryRoot).find((entry) => {
        if (!entry.startsWith("hyperscal-automation-")) return false;
        try {
          return lstatSync(join(temporaryRoot, entry)).isDirectory();
        } catch {
          return false;
        }
      });
      return name ? join(temporaryRoot, name) : undefined;
    } catch {
      return undefined;
    }
  }
  function draftProgress() {
    const directory = artifactRunDirectory();
    if (!directory) return undefined;
    eventReader ||= createRunEventReader(join(directory, "events.jsonl"));
    return eventReader(true, run.finishedAt);
  }
  const cleanup = () => {
    if (!cleanupPromise) {
      cleanupPromise = (async () => {
        await docker(["rm", "--force", proxyName]).catch(() => {});
        await docker(["network", "rm", networkName]).catch(() => {});
      })();
    }
    return cleanupPromise;
  };
  const processExited = new Promise((resolveExit) => {
    const args = [
      "run",
      "--rm",
      "--interactive",
      "--name",
      containerName,
      "--label",
      "automation.agent.sandbox=true",
      "--network",
      networkName,
      "--cpus=2",
      "--memory=2g",
      "--pids-limit=128",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--tmpfs",
      "/tmp:rw,nosuid,nodev,size=512m",
      "--mount",
      `type=bind,source=${normalizeDockerPath(join(artifactRoot, "draft"))},target=/snapshot,readonly`,
      "--tmpfs",
      "/draft:rw,nosuid,nodev,size=1g",
      "--mount",
      `type=bind,source=${normalizeDockerPath(join(artifactRoot, "tmp"))},target=/run-data`,
      "--env",
      "HOME=/tmp",
      "--env",
      "TMPDIR=/run-data",
      "--env",
      "TMP=/run-data",
      "--env",
      "PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright",
      "--env",
      "XDG_CACHE_HOME=/tmp/.cache",
      "--env",
      "CI=1",
      "--env",
      "HTTP_PROXY=http://agent-egress:3128",
      "--env",
      "HTTPS_PROXY=http://agent-egress:3128",
      "--env",
      "http_proxy=http://agent-egress:3128",
      "--env",
      "https_proxy=http://agent-egress:3128",
      "--env",
      "AUTOMATION_AGENT_PROXY=http://agent-egress:3128",
      image,
      "node",
      "/agent-sandbox-runner.mjs",
    ];
    try {
      child = spawn("docker", args, { cwd: root, stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        output += chunk;
        const lines = output.split(/\r?\n/);
        output = lines.pop() || "";
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.type === "run" && event.run) Object.assign(run, event.run);
            else if (event.type === "error") run.error = event.error;
          } catch {
            run.error = "The isolated runner returned an invalid status update.";
          }
        }
      });
      child.once("error", () => {
        signal?.removeEventListener("abort", stopContainer);
        run.error = "Docker could not start the isolated test runner.";
        run.status = "unavailable";
        run.done = true;
        void cleanup();
        resolveExit();
      });
      child.once("close", (code) => {
        signal?.removeEventListener("abort", stopContainer);
        if (output.trim()) {
          try {
            const event = JSON.parse(output.trim());
            if (event.type === "run" && event.run) Object.assign(run, event.run);
            else if (event.type === "error") run.error = event.error;
          } catch {
            run.error = "The isolated runner returned an invalid status update.";
          }
        }
        if (code !== 0 && !run.error) run.error = "The isolated test runner stopped unexpectedly.";
        if (!run.done) {
          run.done = true;
          run.status = code === 0 ? run.status : "unavailable";
          if (code !== 0) run.stage = "finished without a verified result";
        }
        void cleanup();
        resolveExit();
      });
      child.stdin.end(
        JSON.stringify({
          scenarioId,
          target: targetUrl.href,
          variables: { E2E_USERNAME: variables.E2E_USERNAME, E2E_PASSWORD: variables.E2E_PASSWORD },
        }),
      );
      const stopContainer = () => {
        void docker(["stop", "--time", "5", containerName], 15000).catch(() => {});
      };
      signal?.addEventListener("abort", stopContainer, { once: true });
      if (signal?.aborted) stopContainer();
    } catch {
      run.error = "Docker could not start the isolated test runner.";
      run.status = "unavailable";
      run.done = true;
      void cleanup();
      resolveExit();
    }
  });

  return {
    publicRun: () => publicRun(run),
    active: () => !run.done,
    matches: (id) => id === run.id,
    outputPath: () => join(artifactRunDirectory() || join(artifactRoot, "tmp"), "output"),
    attachment(testId, index) {
      const attachment = draftProgress()?.tests[testId]?.attachments?.[index];
      const directory = artifactRunDirectory();
      if (!directory || typeof attachment?.path !== "string" || !/^(image|video)\//.test(attachment.contentType || ""))
        return undefined;
      const path = draftArtifactPath(directory, attachment.path);
      return path ? { ...attachment, path } : undefined;
    },
    async cancel() {
      if (run.done) return publicRun(run);
      run.cancelRequested = true;
      run.stage = "stopping isolated test runner";
      await docker(["stop", "--time", "5", containerName], 15000).catch(() => {});
      await processExited;
      if (!run.done) {
        run.done = true;
        run.status = "cancelled";
      }
      return publicRun(run);
    },
    async dispose() {
      if (!run.done) throw new Error("Wait for the isolated draft run to finish.");
      await processExited;
      await cleanup();
      const artifactRelative = relative(resolve(tmpdir()), resolve(artifactRoot));
      if (
        !artifactRelative ||
        artifactRelative.startsWith("..") ||
        isAbsolute(artifactRelative) ||
        !artifactRelative.startsWith("automation-agent-draft-run-")
      )
        throw new Error("The isolated run artifacts are outside the system temp directory.");
      await rm(artifactRoot, { recursive: true, force: true });
    },
  };
}
