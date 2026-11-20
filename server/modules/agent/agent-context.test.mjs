import assert from "node:assert/strict";
import test from "node:test";
import { compactAgentMessages, isContextWindowError } from "./agent-context.mjs";

test("compaction retains the actual latest user request across repeated checkpoints", async () => {
  const request = { role: "user", content: "Continue the Cases journey." };
  const messages = [
    { role: "user", content: "Review the Cases PRD." },
    { role: "assistant", content: "Reviewed." },
    request,
    { role: "assistant", content: "Found the case." },
  ];
  const first = await compactAgentMessages(messages, async () => "First checkpoint");
  const second = await compactAgentMessages(
    [...first, { role: "assistant", content: "Opened the case." }],
    async () => "Second checkpoint",
  );
  assert.equal(second[0], request);
  assert.match(second[1].content, /Second checkpoint/);
});

test("compaction reduces fragment size after a provider context error", async () => {
  const sizes = [];
  const messages = [
    { role: "user", content: "Continue." },
    { role: "assistant", content: "x".repeat(13000) },
  ];
  const compacted = await compactAgentMessages(messages, async ({ chunk }) => {
    sizes.push(chunk.length);
    if (chunk.length > 6000) throw new Error("maximum context length exceeded");
    return "Checkpoint";
  });
  assert.ok(sizes[0] > 6000);
  assert.ok(sizes.slice(1).every((size) => size <= 6000));
  assert.match(compacted[1].content, /Checkpoint/);
  assert.equal(isContextWindowError(new Error("invalid API key")), false);
});
