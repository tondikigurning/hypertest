import { execFile, execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { lstat, mkdtemp, readdir, readFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import { automationCatalog, parseFeature } from "../catalog/scenario-catalog.mjs";
import { getCurrentRunSnapshot } from "../runs/run-controller.mjs";
import { readUploadedAttachment } from "./agent-attachments.mjs";
import { startDraftRun as createDraftRun } from "./draft-run.mjs";
import { draftScenarios } from "./draft-scenarios.mjs";
import { closeExplorationBrowser, startExplorationBrowser } from "./exploration-browser.mjs";
import { publishDraft } from "./publish-draft.mjs";

const root = resolve(import.meta.dirname, "../../../../..");
const execFileAsync = promisify(execFile);
const sessionFile = join(root, ".cache", "automation-agent", "session.json");
const agentWorkspaces = join(root, ".cache", "automation-agent", "workspaces");
const skills = new Set(["ask-qa", "write-e2e-scenarios", "write-e2e-code"]);

export function validateAnswers(questions, answers) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers))
    throw new Error("Provide an answer for each question.");
  const result = {};
  for (const question of questions) {
    const value = answers[question.id];
    if (question.isSecret) {
      result[question.id] = {
        answers: ["[Credential withheld. Configure it in Automation Variables and use only its variable name.]"],
      };
      continue;
    }
    if (typeof value !== "string" || !value.trim() || value.length > 8000)
      throw new Error("Provide an answer for each question.");
    result[question.id] = { answers: [value.trim()] };
  }
  return result;
}

export function selectScenarioContext(catalog, scenario) {
  if (
    !scenario ||
    typeof scenario !== "object" ||
    typeof scenario.key !== "string" ||
    typeof scenario.id !== "string" ||
    typeof scenario.file !== "string" ||
    typeof scenario.title !== "string" ||
    !Array.isArray(scenario.steps) ||
    !scenario.steps.every((step) => typeof step === "string")
  )
    throw new Error("The selected scenario identity is invalid. Select it again.");
  const selected = catalog.filter((item) => item.key === scenario.key);
  if (
    selected.length !== 1 ||
    selected[0].id !== scenario.id ||
    selected[0].file !== scenario.file ||
    selected[0].title !== scenario.title ||
    JSON.stringify(selected[0].steps) !== JSON.stringify(scenario.steps)
  )
    throw new Error("The selected scenario is unavailable or ambiguous in the committed workspace.");
  const { title, id, file, steps } = selected[0];
  return { title, id, file, steps };
}

export function selectFeatureContext(catalog, feature) {
  if (!feature || typeof feature !== "object" || typeof feature.file !== "string" || typeof feature.module !== "string")
    throw new Error("The selected feature identity is invalid. Select it again.");
  const selected = catalog.find((item) => item.file === feature.file && item.module === feature.module);
  if (!selected) throw new Error("The selected feature is unavailable in the committed workspace.");
  return {
    module: feature.module,
    file: feature.file,
    title: selected.feature || feature.file.replace(/\.feature$/, ""),
  };
}

export function selectCategoryContext(catalog, ref) {
  let identity;
  try {
    identity = JSON.parse(ref);
  } catch {
    throw new Error("The attached category identity is invalid.");
  }
  if (!Array.isArray(identity) || identity.length !== 3 || identity.some((part) => typeof part !== "string" || !part))
    throw new Error("The attached category identity is invalid.");
  const [module, file, category] = identity;
  const scenarios = catalog.filter(
    (scenario) =>
      scenario.module === module && scenario.file === file && (scenario.category || "Uncategorized") === category,
  );
  if (!scenarios.length) throw new Error("The attached category is unavailable in the committed workspace.");
  return {
    module,
    file,
    category,
    scenarios: scenarios.map(({ id, title, steps, tags }) => ({ id, title, steps, tags })),
  };
}

function validateContextItems(items) {
  if (!Array.isArray(items) || items.length > 8) throw new Error("Attach up to 8 context items per message.");
  const seen = new Set();
  const seenIds = new Set();
  for (const item of items) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id.trim() || item.id.length > 100)
      throw new Error("A context attachment is invalid. Remove it and attach it again.");
    if (seenIds.has(item.id)) throw new Error("Each context attachment needs a unique identity.");
    seenIds.add(item.id);
    if (!new Set(["scenario", "feature", "category", "flow", "file", "run", "note", "upload"]).has(item.kind))
      throw new Error("This type of context cannot be attached.");
    const ref = item.kind === "note" ? item.text : item.kind === "upload" ? item.title : item.ref;
    if (typeof ref !== "string" || !ref.trim() || ref.length > 4000)
      throw new Error("A context attachment is missing its reference or text.");
    if (item.kind === "note" && (typeof item.title !== "string" || item.title.length > 80))
      throw new Error("A context note title must be 80 characters or fewer.");
    const key = `${item.kind}:${item.kind === "note" || item.kind === "upload" ? item.id : ref}`;
    if (seen.has(key)) throw new Error("The same context is attached more than once.");
    seen.add(key);
  }
  return items;
}

const contextFileRoots = ["apps/tenants/tests/bdd", "apps/tenants/app/routes/_protected+"];
const contextFileExtensions = new Set([".feature", ".md", ".ts", ".tsx", ".js", ".mjs"]);

async function searchContextFiles(workspace, query) {
  if (typeof query !== "string" || query.trim().length < 2) return [];
  if (query.length > 160) throw new Error("Search context files with 160 characters or fewer.");
  const terms = query.toLowerCase().trim().split(/\s+/).slice(0, 6);
  const matches = [];
  const walk = async (directory) => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (matches.length >= 30) return;
      if (entry.name === "node_modules" || entry.name === ".features-gen" || entry.name.startsWith(".")) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) {
        const extension = entry.name.endsWith(".flows.md") ? ".md" : extname(entry.name);
        if (!contextFileExtensions.has(extension)) continue;
        const relativePath = relative(workspace, path).replaceAll("\\", "/");
        const normalized = relativePath.toLowerCase();
        if (terms.every((term) => normalized.includes(term))) matches.push(relativePath);
      }
    }
  };
  for (const rootPath of contextFileRoots) await walk(join(workspace, rootPath));
  return matches.sort((a, b) => a.localeCompare(b)).slice(0, 30);
}

