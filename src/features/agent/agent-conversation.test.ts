import assert from "node:assert/strict";
import test from "node:test";
import { combineAnswer, groupAutomaticApprovals } from "./agent-conversation";

test("consecutive automatic browser decisions stay inspectable without dominating the conversation", () => {
  const messages = [
    { id: "1", role: "assistant" as const, text: "Automatically allowed data-safety: click · target: e195" },
    { id: "2", role: "assistant" as const, text: "Automatically allowed data-safety: fill · target: e196" },
    { id: "3", role: "assistant" as const, text: "Question about the result" },
    { id: "4", role: "assistant" as const, text: "Automatically allowed flow-review: LIST" },
    { id: "4b", role: "assistant" as const, text: "Automatically allowed flow-review: CREATE" },
    { id: "5", role: "user" as const, text: "Automatically allowed data-safety: example" },
  ];
  const groups = groupAutomaticApprovals(messages);
  assert.deepEqual(groups.map((group) => group.messages.map((message) => message.id)), [["1", "2"], ["3"], ["4", "4b"], ["5"]]);
  assert.equal(groups[0].kind, "browser");
  assert.equal(groups[1].kind, undefined);
  assert.equal(groups[2].kind, "flow");
});

test("an answer can include both the selected choice and the guidance it requests", () => {
  assert.equal(combineAnswer("1. Provide access guidance", "Use the Converge entity."), "1. Provide access guidance\nUse the Converge entity.");
  assert.equal(combineAnswer("", "No operations are restricted."), "No operations are restricted.");
  assert.equal(combineAnswer("2. Continue with the gap", ""), "2. Continue with the gap");
});
