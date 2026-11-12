import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const maxContentBytes = 262144;
const modulePattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const versionPattern = /^v[1-9][0-9]{0,5}$/;

function identityPath(module, submodule) {
  if (
    typeof module !== "string" ||
    typeof submodule !== "string" ||
    !modulePattern.test(module) ||
    !modulePattern.test(submodule)
  ) {
    throw new Error("Choose a valid module and submodule.");
  }
  return {
    document: `docs/prd/${module}/${submodule}.md`,
    directory: `docs/prd/.versions/${module}/${submodule}`,
    index: `docs/prd/.versions/${module}/${submodule}/index.json`,
  };
}

function versionPath(directory, id) {
  if (!versionPattern.test(id)) throw new Error("Choose a valid PRD version.");
  return `${directory}/${id}.md`;
}

function statusOf(content) {
  const frontMatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || "";
  return frontMatter.match(/^status\s*:\s*["']?([^\s"'#]+)["']?/im)?.[1] || "unknown";
}

function removesValidatedLines(before, after) {
  const remaining = new Map();
  for (const line of before.split(/\r?\n/).filter((value) => /\[validated\]/i.test(value))) {
    remaining.set(line, (remaining.get(line) || 0) + 1);
  }
  for (const line of after.split(/\r?\n/).filter((value) => /\[validated\]/i.test(value))) {
    const count = remaining.get(line) || 0;
    if (count > 0) remaining.set(line, count - 1);
  }
  return [...remaining.values()].some((count) => count > 0);
}

function validateName(value, fallback) {
  const name = typeof value === "string" ? value.trim() : "";
  const result = name || fallback;
  const hasControlCharacter = [...result].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (result.length > 80 || hasControlCharacter)
    throw new Error("Version names must be 80 characters or fewer on one line.");
  return result;
}

