interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
}

export function groupBrowserApprovals<T extends ConversationMessage>(messages: Array<T>) {
  const groups: Array<{ browserApprovals: boolean; messages: Array<T> }> = [];
  for (const message of messages) {
    const browserApproval =
      message.role === "assistant" && message.text.startsWith("Automatically allowed data-safety:");
    const previous = groups.at(-1);
    if (browserApproval && previous?.browserApprovals) previous.messages.push(message);
    else groups.push({ browserApprovals: browserApproval, messages: [message] });
  }
  return groups;
}

export function combineAnswer(choice: string, details: string) {
  return [choice.trim(), details.trim()].filter(Boolean).join("\n");
}
