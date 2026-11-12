import { posix, resolve } from "node:path";

export function draftArtifactPath(runDirectory, attachmentPath) {
  const runName = runDirectory.split(/[\\/]/).at(-1);
  if (!runName || typeof attachmentPath !== "string") return undefined;
  // TMPDIR is /run-data in the container, mounted from artifactRoot/tmp on the host.
  const containerOutput = `/run-data/${runName}/output`;
  const relative = posix.relative(containerOutput, posix.resolve(attachmentPath));
  if (!relative || relative.startsWith("..") || posix.isAbsolute(relative)) return undefined;
  const segments = relative.split("/");
  if (segments.some((segment) => /[\\:]/.test(segment))) return undefined;
  return resolve(runDirectory, "output", ...segments);
}
