import { cp, lstat, mkdir, rm, symlink } from "node:fs/promises";
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
  await cp("/snapshot", workspace, { recursive: true, force: false, errorOnExist: true });
  const dependencyLinks = [
    ["/workspace/node_modules", join(workspace, "node_modules")],
    ["/workspace/e2e/node_modules", join(workspace, "e2e/node_modules")],
    [
      "/workspace/packages/internal/test-utils/node_modules",
      join(workspace, "packages/internal/test-utils/node_modules"),
    ],
  ];
  for (const [target, link] of dependencyLinks) {
    await mkdir(dirname(link), { recursive: true });
    await symlink(target, link, "dir");
  }
  const testUtilsPackage = "/workspace/e2e/node_modules/@hyperscal/test-utils";
  if ((await lstat(testUtilsPackage).catch(() => undefined))?.isSymbolicLink()) {
    await rm(testUtilsPackage);
    await symlink(join(workspace, "packages/internal/test-utils"), testUtilsPackage, "dir");
  }
  service = await startDraftRunInProcess({
    workspace,
    scenarioId: input.scenarioId,
    target: input.target,
    variables: input.variables,
  });
  while (service.active()) {
    publish(service.publicRun());
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  publish(service.publicRun());
} catch {
  process.stdout.write(
    `${JSON.stringify({ type: "error", error: "The isolated draft runner could not complete." })}\n`,
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
