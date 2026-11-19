function reviewed(content) {
  const frontMatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || "";
  return /^status\s*:\s*["']?reviewed["']?\s*(?:#.*)?$/im.test(frontMatter);
}

function validatedLines(content) {
  return content.split(/\r?\n/).filter((line) => /\[validated\]/i.test(line));
}

export function requiresPrdReview(before, after) {
  if (before === after) return false;
  if (reviewed(after)) return true;
  const previous = new Map();
  for (const line of validatedLines(before)) previous.set(line, (previous.get(line) || 0) + 1);
  for (const line of validatedLines(after)) {
    const remaining = previous.get(line) || 0;
    if (!remaining) return true;
    previous.set(line, remaining - 1);
  }
  return false;
}
