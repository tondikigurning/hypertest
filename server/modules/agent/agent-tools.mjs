import { execFile } from "node:child_process";
import { lstat, mkdir, readdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { tool } from "ai";
import { z } from "zod";
import { agentSkillNames } from "./agent-skills.mjs";

const execFileAsync = promisify(execFile);
const blockedPath =
  /(?:^|\/)(?:\.env(?:\.[^/]*)?|\.npmrc|\.netrc|\.git-credentials|\.ssh|\.aws|\.kube|id_(?:rsa|ed25519)|[^/]*\.(?:pem|key|p12|pfx)|secrets?|credentials?|auth\.json|storage[-_.]?state|node_modules|\.git)(?:\/|$)/i;
const mutatingBrowserActions = new Set(["click", "fill", "press", "check", "uncheck", "select"]);

export async function safeWorkspacePath(workspace, input) {
  if (typeof input !== "string" || !input.trim() || input.length > 512)
    throw new Error("Choose a relative workspace file path.");
  const normalized = input.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if (
    normalized.startsWith("/") ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        /[. ]$/.test(segment) ||
        segment.includes(":") ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(segment),
    ) ||
    blockedPath.test(normalized)
  )
    throw new Error("This file is outside the agent's allowed workspace files.");
  const absolute = resolve(workspace, ...segments);
  const rel = relative(workspace, absolute);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("This path is outside the agent workspace.");
  const root = await realpath(workspace);
  let current = workspace;
  for (const segment of segments) {
    current = join(current, segment);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) throw new Error("Symbolic links cannot be used as agent file paths.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      break;
    }
  }
  const existingParent = await realpath(dirname(absolute)).catch(async () => {
    let parent = dirname(absolute);
    while (parent !== workspace && !(await lstat(parent).catch(() => undefined))) parent = dirname(parent);
    return realpath(parent);
  });
  const parentRelative = relative(root, existingParent);
  if (parentRelative.startsWith("..") || isAbsolute(parentRelative))
    throw new Error("This path is outside the agent workspace.");
  return absolute;
}