export async function workspaceDiff(workspace, baseline = "HEAD") {
  const options = { cwd: workspace, maxBuffer: 2 * 1024 * 1024, timeout: 30000 };
  const tracked = await execFileAsync(
    "git",
    ["diff", "--binary", "--no-ext-diff", "--no-textconv", "--no-color", baseline, "--"],
    options,
  );
  const others = await execFileAsync("git", ["ls-files", "--others", "--exclude-standard", "-z"], options);
  let patch = tracked.stdout;
  if (Buffer.byteLength(patch) > 1048576) throw new Error("Changes are too large to display in the agent panel.");
  for (const file of others.stdout.split("\0").filter(Boolean)) {
    const absolute = resolve(workspace, file);
    const rel = relative(workspace, absolute);
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Cannot review a file outside the workspace.");
    const info = await lstat(absolute);
    if (!info.isFile() || info.size > 262144)
      throw new Error("A new file is too large or cannot be reviewed as a regular file.");
    try {
      await execFileAsync(
        "git",
        ["diff", "--no-index", "--binary", "--no-ext-diff", "--no-textconv", "--no-color", "--", "/dev/null", file],
        options,
      );
    } catch (cause) {
      if (cause.code !== 1) throw cause;
      patch += cause.stdout;
    }
    if (Buffer.byteLength(patch) > 1048576) throw new Error("Changes are too large to display in the agent panel.");
  }
  return patch
    .split(/(?=^diff --git )/m)
    .filter(Boolean)
    .sort()
    .join("");
}

export async function scenarioChanges(workspace, baseline = "HEAD") {
  const options = { cwd: workspace, maxBuffer: 2 * 1024 * 1024, timeout: 30000 };
  const tracked = await execFileAsync("git", ["diff", "--name-only", "-z", baseline, "--"], options);
  const untracked = await execFileAsync("git", ["ls-files", "--others", "--exclude-standard", "-z"], options);
  const paths = [...new Set(`${tracked.stdout}\0${untracked.stdout}`.split("\0").filter(Boolean))].sort();
  const featureFiles = paths.filter(
    (file) =>
      file.startsWith("apps/tenants/tests/bdd/features/") && (file.endsWith(".feature") || file.endsWith(".flows.md")),
  );
  const hasImplementation = paths.some(
    (file) => file.startsWith("apps/tenants/tests/bdd/") && !file.startsWith("apps/tenants/tests/bdd/features/"),
  );
  if (!featureFiles.length) return { scenarioDigest: undefined, hasImplementation };
  const hash = createHash("sha256");
  const preview = [];
  for (const file of featureFiles) {
    const absolute = resolve(workspace, file);
    const rel = relative(workspace, absolute);
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Cannot review a file outside the workspace.");
    hash.update(`${file}\0`);
    try {
      const info = await lstat(absolute);
      if (!info.isFile() || info.size > 262144) throw new Error("A scenario file cannot be reviewed.");
      const contents = await readFile(absolute);
      hash.update(contents);
      if (file.endsWith(".feature")) {
        const relativeFeature = file.slice("apps/tenants/tests/bdd/features/".length);
        preview.push({
          file: relativeFeature,
          scenarios: parseFeature(contents.toString("utf8"), relativeFeature).map(({ id, title, steps, line }) => ({
            id,
            title,
            steps,
            line,
          })),
        });
      }
    } catch (cause) {
      if (cause.code !== "ENOENT") throw cause;
      hash.update("[deleted]");
      if (file.endsWith(".feature"))
        preview.push({ file: file.slice("apps/tenants/tests/bdd/features/".length), deleted: true, scenarios: [] });
    }
    hash.update("\0");
  }
  return { scenarioDigest: hash.digest("hex"), hasImplementation, preview };
}

function command() {
  if (process.platform !== "win32") return { file: "codex", args: ["app-server"] };
  const paths = execFileSync("where.exe", ["codex.cmd"], { encoding: "utf8" }).trim().split(/\r?\n/);
  const script = join(dirname(paths[0]), "node_modules", "@openai", "codex", "bin", "codex.js");
  if (!existsSync(script)) throw new Error("Codex installation could not be found.");
  return { file: process.execPath, args: [script, "app-server"] };
}

export function linkWorkspaceDependencies(workspace) {
  const created = [];
  const mappings = [
    [join(root, "node_modules"), join(workspace, "node_modules")],
    [join(root, "apps/tenants/node_modules"), join(workspace, "apps/tenants/node_modules")],
    [
      join(root, "packages/internal/test-utils/node_modules"),
      join(workspace, "packages/internal/test-utils/node_modules"),
    ],
  ];
  for (const [target, link] of mappings) {
    if (!existsSync(target) || existsSync(link)) continue;
    mkdirSync(dirname(link), { recursive: true });
    try {
      symlinkSync(target, link, process.platform === "win32" ? "junction" : "dir");
      created.push(link);
    } catch {
      throw new Error("Could not link installed project dependencies to the QA-agent workspace.");
    }
  }
  return created;
}

