const localPreviewUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveLocalPreviewIdentity(req) {
  const userId = req.get?.("X-Automation-Dummy-User") ?? req.headers?.["x-automation-dummy-user"];
  if (typeof userId !== "string" || !localPreviewUserId.test(userId)) return undefined;

  // This ID partitions local preview sessions by browser; it does not authenticate a person.
  return { userId, authenticated: false };
}
