import { and, eq } from "drizzle-orm";
import { database } from "../../database.mjs";
import { agentPrds } from "../results/schema.mjs";
import { prdIdentity } from "./prd-identity.mjs";
import { requiresPrdReview } from "./prd-review.mjs";

export { prdIdentity } from "./prd-identity.mjs";

const identity = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const empty = () => ({ activeVersionId: undefined, versions: [] });

function validate(module, submodule) {
  if (!identity.test(module || "") || !identity.test(submodule || ""))
    throw new Error("Choose a valid module and submodule.");
}

function status(content) {
  return (
    content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1].match(/^status\s*:\s*["']?([^\s"'#]+)/im)?.[1] ||
    "unknown"
  );
}

function serialize(state, module, submodule) {
  return {
    module,
    submodule,
    activeVersionId: state.activeVersionId,
    items: state.versions.map((version) => ({
      ...version,
      status: status(version.content),
      active: version.id === state.activeVersionId,
    })),
  };
}

export function createPrdDatabase(userId) {
  const where = (module, submodule) =>
    and(eq(agentPrds.userId, userId), eq(agentPrds.module, module), eq(agentPrds.submodule, submodule));
  async function load(module, submodule) {
    validate(module, submodule);
    const [row] = await database().select().from(agentPrds).where(where(module, submodule));
    return { state: row?.state || empty(), revision: row?.revision || 0 };
  }
  async function save(module, submodule, state, revision) {
    if (!revision) {
      const rows = await database()
        .insert(agentPrds)
        .values({ userId, module, submodule, state })
        .onConflictDoNothing()
        .returning();
      if (!rows.length) throw new Error("The PRD changed concurrently. Reload and try again.");
    } else {
      const rows = await database()
        .update(agentPrds)
        .set({ state, revision: revision + 1 })
        .where(and(where(module, submodule), eq(agentPrds.revision, revision)))
        .returning();
      if (!rows.length) throw new Error("The PRD changed concurrently. Reload and try again.");
    }
  }
  async function approve(before, content, path, requestApproval, signal, redact) {
    const retained = new Map();
    for (const line of content.split(/\r?\n/).filter((value) => /\[validated\]/i.test(value)))
      retained.set(line, (retained.get(line) || 0) + 1);
    const removedValidation = before.split(/\r?\n/).some((line) => {
      if (!/\[validated\]/i.test(line)) return false;
      const count = retained.get(line) || 0;
      if (!count) return true;
      retained.set(line, count - 1);
      return false;
    });
    if (!requiresPrdReview(before, content) && !removedValidation) return false;
    if (redact(content) !== content) throw new Error("Remove sensitive content before PRD review.");
    const accepted = await requestApproval({
      kind: "prd-review",
      reason: `Review the complete proposed PRD ${path}. Approving accepts its shown status and validated items.`,
      command: content,
      signal,
    });
    if (!accepted || signal?.aborted) throw new Error("The proposed PRD was not approved.");
    return true;
  }
  return {
    async list() {
      const rows = await database().select().from(agentPrds).where(eq(agentPrds.userId, userId));
      return rows.flatMap(({ module, submodule, state }) => {
        const active = state.versions.find((item) => item.id === state.activeVersionId);
        return active ? [{ module, submodule, content: active.content, status: status(active.content) }] : [];
      });
    },
    async versions(module, submodule) {
      const { state } = await load(module, submodule);
      return serialize(state, module, submodule);
    },
    async mutate(action, input, approval) {
      const { module, submodule, versionId } = input;
      const { state, revision } = await load(module, submodule);
      const active = state.versions.find((item) => item.id === state.activeVersionId);
      const selected = state.versions.find((item) => item.id === versionId);
      const path = `docs/prd/${module}/${submodule}.md`;
      const now = new Date().toISOString();
      if (action === "create") {
        if (state.versions.length >= 100) throw new Error("A PRD can have up to 100 versions.");
        const number = Math.max(0, ...state.versions.map((item) => Number(item.id.slice(1)))) + 1;
        const content = active?.content ?? input.initialContent ?? "---\nstatus: draft\n---\n\n";
        if (typeof content !== "string" || Buffer.byteLength(content) > 262144)
          throw new Error("PRD versions are limited to 256 KB.");
        await approve(active?.content || "", content, path, approval.requestApproval, approval.signal, approval.redact);
        state.versions.push({
          id: `v${number}`,
          name: input.name?.trim() || `Version ${number}`,
          content,
          createdAt: now,
          updatedAt: now,
        });
        state.activeVersionId = `v${number}`;
      } else {
        if (!selected) throw new Error("Choose a version that exists.");
        if (action === "delete") {
          if (selected === active && state.versions.length > 1)
            throw new Error("Set another version active before deleting this one.");
          state.versions = state.versions.filter((item) => item !== selected);
          if (selected === active) state.activeVersionId = undefined;
        } else if (action === "activate") {
          await approve(
            active?.content || "",
            selected.content,
            path,
            approval.requestApproval,
            approval.signal,
            approval.redact,
          );
          state.activeVersionId = selected.id;
          selected.updatedAt = now;
        } else if (action === "update") {
          if (input.name !== undefined) selected.name = input.name.trim();
          if (input.content !== undefined) {
            if (typeof input.content !== "string" || Buffer.byteLength(input.content) > 262144)
              throw new Error("PRD versions are limited to 256 KB.");
            if (
              status(selected.content).toLowerCase() === "reviewed" ||
              selected.content
                .split(/\r?\n/)
                .some((line) => /\[validated\]/i.test(line) && !input.content.split(/\r?\n/).includes(line))
            )
              throw new Error("Use Q-Rex to update reviewed requirements.");
            await approve(
              selected.content,
              input.content,
              path,
              approval.requestApproval,
              approval.signal,
              approval.redact,
            );
            selected.content = input.content;
          }
          selected.updatedAt = now;
        } else throw new Error("Unknown PRD operation.");
      }
      const names = new Set();
      for (const version of state.versions) {
        if (
          !version.name ||
          version.name.length > 80 ||
          [...version.name].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
          names.has(version.name.toLocaleLowerCase())
        )
          throw new Error("Version names must be unique and at most 80 characters on one line.");
        names.add(version.name.toLocaleLowerCase());
      }
      await save(module, submodule, state, revision);
      return serialize(state, module, submodule);
    },
    async read(path) {
      const id = prdIdentity(path);
      if (!id) throw new Error("Choose a valid PRD identifier.");
      const { state } = await load(id.module, id.submodule);
      return state.versions.find((item) => item.id === state.activeVersionId)?.content;
    },
    async write(path, content, { requestApproval, signal, redact, expected }) {
      const id = prdIdentity(path);
      if (!id) throw new Error("Choose a valid PRD identifier.");
      if (Buffer.byteLength(content) > 262144) throw new Error("PRD versions are limited to 256 KB.");
      const { state, revision } = await load(id.module, id.submodule);
      let active = state.versions.find((item) => item.id === state.activeVersionId);
      if (expected !== undefined && active?.content !== expected)
        throw new Error("The PRD changed. Read it again before editing.");
      const reviewed = await approve(active?.content || "", content, path, requestApproval, signal, redact);
      if (signal?.aborted) throw new Error("Session stopped.");
      const now = new Date().toISOString();
      if (!active) {
        active = { id: "v1", name: "Version 1", createdAt: now };
        state.versions.push(active);
        state.activeVersionId = active.id;
      }
      active.content = content;
      active.updatedAt = now;
      await save(id.module, id.submodule, state, revision);
      return reviewed;
    },
  };
}