export function createSession({
  prepareWorkspace,
  spawnProcess = spawn,
  resolveCommand = command,
  stateFile = sessionFile,
  publish = publishDraft,
} = {}) {
  let child,
    threadId,
    turnId,
    ready = false,
    busy = false,
    generation = 0,
    resetVersion = 0,
    nextId = 1;
  let workspace,
    baseCommit,
    baseBranch,
    expectedHead,
    branch,
    taskId,
    approvalRequest,
    approvedScenarioDigest,
    requestedSkill,
    model,
    effort;
  let explorationBrowser, explorationIdentity, draftRunner, draftRunDigest;
  let draftStarting = false;
  let committing = false;
  let messages = [],
    history = [],
    error = "";
  let userRequest;
  let defaultModel, defaultModelPromise, models;
  const pending = new Map();
  const snapshot = () => ({
    messages,
    history,
    taskId,
    busy: busy || committing || draftStarting,
    error,
    mode: "workspace-write",
    userRequest,
    approvalRequest,
    baseCommit,
    branch,
    requestedSkill,
    model,
    effort,
    canCancel: busy,
  });
  let saveTimer;
  try {
    const saved = JSON.parse(readFileSync(stateFile, "utf8"));
    if (Array.isArray(saved.history)) history = saved.history;
    const savedPath = resolve(saved.workspace || "");
    const tempRelative = relative(resolve(tmpdir()), savedPath);
    const workspaceRelative = relative(agentWorkspaces, savedPath);
    const validWorkspacePath =
      (tempRelative &&
        !tempRelative.startsWith("..") &&
        !isAbsolute(tempRelative) &&
        tempRelative.startsWith("automation-agent-")) ||
      (workspaceRelative && !workspaceRelative.startsWith("..") && !isAbsolute(workspaceRelative));
    if (
      validWorkspacePath &&
      existsSync(savedPath) &&
      (saved.threadId === undefined || typeof saved.threadId === "string") &&
      (saved.branch === undefined || typeof saved.branch === "string") &&
      typeof saved.baseCommit === "string" &&
      Array.isArray(saved.messages)
    ) {
      workspace = savedPath;
      threadId = saved.threadId;
      branch = saved.branch;
      taskId = saved.taskId || randomUUID();
      baseCommit = saved.baseCommit;
      if (typeof saved.baseBranch === "string") baseBranch = saved.baseBranch;
      expectedHead = saved.expectedHead || saved.baseCommit;
      messages = saved.messages;
      approvedScenarioDigest = saved.approvedScenarioDigest;
      if (skills.has(saved.requestedSkill)) requestedSkill = saved.requestedSkill;
      if (typeof saved.model === "string") model = saved.model;
      if (typeof saved.effort === "string") effort = saved.effort;
      if (!threadId) {
        error =
          "The workspace was created, but the agent did not start. Send a message to retry in the retained workspace.";
      } else if (saved.busy) {
        error = saved.pendingRequest
          ? `The previous turn was interrupted while awaiting ${saved.pendingRequest === "question" ? "an answer" : "permission"}. The request cannot be resumed; send a message to ask for it again.`
          : "The previous turn was interrupted by a server restart. Send a message to continue.";
      } else if (typeof saved.error === "string") {
        error = saved.error;
      }
    }
  } catch {
    // No usable previous session.
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    try {
      mkdirSync(dirname(stateFile), { recursive: true });
      const temporary = `${stateFile}.tmp`;
      writeFileSync(
        temporary,
        JSON.stringify({
          workspace,
          threadId,
          branch,
          taskId,
          baseCommit,
          baseBranch,
          expectedHead,
          messages,
          history,
          busy,
          error,
          pendingRequest: userRequest ? "question" : approvalRequest ? "permission" : undefined,
          approvedScenarioDigest,
          requestedSkill,
          model,
          effort,
        }),
        {
          mode: 0o600,
        },
      );
      renameSync(temporary, stateFile);
      return true;
    } catch {
      error = "Could not save this conversation for restart. The current workspace is retained.";
      return false;
    }
  }
  function scheduleSave() {
    if (!saveTimer) saveTimer = setTimeout(save, 500);
  }

  function call(method, params) {
    return new Promise((resolveCall, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error("Codex did not respond in time."));
      }, 30000);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolveCall(value);
        },
        reject: (reason) => {
          clearTimeout(timer);
          reject(reason);
        },
      });
      child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }

  function readModels() {
    const executable = resolveCommand();
    const modelProcess = spawnProcess(executable.file, executable.args, {
      cwd: root,
      stdio: ["pipe", "pipe", "ignore"],
    });
    const lines = createInterface({ input: modelProcess.stdout });
    return new Promise((resolveModel, rejectModel) => {
      let complete = false;
      const finish = (cause, value) => {
        if (complete) return;
        complete = true;
        clearTimeout(timer);
        lines.close();
        modelProcess.kill();
        if (cause) rejectModel(cause);
        else resolveModel(value);
      };
      const timer = setTimeout(() => finish(new Error("Codex did not return its model list.")), 10000);
      lines.on("line", (line) => {
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }
        if (event.id === 1) {
          if (event.error) {
            finish(new Error(event.error.message));
            return;
          }
          modelProcess.stdin.write(`${JSON.stringify({ method: "initialized", params: {} })}\n`);
          modelProcess.stdin.write(`${JSON.stringify({ id: 2, method: "model/list", params: { limit: 100 } })}\n`);
        } else if (event.id === 2) {
          if (event.error) {
            finish(new Error(event.error.message));
            return;
          }
          const modelList = event.result?.data;
          const resultModels = Array.isArray(modelList)
            ? modelList
                .filter((entry) => typeof entry.model === "string" && entry.hidden !== true)
                .map((entry) => ({
                  id: entry.model,
                  name: typeof entry.displayName === "string" ? entry.displayName : entry.model,
                  isDefault: entry.isDefault === true,
                  efforts: Array.isArray(entry.supportedReasoningEfforts)
                    ? entry.supportedReasoningEfforts
                        .map((item) => item.reasoningEffort)
                        .filter((value) => typeof value === "string")
                    : [],
                  defaultEffort:
                    typeof entry.defaultReasoningEffort === "string" ? entry.defaultReasoningEffort : undefined,
                }))
            : [];
          const defaultEntry = resultModels.find((entry) => entry.isDefault);
          const resultDefaultModel = defaultEntry?.id;
          if (!resultModels.length || typeof resultDefaultModel !== "string") {
            finish(new Error("Codex did not identify a default model."));
            return;
          }
          finish(undefined, { models: resultModels, defaultModel: resultDefaultModel });
        }
      });
      modelProcess.once("error", (cause) => finish(cause));
      modelProcess.once("exit", () => {
        if (!complete) finish(new Error("Codex stopped before returning its default model."));
      });
      modelProcess.stdin.write(
        `${JSON.stringify({
          id: 1,
          method: "initialize",
          params: {
            clientInfo: { name: "automation", title: "Automation", version: "0.1.0" },
            capabilities: { experimentalApi: true },
          },
        })}\n`,
      );
    });
  }

  async function getModels() {
    if (defaultModel && models) return models;
    if (!defaultModelPromise) {
      defaultModelPromise = readModels()
        .then((value) => {
          models = value.models;
          defaultModel = value.defaultModel;
          return models;
        })
        .finally(() => {
          defaultModelPromise = undefined;
        });
    }
    return defaultModelPromise;
  }

  async function getModel() {
    await getModels();
    if (!models.some((entry) => entry.id === model)) model = defaultModel;
    const selected = models.find((entry) => entry.id === model);
    if (!selected.efforts.includes(effort)) effort = selected.defaultEffort;
    return model;
  }

  async function setModel(value) {
    if (busy || committing) throw new Error("Wait for the current operation before changing the model.");
    if (typeof value !== "string") throw new Error("Choose a model from the available list.");
    await getModels();
    if (!models.some((entry) => entry.id === value)) throw new Error("That model is not available in Codex.");
    model = value;
    effort = models.find((entry) => entry.id === value).defaultEffort;
    save();
    return snapshot();
  }

  async function setEffort(value) {
    if (busy || committing) throw new Error("Wait for the current operation before changing the effort.");
    if (typeof value !== "string") throw new Error("Choose a reasoning effort from the available list.");
    await getModel();
    const selected = models.find((entry) => entry.id === model);
    if (!selected.efforts.includes(value)) throw new Error("That reasoning effort is not available for this model.");
    effort = value;
    save();
    return snapshot();
  }

  async function ensureWorkspace(current = generation) {
    if (!workspace) {
      if (prepareWorkspace) {
        const prepared = await prepareWorkspace();
        if (current !== generation) throw new Error("Session was reset while preparing the workspace.");
        workspace = prepared.workspace;
        branch = prepared.branch;
        baseCommit = prepared.baseCommit;
        baseBranch = prepared.baseBranch;
        expectedHead = prepared.baseCommit;
      } else {
        let head;
        try {
          head = await execFileAsync("git", ["rev-parse", "--verify", "HEAD^{commit}"], {
            cwd: root,
            timeout: 30000,
          });
        } catch {
          throw new Error("The destination repository needs a committed HEAD before starting a QA session.");
        }
        const currentBranch = await execFileAsync("git", ["branch", "--show-current"], {
          cwd: root,
          timeout: 30000,
        });
        mkdirSync(agentWorkspaces, { recursive: true });
        const folder = await mkdtemp(join(agentWorkspaces, "automation-agent-"));
        const candidate = join(folder, "workspace");
        await execFileAsync("git", ["worktree", "add", "--detach", candidate, head.stdout.trim()], {
          cwd: root,
          timeout: 120000,
        });
        if (current !== generation) throw new Error("Session was reset while preparing the workspace.");
        workspace = candidate;
        branch = undefined;
        baseCommit = head.stdout.trim();
        baseBranch = currentBranch.stdout.trim() || undefined;
        expectedHead = baseCommit;
      }
    }
    if (current !== generation) throw new Error("Session was reset while preparing the workspace.");
    taskId ||= randomUUID();
    linkWorkspaceDependencies(workspace);
    save();
  }

  async function start() {
    if (child && threadId && ready) return;
    const current = ++generation;
    const resumeId = threadId;
    await ensureWorkspace(current);
    // Preserve the workspace even if starting Codex or creating its thread fails.
    const executable = resolveCommand();
    child = spawnProcess(executable.file, executable.args, { cwd: workspace, stdio: ["pipe", "pipe", "pipe"] });
    // stderr can contain local paths and other sensitive diagnostics; drain without forwarding it.
    child.stderr.resume();
    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      if (current !== generation) return;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        return;
      }
      if (event.id != null && event.method) {
        if (event.method === "item/tool/requestUserInput" && event.params?.threadId === threadId && !userRequest) {
          userRequest = { id: event.id, questions: event.params.questions };
          for (const question of userRequest.questions) {
            const options = question.options?.map(
              (option) => `${option.label}${option.description ? ` — ${option.description}` : ""}`,
            );
            messages.push({
              id: randomUUID(),
              role: "assistant",
              text: [question.question, ...(options || [])].join("\n"),
            });
          }
          save();
          return;
        }
        if (
          ["item/commandExecution/requestApproval", "item/fileChange/requestApproval"].includes(event.method) &&
          event.params?.threadId === threadId &&
          !approvalRequest
        ) {
          approvalRequest = {
            id: event.id,
            kind: event.method === "item/commandExecution/requestApproval" ? "command" : "file",
            reason: event.params.reason ?? "",
            command: event.params.command ?? "",
          };
          save();
          return;
        }
        child.stdin.write(
          `${JSON.stringify({ id: event.id, error: { code: -32601, message: "Interactive tool requests are unavailable; ask in the chat instead." } })}\n`,
        );
        return;
      }
      if (event.id != null) {
        const request = pending.get(event.id);
        if (!request) return;
        pending.delete(event.id);
        if (event.error) request.reject(new Error(event.error.message));
        else request.resolve(event.result);
        return;
      }
      if (event.params?.threadId && event.params.threadId !== threadId) return;
      if (event.method === "serverRequest/resolved" && event.params.requestId === userRequest?.id) {
        userRequest = undefined;
        save();
      }
      if (event.method === "serverRequest/resolved" && event.params.requestId === approvalRequest?.id) {
        approvalRequest = undefined;
        save();
      }
      if (event.method === "item/agentMessage/delta") {
        const last = messages.at(-1);
        if (last?.role === "assistant" && last.itemId === event.params.itemId) last.text += event.params.delta;
        else
          messages.push({ id: randomUUID(), role: "assistant", text: event.params.delta, itemId: event.params.itemId });
        scheduleSave();
      }
      if (event.method === "turn/completed") {
        busy = false;
        turnId = undefined;
        userRequest = undefined;
        approvalRequest = undefined;
        if (event.params.turn?.status === "interrupted") {
          messages.push({ id: randomUUID(), role: "assistant", text: "Agent work was stopped." });
        } else if (event.params.turn?.status !== "completed") error = "Agent turn did not complete. Please try again.";
        save();
      }
    });
    const fail = () => {
      if (current !== generation) return;
      generation++;
      const interruptedRequest = userRequest ? "an answer" : approvalRequest ? "permission" : undefined;
      child = undefined;
      ready = false;
      busy = false;
      userRequest = undefined;
      approvalRequest = undefined;
      error = interruptedRequest
        ? `Codex stopped while awaiting ${interruptedRequest}. The request cannot be resumed; send a message to ask for it again.`
        : "Codex stopped. Check that Codex is installed and signed in, then send a message to resume this conversation.";
      for (const request of pending.values()) request.reject(new Error(error));
      pending.clear();
      save();
    };
    child.on("error", fail);
    child.on("exit", fail);
    await call("initialize", {
      clientInfo: { name: "automation", title: "Automation", version: "0.1.0" },
      capabilities: { experimentalApi: true },
    });
    child.stdin.write(`${JSON.stringify({ method: "initialized", params: {} })}\n`);
    const result = resumeId
      ? await call("thread/resume", {
          threadId: resumeId,
          cwd: workspace,
          sandbox: "workspace-write",
          approvalPolicy: "on-request",
        })
      : await call("thread/start", { cwd: workspace, sandbox: "workspace-write", approvalPolicy: "on-request" });
    threadId = result.thread.id;
    model ??= typeof result.thread.model === "string" ? result.thread.model : undefined;
    ready = true;
    save();
  }

  function decideApproval(requestId, decision) {
    if (!child || !approvalRequest || String(approvalRequest.id) !== String(requestId))
      throw new Error("This approval is no longer pending.");
    if (!["accept", "decline"].includes(decision)) throw new Error("Invalid approval decision.");
    child.stdin.write(`${JSON.stringify({ id: approvalRequest.id, result: { decision } })}\n`);
    approvalRequest = undefined;
    save();
  }

  async function draft() {
    if (!workspace || !baseCommit) return [];
    await verifyHead();
    return draftScenarios(workspace, baseCommit);
  }

  async function diff() {
    if (!workspace) return { patch: "", branch, baseCommit };
    if (busy || committing) throw new Error("Wait for the current operation to stop before reviewing changes.");
    await verifyHead();
    const patch = await workspaceDiff(workspace, baseCommit);
    const digest = createHash("sha256").update(patch).digest("hex");
    const changes = await scenarioChanges(workspace, baseCommit);
    return {
      patch,
      digest,
      branch,
      baseCommit,
      ...changes,
      scenarioApproved: Boolean(changes.scenarioDigest && changes.scenarioDigest === approvedScenarioDigest),
    };
  }

  async function verifyHead() {
    const head = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: workspace, timeout: 30000 });
    if (head.stdout.trim() !== expectedHead)
      throw new Error("The workspace commit changed outside the review flow. Inspect the branch before continuing.");
    const currentBranch = await execFileAsync("git", ["branch", "--show-current"], { cwd: workspace, timeout: 30000 });
    if (currentBranch.stdout.trim() !== (branch || ""))
      throw new Error("The workspace branch changed outside the review flow. Inspect the worktree before continuing.");
  }

  async function approveScenarios(digest) {
    if (!workspace || busy || committing) throw new Error("The workspace is unavailable or busy.");
    committing = true;
    try {
      await verifyHead();
      const patch = await workspaceDiff(workspace, baseCommit);
      if (!patch || createHash("sha256").update(patch).digest("hex") !== digest)
        throw new Error("Changes have changed since review. Review them again.");
      const changes = await scenarioChanges(workspace, baseCommit);
      if (!changes.scenarioDigest) throw new Error("There are no scenario changes to approve.");
      const pendingChanges = await scenarioChanges(workspace);
      if (pendingChanges.hasImplementation && changes.scenarioDigest !== approvedScenarioDigest)
        throw new Error(
          "Review is blocked because the workspace already contains E2E implementation changes. Preserve those changes separately and remove them from this draft before approving the scenario changes.",
        );
      const confirmed = await workspaceDiff(workspace, baseCommit);
      if (createHash("sha256").update(confirmed).digest("hex") !== digest)
        throw new Error("Changes have changed since review. Review them again.");
      approvedScenarioDigest = changes.scenarioDigest;
      messages.push({
        id: randomUUID(),
        role: "user",
        text: "I approve the reviewed scenario changes in this workspace.",
      });
      save();
    } finally {
      committing = false;
    }
  }

  async function commitChanges(message, digest) {
    if (!workspace || busy || committing) throw new Error("The workspace is unavailable or busy.");
    if (typeof message !== "string" || !message.trim() || message.length > 200 || /[\r\n]/.test(message))
      throw new Error("Enter a commit message of up to 200 characters.");
    if (typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest))
      throw new Error("Review the changes before committing.");
    committing = true;
    try {
      await verifyHead();
      const before = await workspaceDiff(workspace, baseCommit);
      if (!before || createHash("sha256").update(before).digest("hex") !== digest)
        throw new Error("Changes have changed since review. Review them again.");
      const changes = await scenarioChanges(workspace, baseCommit);
      if (changes.scenarioDigest && changes.scenarioDigest !== approvedScenarioDigest)
        throw new Error("Review and approve the scenario changes before committing.");
      const options = { cwd: workspace, maxBuffer: 2 * 1024 * 1024, timeout: 60000 };
      if (!branch) {
        const branchName = `automation/agent-${randomUUID()}`;
        await execFileAsync("git", ["switch", "-c", branchName], options);
        branch = branchName;
        save();
      }
      await execFileAsync("git", ["add", "--all", "--"], options);
      const after = await workspaceDiff(workspace, baseCommit);
      if (createHash("sha256").update(after).digest("hex") !== digest)
        throw new Error("Changes have changed since review. Review them again.");
      await execFileAsync("git", ["diff", "--quiet", "--"], options);
      await execFileAsync("git", ["commit", "-m", message.trim()], options);
      const head = await execFileAsync("git", ["rev-parse", "HEAD"], options);
      expectedHead = head.stdout.trim();
      messages.push({
        id: randomUUID(),
        role: "assistant",
        text: `Committed reviewed changes on ${branch} (${head.stdout.trim().slice(0, 12)}).`,
      });
      save();
      return { commit: head.stdout.trim(), branch };
    } catch (cause) {
      if (
        cause.message?.startsWith("Changes have") ||
        cause.message?.startsWith("Review and approve") ||
        cause.message?.startsWith("The workspace")
      )
        throw cause;
      throw new Error(
        "Could not commit changes. Check Git identity, commit signing, and repository hooks in the workspace.",
        { cause },
      );
    } finally {
      committing = false;
    }
  }

  async function runDraft(input, environment, variables) {
    if (!workspace || busy || committing || draftStarting)
      throw new Error("The draft workspace is unavailable or busy.");
    if (draftRunner) throw new Error("Save or discard the previous draft run evidence before starting another run.");
    if (!environment || input?.safetyAcknowledged !== true)
      throw new Error("Confirm the target and E2E-owned data for this scenario before running.");
    if (
      !variables ||
      typeof variables.E2E_USERNAME !== "string" ||
      !variables.E2E_USERNAME.trim() ||
      typeof variables.E2E_PASSWORD !== "string" ||
      !variables.E2E_PASSWORD.trim()
    )
      throw new Error("Set E2E username and password in Variables before running.");
    draftStarting = true;
    try {
      await verifyHead();
      const patch = await workspaceDiff(workspace, baseCommit);
      const digest = createHash("sha256").update(patch).digest("hex");
      if (!patch || digest !== input.digest) throw new Error("Changes have changed since review. Review them again.");
      const changes = await scenarioChanges(workspace, baseCommit);
      if (changes.scenarioDigest && changes.scenarioDigest !== approvedScenarioDigest)
        throw new Error("Review and approve the scenario changes before running the draft.");
      const scenarios = await draftScenarios(workspace, baseCommit);
      const selected = scenarios.filter((item) => item.after?.id === input.scenarioId && item.kind !== "deleted");
      if (selected.length !== 1) throw new Error("Select a unique, changed draft scenario to run.");
      const run = await createDraftRun({
        workspace,
        baseCommit,
        patch,
        scenarioId: input.scenarioId,
        target: environment.target,
        variables: { E2E_USERNAME: variables.E2E_USERNAME, E2E_PASSWORD: variables.E2E_PASSWORD },
        linkDependencies: linkWorkspaceDependencies,
      });
      draftRunner = run;
      draftRunDigest = digest;
      return draftRun();
    } finally {
      draftStarting = false;
    }
  }
  function draftRun() {
    const run = draftRunner?.publicRun();
    return run ? { ...run, taskId, digest: draftRunDigest } : null;
  }
  function draftEvidenceService() {
    return draftRunner;
  }
  function cancelDraftRun() {
    if (!draftRunner?.active()) throw new Error("No draft run is active.");
    return draftRunner.cancel();
  }
  function discardDraftRun() {
    if (!draftRunner) return;
    draftRunner.dispose();
    draftRunner = undefined;
    draftRunDigest = undefined;
  }

  async function finalize(message, digest) {
    if (!workspace || busy || committing || draftStarting || draftRunner)
      throw new Error("Save or discard the draft run evidence before finalizing.");
    if (typeof message !== "string" || !message.trim() || message.length > 200 || /[\r\n]/.test(message))
      throw new Error("Enter a title of up to 200 characters.");
    const review = await diff();
    if (!review.patch || review.digest !== digest)
      throw new Error("Changes have changed since review. Review them again.");
    if (review.scenarioDigest && !review.scenarioApproved)
      throw new Error("Review and approve the scenario changes before finalizing.");
    if (await workspaceDiff(workspace)) await commitChanges(message, digest);
    if (!branch || expectedHead === baseCommit) throw new Error("There are no committed changes to finalize.");
    committing = true;
    let result;
    try {
      await verifyHead();
      if (await workspaceDiff(workspace)) throw new Error("Changes have changed since review. Review them again.");
      result = await publish({ workspace, branch, baseBranch, title: message.trim() });
      if (!result || typeof result.url !== "string" || !Number.isInteger(result.number))
        throw new Error("The pull request could not be confirmed. Your draft is retained.");
      history.unshift({
        title: message.trim(),
        url: result.url,
        number: result.number,
        branch,
        taskId,
        baseCommit,
        commit: expectedHead,
        createdAt: new Date().toISOString(),
        status: "OPEN",
      });
      if (!save()) {
        history.shift();
        throw new Error(
          "The PR was created, but local history could not be saved. Your draft is retained; retry to record it.",
        );
      }
    } finally {
      committing = false;
    }
    await reset();
    return { pullRequest: result, session: snapshot() };
  }

  function answer(requestId, answers) {
    if (!child || !userRequest || String(userRequest.id) !== String(requestId))
      throw new Error("This question is no longer pending.");
    const result = validateAnswers(userRequest.questions, answers);
    child.stdin.write(`${JSON.stringify({ id: userRequest.id, result: { answers: result } })}\n`);
    for (const question of userRequest.questions) {
      messages.push({
        id: randomUUID(),
        role: "user",
        text: question.isSecret
          ? "[Secret withheld. Configure it in Automation Variables and tell QA Agent only the variable name.]"
          : answers[question.id].trim(),
      });
    }
    userRequest = undefined;
    save();
  }

  async function send(input, scenario, feature, contextItems = [], selectedSkill, environment, variables) {
    if (busy || committing || draftStarting)
      throw new Error("Wait for the current operation before sending another message.");
    if (typeof input !== "string" || !input.trim() || input.length > 8000)
      throw new Error("Enter a message of up to 8000 characters.");
    const match = input.trim().match(/^\/([\w-]+)(?:\s|$)/);
    const skill = match?.[1] ?? selectedSkill ?? requestedSkill ?? "ask-qa";
    if (!skills.has(skill)) throw new Error("Unknown skill. Use /ask-qa, /write-e2e-scenarios, or /write-e2e-code.");
    if (!existsSync(join(root, ".agents", "skills", skill, "SKILL.md")))
      throw new Error("The selected QA skill is unavailable.");
    busy = true;
    const version = resetVersion;
    error = "";
    const userMessage = {
      id: randomUUID(),
      role: "user",
      text: input.replace(/^\/[\w-]+\s*/, ""),
      skill,
    };
    messages.push(userMessage);
    save();
    try {
      await start();
      await verifyHead();
      const workspaceSkillPath = join(workspace, ".agents", "skills", skill, "SKILL.md");
      const skillPath = existsSync(workspaceSkillPath)
        ? workspaceSkillPath
        : join(root, ".agents", "skills", skill, "SKILL.md");
      let context = "";
      let imageInputs = [];
      if (scenario != null || feature != null || contextItems.length) {
        const catalog = automationCatalog(join(workspace, "apps/tenants/tests/bdd/features"));
        context =
          scenario != null
            ? `\nSelected scenario context: ${JSON.stringify(selectScenarioContext(catalog, scenario))}`
            : feature != null
              ? `\nSelected feature context: ${JSON.stringify(selectFeatureContext(catalog, feature))}`
              : "";
        const resolvedAttachments = await resolveContextItems(contextItems, catalog);
        imageInputs = resolvedAttachments
          .filter((attachment) => attachment.image)
          .map((attachment) => ({ type: "image", url: attachment.image }));
        if (resolvedAttachments.length) {
          userMessage.contexts = resolvedAttachments.map(({ id, kind, label, source }) => ({
            id,
            kind,
            label,
            source,
          }));
          context += `\n\nAttached QA context:\n${resolvedAttachments
            .map((attachment) => `### ${attachment.label}\nSource: ${attachment.source}\n${attachment.content}`)
            .join("\n\n")}`;
        }
      }
      if (skill === "write-e2e-scenarios" && environment && variables?.E2E_USERNAME && variables?.E2E_PASSWORD) {
        const identity = createHash("sha256")
          .update(JSON.stringify([environment.target, variables.E2E_USERNAME, variables.E2E_PASSWORD]))
          .digest("hex");
        if (identity !== explorationIdentity) {
          if (explorationBrowser) await closeExplorationBrowser(workspace, explorationBrowser);
          explorationBrowser = undefined;
          explorationIdentity = undefined;
          const browserName = await startExplorationBrowser({ workspace, target: environment.target, variables });
          if (version !== resetVersion) {
            await closeExplorationBrowser(workspace, browserName);
            throw new Error("Session reset.");
          }
          explorationBrowser = browserName;
          explorationIdentity = identity;
        }
        context += `\nAn authenticated playwright-cli session is ready: ${explorationBrowser}. Use playwright-cli -s=${explorationBrowser} for exploration; do not open a new session or log in again. Verify the session is authenticated and report a failure if it has expired.`;
      }
      if (skill === "write-e2e-scenarios" && (!environment || !variables?.E2E_USERNAME || !variables?.E2E_PASSWORD))
        context +=
          "\nThe exploration browser has not been authenticated. Ask the user to select an environment and set E2E_USERNAME and E2E_PASSWORD in Variables, then send a follow-up; never request their values in chat.";
      const currentScenarios = await scenarioChanges(workspace, baseCommit);
      const hasApprovedScenarios =
        currentScenarios.scenarioDigest && currentScenarios.scenarioDigest === approvedScenarioDigest;
      if (skill === "write-e2e-code" && currentScenarios.scenarioDigest && !hasApprovedScenarios)
        throw new Error("Review and approve the scenario changes before implementing them.");
      const started = await call("turn/start", {
        threadId,
        model: model || undefined,
        effort: effort || undefined,
        sandboxPolicy: {
          type: "workspaceWrite",
          writableRoots: [workspace],
          networkAccess: true,
          excludeTmpdirEnvVar: false,
          excludeSlashTmp: false,
        },
        input: [
          {
            type: "text",
            text: `$${skill} ${input.replace(/^\/[\w-]+\s*/, "")}\nWork only in this session's workspace. Follow the QA skills, including interviews, review gates, data safety and batch boundaries. Resolve technical scope from the request and repository before asking; do not ask for details already clear. When an answer is needed, use the available user-input tool if permitted, with the actual question, numbered options and recommendation as required by the skill. Otherwise present the complete question and options in chat and wait for the next reply. Never merely say you are awaiting an answer. Never run BDD tests from a shell command or make live browser mutations other than authentication. Do not claim that draft scenarios or code have passed; report verification as not run unless there is actual runner evidence. Never ask for or include passwords, tokens or other credentials in chat, files, command arguments or logs. Do not commit, push, or modify files outside this workspace.${hasApprovedScenarios ? " The user approved the current snapshot of scenario changes in the review panel; preserve the scope of that approval." : currentScenarios.scenarioDigest ? " The current scenario changes have not been approved in the review panel. Do not implement those changes until they are approved." : ""}${
              environment
                ? `
Selected browser environment: ${JSON.stringify(environment)}. Use this target for exploration.`
                : ""
            }${context}`,
          },
          ...imageInputs,
          { type: "skill", name: skill, path: skillPath },
        ],
      });
      if (busy) turnId = started.turn.id;
      requestedSkill = skill;
      save();
    } catch (cause) {
      if (version !== resetVersion) throw new Error("Session reset.", { cause });
      busy = false;
      if (child && !ready) {
        generation++;
        child.kill();
        child = undefined;
        for (const request of pending.values()) request.reject(new Error("Agent startup failed."));
        pending.clear();
      }
      error =
        cause.message?.startsWith("The destination repository needs a committed HEAD") ||
        cause.message?.startsWith("Could not start the exploration") ||
        cause.message?.startsWith("Set the E2E") ||
        cause.message?.startsWith("The selected") ||
        cause.message?.startsWith("Review and approve") ||
        cause.message?.startsWith("Could not link installed") ||
        cause.message?.startsWith("The workspace") ||
        cause.message?.startsWith("Attach up to") ||
        cause.message?.startsWith("Attached files") ||
        cause.message?.startsWith("A context") ||
        cause.message?.startsWith("This type of context") ||
        cause.message?.startsWith("The same context") ||
        cause.message?.startsWith("The attached") ||
        cause.message?.startsWith("This feature") ||
        cause.message?.startsWith("This file")
          ? cause.message
          : "Unable to start the agent. Check that Codex and Git are installed and Codex is signed in.";
      save();
      throw new Error(error, { cause });
    }
  }

  function verifyHeadSync() {
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim();
    if (head !== expectedHead)
      throw new Error("The workspace commit changed outside the review flow. Inspect the branch first.");
    const currentBranch = execFileSync("git", ["branch", "--show-current"], {
      cwd: workspace,
      encoding: "utf8",
    }).trim();
    if (currentBranch !== (branch || ""))
      throw new Error("The workspace branch changed outside the review flow. Inspect the branch first.");
  }

  async function contextFiles(query) {
    await ensureWorkspace();
    verifyHeadSync();
    return searchContextFiles(workspace, query);
  }

  async function resolveContextItems(items, catalog) {
    const attachments = validateContextItems(items);
    if (
      attachments.reduce(
        (sum, item) => sum + (item.kind === "upload" && typeof item.data === "string" ? item.data.length : 0),
        0,
      ) > 10_666_672
    )
      throw new Error("Attached files exceed the 8 MB total limit.");
    const resolved = [];
    let totalBytes = 0;
    for (const item of attachments) {
      let content = "";
      let source = "";
      let label = "";
      let image;
      if (item.kind === "scenario") {
        const scenario = selectScenarioContext(catalog, item.value);
        label = `${scenario.id} · ${scenario.title}`;
        source = scenario.file;
        content = JSON.stringify(scenario, null, 2);
      } else if (item.kind === "feature") {
        const feature = selectFeatureContext(catalog, item.value);
        label = `${feature.module} · ${feature.title}`;
        source = feature.file;
        const featureScenarios = catalog.filter((scenario) => scenario.file === feature.file);
        content = JSON.stringify(
          {
            ...feature,
            scenarios: featureScenarios.map(({ id, title, steps, tags }) => ({ id, title, steps, tags })),
          },
          null,
          2,
        );
      } else if (item.kind === "category") {
        const categoryContext = selectCategoryContext(catalog, item.ref);
        label = `${categoryContext.category} ? ${categoryContext.file.replace(/\.feature$/, "")}`;
        source = categoryContext.file;
        content = JSON.stringify(categoryContext, null, 2);
      } else if (item.kind === "flow") {
        const feature = catalog.find((scenario) => scenario.file === item.ref && scenario.module === item.module);
        if (!feature) throw new Error("The attached feature is unavailable in this workspace.");
        const relativePath = `apps/tenants/tests/bdd/features/${feature.file.replace(/\.feature$/, ".flows.md")}`;
        const absolutePath = resolve(workspace, relativePath);
        const info = await lstat(absolutePath).catch(() => undefined);
        if (!info?.isFile() || info.isSymbolicLink()) throw new Error("This feature has no attachable flow registry.");
        content = await readFile(absolutePath, "utf8");
        source = relativePath;
        label = `Flow registry · ${feature.file.replace(/\.feature$/, "")}`;
      } else if (item.kind === "file") {
        const relativePath = item.ref.replaceAll("\\", "/");
        if (
          relativePath.startsWith("/") ||
          relativePath.split("/").some((part) => !part || part === "." || part === "..") ||
          /(?:^|\/)(?:\.env[^/]*|secrets?|credentials?|storage[-_.]?state|auth\.json)(?:\/|$)/i.test(relativePath)
        )
          throw new Error("This file is outside the attachable QA source files.");
        const allowed = contextFileRoots.some((rootPath) => relativePath.startsWith(`${rootPath}/`));
        if (!allowed) throw new Error("This file is outside the attachable QA source files.");
        const absolutePath = resolve(workspace, relativePath);
        const relativeCheck = relative(workspace, absolutePath);
        if (!relativeCheck || relativeCheck.startsWith("..") || isAbsolute(relativeCheck))
          throw new Error("This file is outside the agent workspace.");
        const info = await lstat(absolutePath).catch(() => undefined);
        if (!info?.isFile() || info.isSymbolicLink() || info.size > 32000)
          throw new Error("This file is unavailable or too large to attach (32 KB maximum).");
        const realWorkspace = await realpath(workspace);
        const realFile = await realpath(absolutePath);
        const realRelative = relative(realWorkspace, realFile);
        if (!realRelative || realRelative.startsWith("..") || isAbsolute(realRelative))
          throw new Error("This file is outside the agent workspace.");
        let insideAllowedRoot = false;
        for (const rootPath of contextFileRoots) {
          const realRoot = await realpath(join(workspace, rootPath)).catch(() => undefined);
          if (!realRoot) continue;
          const relativeToRoot = relative(realRoot, realFile);
          if (relativeToRoot && !relativeToRoot.startsWith("..") && !isAbsolute(relativeToRoot)) {
            insideAllowedRoot = true;
            break;
          }
        }
        if (!insideAllowedRoot) throw new Error("This file is outside the attachable QA source files.");
        if (!contextFileExtensions.has(extname(relativePath)))
          throw new Error("This file type cannot be attached as QA context.");
        content = await readFile(absolutePath, "utf8");
        source = relativePath;
        label = relativePath;
      } else if (item.kind === "upload") {
        const uploaded = await readUploadedAttachment(item);
        label = item.title;
        source = "User-uploaded file";
        content = uploaded.content;
        if (uploaded.image) image = uploaded.image;
      } else if (item.kind === "run") {
        const run = getCurrentRunSnapshot();
        if (!run || run.id !== item.ref || !run.done)
          throw new Error("The attached run result is unavailable or is no longer the latest completed run.");
        const outcomes = run.tests.map((test) => `${test.status}: ${test.title}`);
        const overallStatus = run.error ? (outcomes.length ? "failed (runner error)" : "blocked") : run.status;
        label = `Run result · ${run.scenarioId} · ${overallStatus}`;
        source = `${run.target} · ${run.scenarioId}`;
        content = [
          `Scenario: ${run.scenarioId}`,
          `Target: ${run.target}`,
          `Overall status: ${overallStatus}`,
          ...outcomes,
          run.error ? "Runner reported a setup or execution error; details are available in the local run panel." : "",
          outcomes.length ? "" : "No scenario result was produced; this is not a pass.",
        ]
          .filter(Boolean)
          .join("\n");
      } else {
        label = typeof item.title === "string" && item.title.trim() ? item.title.trim() : "User note";
        source = "User-provided context";
        content = item.text.trim();
      }
      totalBytes += Buffer.byteLength(content);
      if (totalBytes > 64000) throw new Error("Attached context is too large. Keep the combined context under 64 KB.");
      resolved.push({ id: item.id, kind: item.kind, label, source, content, image });
    }
    return resolved;
  }

  async function reset() {
    if (committing || draftStarting || draftRunner)
      throw new Error("Save or discard the draft run evidence before starting a new chat.");
    resetVersion++;
    generation++;
    if (workspace && explorationBrowser) await closeExplorationBrowser(workspace, explorationBrowser);
    explorationBrowser = undefined;
    explorationIdentity = undefined;
    child?.kill();
    child = undefined;
    threadId = undefined;
    turnId = undefined;
    model = undefined;
    effort = undefined;
    ready = false;
    workspace = undefined;
    taskId = undefined;
    baseCommit = undefined;
    expectedHead = undefined;
    branch = undefined;
    baseBranch = undefined;
    approvedScenarioDigest = undefined;
    requestedSkill = undefined;
    busy = false;
    userRequest = undefined;
    approvalRequest = undefined;
    messages = [];
    error = "";
    for (const request of pending.values()) request.reject(new Error("Session reset."));
    pending.clear();
    save();
  }
  async function cancel() {
    if (!busy) throw new Error("No agent turn is running.");
    if (threadId && turnId && child) {
      await call("turn/interrupt", { threadId, turnId });
      return;
    }
    resetVersion++;
    generation++;
    child?.kill();
    child = undefined;
    ready = false;
    busy = false;
    userRequest = undefined;
    approvalRequest = undefined;
    for (const request of pending.values()) request.reject(new Error("Turn cancelled."));
    pending.clear();
    messages.push({ id: randomUUID(), role: "assistant", text: "Agent work was stopped." });
    save();
  }
  return {
    send,
    snapshot,
    reset,
    answer,
    decideApproval,
    diff,
    draft,
    approveScenarios,
    commitChanges,
    finalize,
    runDraft,
    draftRun,
    draftEvidenceService,
    discardDraftRun,
    cancelDraftRun,
    cancel,
    contextFiles,
    getModel,
    getModels,
    setModel,
    setEffort,
  };
}

export const agentSession = createSession();
