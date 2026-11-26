import { cp, mkdir, readdir, readFile, realpath, symlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { startDraftRunInProcess } from "/agent-draft-run.mjs";

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
const chunks = [];
let inputBytes = 0;
let inputTooLarge = false;
for await (const line of lines) {
  inputBytes += Buffer.byteLength(line);
  if (inputBytes > 20000) inputTooLarge = true;
  else chunks.push(line);
}

function publish(run) {
  process.stdout.write(`${JSON.stringify({ type: "run", run })}\n`);
}

let service;
let stage = "validating request";
let framePublished = false;
try {
  if (inputTooLarge) throw new Error("Sandbox request is too large.");
  const input = JSON.parse(chunks.join("\n"));
  if (
    typeof input?.scenarioId !== "string" ||
    typeof input?.target !== "string" ||
    typeof input?.variables?.E2E_USERNAME !== "string" ||
    input.variables.E2E_USERNAME.length > 4096 ||
    typeof input?.variables?.E2E_PASSWORD !== "string" ||
    input.variables.E2E_PASSWORD.length > 4096
  )
    throw new Error("Sandbox request is invalid.");
  const workspace = "/draft";
  stage = "copying the draft";
  // /draft is an empty tmpfs mount, so the destination directory already exists.
  await cp("/snapshot", workspace, { recursive: true, force: false });
  stage = "preparing draft dependencies";
  const dependencyLinks = [
    ["/workspace/node_modules", join(workspace, "node_modules")],
    [
      "/workspace/packages/internal/test-utils/node_modules",
      join(workspace, "packages/internal/test-utils/node_modules"),
    ],
  ];
  for (const [target, link] of dependencyLinks) {
    await mkdir(dirname(link), { recursive: true });
    await symlink(target, link, "dir");
  }
  // Keep the image read-only while resolving the workspace package to the draft copy.
  const imageModules = "/workspace/e2e/node_modules";
  const draftModules = join(workspace, "e2e/node_modules");
  await mkdir(draftModules, { recursive: true });
  for (const name of await readdir(imageModules)) {
    if (name === "@hyperscal") continue;
    await symlink(await realpath(join(imageModules, name)), join(draftModules, name), "dir");
  }
  const imageScope = join(imageModules, "@hyperscal");
  const draftScope = join(draftModules, "@hyperscal");
  await mkdir(draftScope, { recursive: true });
  for (const name of await readdir(imageScope)) {
    const target =
      name === "test-utils" ? join(workspace, "packages/internal/test-utils") : await realpath(join(imageScope, name));
    await symlink(target, join(draftScope, name), "dir");
  }
  stage = "starting the draft test";
  service = await startDraftRunInProcess({
    workspace,
    scenarioId: input.scenarioId,
    target: input.target,
    variables: input.variables,
  });
  while (service.active()) {
    publish(service.publicRun());
    try {
      const frame = await readFile(service.framePath());
      if (frame.length <= 2 * 1024 * 1024 && frame[0] === 0xff && frame[1] === 0xd8) {
        process.stdout.write(`${JSON.stringify({ type: "frame", data: frame.toString("base64") })}\n`);
        framePublished = true;
      }
    } catch {
      // A frame may not exist yet, or the browser may have closed.
      if (framePublished) {
        process.stdout.write(`${JSON.stringify({ type: "frame-clear" })}\n`);
        framePublished = false;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  publish(service.publicRun());
} catch {
  process.stdout.write(
    `${JSON.stringify({ type: "error", error: `The isolated draft runner failed while ${stage}.` })}\n`,
  );
  if (service) {
    try {
      if (service.active()) await service.cancel();
    } catch {
      // The Docker container is removed after this process exits.
    }
  }
  process.exitCode = 1;
}