function redact(value, variables = {}) {
  let text = String(value);
  for (const secret of Object.values(variables)) {
    if (typeof secret === "string" && secret) text = text.replaceAll(secret, "[redacted]");
  }
  return text
    .replace(/(authorization\s*:\s*bearer\s+)[^\s"']+/gi, "$1[redacted]")
    .replace(/((?:password|passwd|token|secret|api[_-]?key)\s*[:=]\s*)[^&\s,"']+/gi, "$1[redacted]")
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/g,
      "[redacted credential]",
    );
}

async function listWorkspaceFiles(workspace, directory = "", output = []) {
  const absolute = directory ? await safeWorkspacePath(workspace, directory) : workspace;
  const entries = await readdir(absolute, { withFileTypes: true });
  for (const entry of entries) {
    if (output.length >= 400) return output;
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (blockedPath.test(path) || entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await listWorkspaceFiles(workspace, path, output);
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

async function readExistingForWrite(path) {
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.nlink > 1 || info.size > 262144)
      throw new Error("The existing file is unavailable or too large to replace.");
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

export function createAgentTools({
  workspace,
  requestUserInput,
  requestApproval,
  runBrowserCommand,
  getDiff,
  browserName,
  ensureBrowser,
  closeBrowser,
  target,
  scenarioId,
  variables,
  signal,
  runDraftScenario,
  onBrowserUse,
  authorizeFileWrite,
  onFileWritten,
  confirmFlows,
  useSkill,
}) {
  const pathSchema = z.object({ path: z.string().describe("Relative path inside this draft workspace.") });
  const agentTools = {
    ...(useSkill
      ? {
          use_skill: tool({
            description:
              "Activate a QA specialist workflow and load its complete instructions. Preserve scope and all review gates; this does not grant approval or start the next batch.",
            inputSchema: z.object({ skill: z.enum(agentSkillNames) }),
            execute: async ({ skill }) => useSkill(skill),
          }),
        }
      : {}),
    list_files: tool({
      description: "List source files available in this draft workspace. Secret files and dependencies are omitted.",
      inputSchema: z.object({ directory: z.string().optional().describe("Optional relative directory to list.") }),
      execute: async ({ directory }) => (await listWorkspaceFiles(workspace, directory || "")).slice(0, 400),
    }),
    read_file: tool({
      description:
        "Read a text file from the draft workspace. For large files, request a bounded page with startLine and lineCount. Secret files and dependency folders are blocked.",
      inputSchema: pathSchema.extend({
        startLine: z.number().int().min(1).optional().describe("First line to read, starting at 1."),
        lineCount: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("Number of lines, up to 500. Defaults to 200 when paging."),
      }),
      execute: async ({ path, startLine, lineCount }) => {
        const absolute = await safeWorkspacePath(workspace, path);
        const info = await lstat(absolute);
        if (!info.isFile() || info.nlink > 1 || info.size > 2 * 1024 * 1024)
          throw new Error("The file is unavailable or larger than 2 MB.");
        const content = await readFile(absolute, "utf8");
        if (startLine === undefined && lineCount === undefined && info.size <= 64000) return redact(content, variables);
        const lines = content.split(/\r?\n/);
        const first = startLine ?? 1;
        const selected = lines.slice(first - 1, first - 1 + (lineCount ?? 200));
        const page = selected.join("\n");
        if (Buffer.byteLength(page) > 64000) throw new Error("This page exceeds 64 KB. Request fewer lines.");
        return redact(`Lines ${first}-${first + selected.length - 1} of ${lines.length}\n${page}`, variables);
      },
    }),
    write_file: tool({
      description:
        "Create or replace a text file in the draft workspace. Changes remain in the private draft for review.",
      inputSchema: z.object({
        path: z.string().describe("Relative file path inside the draft workspace."),
        content: z.string().max(262144).describe("Complete UTF-8 file contents, up to 256 KB."),
      }),
      execute: async ({ path, content }) => {
        const absolute = await safeWorkspacePath(workspace, path);
        const before = await readExistingForWrite(absolute);
        await authorizeFileWrite?.(path, content);
        await safeWorkspacePath(workspace, path);
        await mkdir(dirname(absolute), { recursive: true });
        await safeWorkspacePath(workspace, path);
        if ((await readExistingForWrite(absolute)) !== before)
          throw new Error("The file changed while awaiting approval. Read the latest file and try again.");
        await writeFile(absolute, content, { encoding: "utf8", flag: "w", mode: 0o600 });
        await onFileWritten?.(path, content);
        return { path, bytesWritten: Buffer.byteLength(content) };
      },
    }),
    edit_file: tool({
      description: "Replace one exact text fragment in a draft file. The old text must occur exactly once.",
      inputSchema: z.object({
        path: z.string().describe("Relative file path inside the draft workspace."),
        oldText: z.string().min(1).max(32000),
        newText: z.string().max(32000),
      }),
      execute: async ({ path, oldText, newText }) => {
        const absolute = await safeWorkspacePath(workspace, path);
        const info = await lstat(absolute);
        if (!info.isFile() || info.nlink > 1 || info.size > 262144)
          throw new Error("The file is unavailable or too large to edit.");
        const content = await readFile(absolute, "utf8");
        const first = content.indexOf(oldText);
        if (first < 0 || content.indexOf(oldText, first + oldText.length) >= 0)
          throw new Error("The exact old text must occur once. Read the latest file and retry with a narrower edit.");
        const updated = content.slice(0, first) + newText + content.slice(first + oldText.length);
        await authorizeFileWrite?.(path, updated);
        await safeWorkspacePath(workspace, path);
        if ((await readFile(absolute, "utf8")) !== content)
          throw new Error("The file changed while awaiting approval. Read the latest file and try again.");
        await writeFile(absolute, updated, {
          encoding: "utf8",
          mode: 0o600,
        });
        await onFileWritten?.(path, updated);
        return { path, updated: true };
      },
    }),
    git_status: tool({
      description: "Show the current branch and changed-file summary for this draft.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await execFileAsync("git", ["status", "--short", "--branch"], {
          cwd: workspace,
          timeout: 10000,
          maxBuffer: 64000,
        });
        return result.stdout.slice(0, 12000);
      },
    }),
    show_diff: tool({
      description: "Show the current draft diff for the user to review. This does not approve or commit the changes.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await getDiff();
        return redact(result.patch, variables).slice(0, 48000) || "There are no workspace changes to display.";
      },
    }),
    ask_user: tool({
      description:
        "Ask one focused question and wait for the user's answer before continuing. Include numbered choices when useful, exactly one recommended choice with its reason, and allow free text.",
      inputSchema: z.object({
        question: z.string().min(1).max(1600),
        options: z
          .array(
            z.object({ label: z.string().min(1).max(160), description: z.string().max(400), recommended: z.boolean() }),
          )
          .max(6)
          .default([]),
        isSecret: z.boolean().default(false),
      }),
      execute: async ({ question, options, isSecret }) => {
        if (options.length && options.filter((option) => option.recommended).length !== 1)
          throw new Error("Choose exactly one recommended option, or ask an open question without options.");
        return requestUserInput(question, options, isSecret, signal);
      },
    }),
    ...(confirmFlows
      ? {
          confirm_flows: tool({
            description:
              "Present discovered business flows for explicit confirmation before writing scenarios. Supply the target feature path, a matching reviewed PRD path, and flow IDs without the @flow: prefix with descriptions. For an existing scenario without a flow tag, use '(no flow tag)'. This does not approve scenarios or live-data actions.",
            inputSchema: z.object({
              featurePath: z.string().min(1).max(512),
              prdPath: z.string().min(1).max(512),
              flows: z
                .array(z.object({ id: z.string().min(1).max(160), description: z.string().min(1).max(500) }))
                .min(1)
                .max(100),
            }),
            execute: async ({ featurePath, prdPath, flows }) => {
              await safeWorkspacePath(workspace, featurePath);
              await safeWorkspacePath(workspace, prdPath);
              return confirmFlows({ featurePath, prdPath, flows });
            },
          }),
        }
      : {}),
    playwright_cli: tool({
      description:
        "Inspect or interact with the authenticated browser for the selected target environment. Mutating actions require a separate data-safety approval scoped to the selected environment and scenario.",
      inputSchema: z.object({
        action: z.enum([
          "snapshot",
          "find",
          "requests",
          "console",
          "goto",
          "click",
          "fill",
          "press",
          "check",
          "uncheck",
          "select",
          "generate-locator",
          "close",
        ]),
        target: z.string().max(500).optional().describe("Current snapshot reference or text to find."),
        value: z.string().max(4000).optional().describe("Text, key, option, or target URL required by the action."),
        dataOwner: z
          .enum(["e2e-owned", "shared-seed", "unknown"])
          .optional()
          .describe("Data ownership for a mutating browser action."),
      }),
      execute: async ({ action, target: locator, value, dataOwner }) => {
        const currentTarget = typeof target === "function" ? target() : target;
        if ((!browserName && !ensureBrowser) || !currentTarget)
          throw new Error("Select an environment and configure E2E Variables before browser exploration.");
        if (action === "close" && closeBrowser) {
          await closeBrowser();
          return "Exploration browser closed.";
        }
        if ([locator, value].some((argument) => argument?.startsWith("--")))
          throw new Error("Browser arguments cannot override CLI options.");
        let destination;
        if (action === "goto") {
          try {
            destination = new URL(value || "", currentTarget);
          } catch {
            throw new Error("Enter a valid URL within the selected target environment.");
          }
          if (
            destination.origin !== new URL(currentTarget).origin ||
            destination.username ||
            destination.password ||
            /(?:password|passwd|secret|token|api[_-]?key)/i.test(destination.search)
          )
            throw new Error(
              "Browser navigation is limited to the selected target origin and may not include credential parameters.",
            );
        }
        if (mutatingBrowserActions.has(action)) {
          if (!dataOwner)
            throw new Error(
              "State whether this action uses E2E-owned data or shared/unknown data before requesting approval.",
            );
          const details = [currentTarget, scenarioId || "scenario not selected", action];
          if (locator) details.push(`target: ${redact(locator, variables)}`);
          if (value && ["fill", "select", "press"].includes(action)) details.push(`value: ${redact(value, variables)}`);
          const allowed = await requestApproval({
            kind: "data-safety",
            reason: `Browser action '${action}' will interact with ${dataOwner} data in the selected environment. Review the scenario and data ownership before allowing it.`,
            command: details.join(" · "),
            signal,
          });
          if (!allowed) return { denied: true, message: "The user declined this environment interaction." };
        }
        if (ensureBrowser) await ensureBrowser();
        onBrowserUse?.();
        const args =
          action === "goto"
            ? ["goto", destination.href]
            : action === "find"
              ? ["find", locator || ""]
              : action === "fill" || action === "select"
                ? [action, locator || "", value || ""]
                : action === "press"
                  ? ["press", value || locator || ""]
                  : [action, ...(locator ? [locator] : [])];
        const result = await runBrowserCommand(args);
        return redact(`${result.stdout || ""}${result.stderr || ""}`, variables).slice(0, 12000);
      },
    }),
  };
  if (runDraftScenario) {
    agentTools.run_draft_scenario = tool({
      description:
        "Run one uniquely identified scenario from this reviewed draft worktree, including a newly authored scenario. Supply its exact scenarioId and source file, or omit both to use the attached selection. The isolated runner requires separate explicit data-safety approval. Returns draft-only outcomes; it never saves official results or uploads evidence.",
      inputSchema: z.object({
        scenarioId: z.string().min(1).max(160).optional(),
        file: z
          .string()
          .min(1)
          .max(512)
          .optional()
          .describe("Source path relative to e2e/tests/bdd/features, for example user-management/users.feature."),
        dataOwner: z
          .enum(["e2e-owned", "shared-seed", "unknown"])
          .describe("Confirm this scenario uses E2E-owned data."),
      }),
      execute: async (input) => runDraftScenario(input, signal),
    });
  }
  return agentTools;
}
