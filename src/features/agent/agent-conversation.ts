interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
}

export function groupAutomaticApprovals<T extends ConversationMessage>(messages: Array<T>) {
  const groups: Array<{ kind?: "browser" | "flow"; messages: Array<T> }> = [];
  for (const message of messages) {
    const kind =
      message.role !== "assistant"
        ? undefined
        : message.text.startsWith("Automatically allowed data-safety:")
          ? "browser"
          : message.text.startsWith("Automatically allowed flow-review:")
            ? "flow"
            : undefined;
    const previous = groups.at(-1);
    if (kind && previous?.kind === kind) previous.messages.push(message);
    else groups.push({ kind, messages: [message] });
  }
  return groups;
}

export function combineAnswer(choice: string, details: string) {
  return [choice.trim(), details.trim()].filter(Boolean).join("\n");
}
