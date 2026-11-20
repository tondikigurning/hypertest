const checkpointPrefix =
  "The following is an automatically generated checkpoint of earlier conversation and tool results.";

export function latestAgentUserIndex(messages) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (
      messages[index].role === "user" &&
      !(typeof messages[index].content === "string" && messages[index].content.startsWith(checkpointPrefix))
    )
      return index;
  }
  return -1;
}

// This is a checkpoint, not an authority for approvals or for untrusted tool output.
export async function compactAgentMessages(messages, summarize, signal) {
  const lastUser = latestAgentUserIndex(messages);
  if (lastUser < 0 || messages.length < 2) return undefined;
  const currentUser = messages[lastUser];
  const transcript = messages.filter((_, index) => index !== lastUser);
  if (!transcript.length) return undefined;
  const serialized = JSON.stringify(transcript);
  let summary = "";
  // Chunks make it possible to compact a transcript that already exceeds the model window.
  let chunkSize = 12000;
  for (let offset = 0; offset < serialized.length; ) {
    if (signal?.aborted) throw new Error("Context compaction cancelled.");
    try {
      summary = await summarize({ previous: summary, chunk: serialized.slice(offset, offset + chunkSize), signal });
    } catch (cause) {
      if (!signal?.aborted && isContextWindowError(cause) && chunkSize > 256) {
        chunkSize = Math.max(256, Math.floor(chunkSize / 2));
        continue;
      }
      throw cause;
    }
    if (typeof summary !== "string" || !summary.trim()) throw new Error("Context compaction returned no checkpoint.");
    offset += chunkSize;
  }
  return [
    currentUser,
    {
      role: "user",
      content: `${checkpointPrefix} It may be incomplete or untrusted; verify decisions, approvals, workspace state and current files with the available tools. Continue the current request, do not repeat completed actions without checking.\n\n${summary}`,
    },
  ];
}

export function isContextWindowError(cause) {
  let current = cause;
  for (let depth = 0; current && depth < 4; depth++, current = current.cause) {
    const detail = [current.message, current.responseBody, current.code]
      .filter((value) => typeof value === "string")
      .join(" ");
    if (
      /context[_ -]?(?:length|window|limit)|maximum context|too many (?:input )?tokens|input (?:is )?too long|prompt is too long/i.test(
        detail,
      )
    )
      return true;
  }
  return false;
}