async function readOptional(workspace, safePath, path) {
  const absolute = await safePath(workspace, path);
  try {
    const info = await lstat(absolute);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size > maxContentBytes)
      throw new Error("The PRD version file is unavailable or too large.");
    return { content: await readFile(absolute, "utf8"), modifiedAt: info.mtime.toISOString() };
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

async function writeAtomic(workspace, safePath, path, content) {
  if (Buffer.byteLength(content) > maxContentBytes) throw new Error("PRD versions are limited to 256 KB.");
  const absolute = await safePath(workspace, path);
  await mkdir(dirname(absolute), { recursive: true });
  await safePath(workspace, path);
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  const temporary = await safePath(workspace, temporaryPath);
  await writeFile(temporary, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  await rename(temporary, absolute);
}

async function removeFile(workspace, safePath, path) {
  const absolute = await safePath(workspace, path);
  try {
    const info = await lstat(absolute);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1)
      throw new Error("The PRD version file is unavailable.");
    await unlink(absolute);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function validateManifest(value) {
  if (
    !value ||
    value.format !== 1 ||
    !Array.isArray(value.versions) ||
    !versionPattern.test(value.activeVersionId) ||
    value.versions.length < 1 ||
    value.versions.length > 100
  )
    throw new Error("PRD version metadata is invalid. Use the agent to repair this draft.");
  const seen = new Set();
  for (const version of value.versions) {
    if (
      !version ||
      !versionPattern.test(version.id) ||
      typeof version.name !== "string" ||
      typeof version.createdAt !== "string" ||
      typeof version.updatedAt !== "string" ||
      seen.has(version.id)
    )
      throw new Error("PRD version metadata is invalid. Use the agent to repair this draft.");
    seen.add(version.id);
  }
  if (!seen.has(value.activeVersionId))
    throw new Error("PRD version metadata is invalid. Use the agent to repair this draft.");
  return value;
}

async function readState(workspace, safePath, module, submodule) {
  const paths = identityPath(module, submodule);
  const [manifestFile, canonical] = await Promise.all([
    readOptional(workspace, safePath, paths.index),
    readOptional(workspace, safePath, paths.document),
  ]);
  if (!manifestFile) {
    if (!canonical) return { paths, activeVersionId: undefined, versions: [], legacy: false };
    return {
      paths,
      activeVersionId: "v1",
      legacy: true,
      versions: [
        {
          id: "v1",
          name: "Version 1",
          createdAt: canonical.modifiedAt,
          updatedAt: canonical.modifiedAt,
          content: canonical.content,
        },
      ],
    };
  }
  let manifest;
  try {
    manifest = validateManifest(JSON.parse(manifestFile.content));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("PRD version metadata is invalid. Use the agent to repair this draft.");
    throw error;
  }
  const versions = await Promise.all(
    manifest.versions.map(async (version) => {
      const file = await readOptional(workspace, safePath, versionPath(paths.directory, version.id));
      if (!file) throw new Error("A PRD version is missing from this draft. Use the agent to repair it.");
      return {
        ...version,
        updatedAt:
          version.id === manifest.activeVersionId ? (canonical?.modifiedAt ?? version.updatedAt) : version.updatedAt,
        content: version.id === manifest.activeVersionId && canonical ? canonical.content : file.content,
      };
    }),
  );
  return { paths, activeVersionId: manifest.activeVersionId, versions, legacy: false };
}

async function persist(workspace, safePath, state) {
  const active = state.versions.find((version) => version.id === state.activeVersionId);
  if (!active) throw new Error("A PRD must have an active version.");
  for (const version of state.versions) {
    const versionFile = versionPath(state.paths.directory, version.id);
    await writeAtomic(workspace, safePath, versionFile, version.content);
  }
  await writeAtomic(workspace, safePath, state.paths.document, active.content);
  await writeAtomic(
    workspace,
    safePath,
    state.paths.index,
    `${JSON.stringify(
      {
        format: 1,
        activeVersionId: state.activeVersionId,
        versions: state.versions.map(({ id, name, createdAt, updatedAt }) => ({ id, name, createdAt, updatedAt })),
      },
      null,
      2,
    )}\n`,
  );
}

function serialize(state, module, submodule) {
  return {
    module,
    submodule,
    activeVersionId: state.activeVersionId,
    items: state.versions
      .map((version) => ({
        id: version.id,
        name: version.name,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        status: statusOf(version.content),
        content: version.content,
        active: version.id === state.activeVersionId,
      }))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
  };
}

function nextVersionId(versions) {
  const highest = versions.reduce((value, version) => Math.max(value, Number(version.id.slice(1))), 0);
  if (highest >= 999999) throw new Error("This PRD has reached its version limit.");
  return `v${highest + 1}`;
}

function assertUniqueName(versions, name, versionId) {
  if (
    versions.some(
      (version) => version.id !== versionId && version.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  )
    throw new Error("A version with that name already exists.");
}

export async function listPrdVersions({ workspace, safePath, module, submodule }) {
  return serialize(await readState(workspace, safePath, module, submodule), module, submodule);
}

export async function createPrdVersion({
  workspace,
  safePath,
  module,
  submodule,
  name,
  initialContent,
  authorizeWrite,
}) {
  const state = await readState(workspace, safePath, module, submodule);
  if (state.versions.length >= 100) throw new Error("A PRD can have up to 100 versions.");
  const id = nextVersionId(state.versions);
  const active = state.versions.find((version) => version.id === state.activeVersionId);
  const content =
    active?.content ?? (typeof initialContent === "string" ? initialContent : "---\nstatus: draft\n---\n\n");
  if (Buffer.byteLength(content) > maxContentBytes) throw new Error("PRD versions are limited to 256 KB.");
  const versionName = validateName(name, `Version ${id.slice(1)}`);
  assertUniqueName(state.versions, versionName);
  await authorizeWrite?.(state.paths.document, content);
  const now = new Date().toISOString();
  state.versions.push({ id, name: versionName, createdAt: now, updatedAt: now, content });
  state.activeVersionId = id;
  await persist(workspace, safePath, state);
  return serialize(state, module, submodule);
}

export async function updatePrdVersion({
  workspace,
  safePath,
  module,
  submodule,
  versionId,
  name,
  content,
  authorizeWrite,
}) {
  const state = await readState(workspace, safePath, module, submodule);
  const version = state.versions.find((item) => item.id === versionId);
  if (!version) throw new Error("Choose a version that exists.");
  version.name = validateName(name, version.name);
  assertUniqueName(state.versions, version.name, versionId);
  if (content !== undefined) {
    if (typeof content !== "string") throw new Error("PRD version content must be text.");
    if (Buffer.byteLength(content) > maxContentBytes) throw new Error("PRD versions are limited to 256 KB.");
    if (removesValidatedLines(version.content, content))
      throw new Error("Use Q-Rex to refresh a version that contains validated requirements.");
    if (statusOf(version.content).toLowerCase() === "reviewed" && content !== version.content)
      throw new Error("Use Q-Rex to update a reviewed PRD version.");
    await authorizeWrite?.(
      versionId === state.activeVersionId ? state.paths.document : versionPath(state.paths.directory, versionId),
      content,
    );
    version.content = content;
  }
  version.updatedAt = new Date().toISOString();
  await persist(workspace, safePath, state);
  return serialize(state, module, submodule);
}

export async function activatePrdVersion({ workspace, safePath, module, submodule, versionId, authorizeWrite }) {
  const state = await readState(workspace, safePath, module, submodule);
  const version = state.versions.find((item) => item.id === versionId);
  if (!version) throw new Error("Choose a version that exists.");
  if (versionId === state.activeVersionId) return serialize(state, module, submodule);
  await authorizeWrite?.(state.paths.document, version.content);
  state.activeVersionId = versionId;
  version.updatedAt = new Date().toISOString();
  await persist(workspace, safePath, state);
  return serialize(state, module, submodule);
}

export async function deletePrdVersion({ workspace, safePath, module, submodule, versionId }) {
  const state = await readState(workspace, safePath, module, submodule);
  if (!state.versions.some((version) => version.id === versionId)) throw new Error("Choose a version that exists.");
  if (versionId === state.activeVersionId && state.versions.length > 1)
    throw new Error("Set another version active before deleting this one.");
  if (state.versions.length === 1) {
    await removeFile(workspace, safePath, versionPath(state.paths.directory, versionId));
    await removeFile(workspace, safePath, state.paths.document);
    await removeFile(workspace, safePath, state.paths.index);
    return serialize({ paths: state.paths, activeVersionId: undefined, versions: [] }, module, submodule);
  }
  await removeFile(workspace, safePath, versionPath(state.paths.directory, versionId));
  state.versions = state.versions.filter((version) => version.id !== versionId);
  await persist(workspace, safePath, state);
  return serialize(state, module, submodule);
}
