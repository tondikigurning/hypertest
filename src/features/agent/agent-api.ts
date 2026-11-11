const dummyUserKey = "automation-dummy-user-id";
const dummyUserId = localStorage.getItem(dummyUserKey) || crypto.randomUUID();
const activeDraftKey = "automation-agent-active-draft-id";
localStorage.setItem(dummyUserKey, dummyUserId);

export function getActiveDraftId() {
  return localStorage.getItem(activeDraftKey) || "";
}

export function setActiveDraftId(draftId: string) {
  if (draftId) localStorage.setItem(activeDraftKey, draftId);
  else localStorage.removeItem(activeDraftKey);
  window.dispatchEvent(new Event("automation-agent-draft-change"));
}

export function agentFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-Automation-Dummy-User", dummyUserId);
  if (!headers.has("X-Automation-Draft-Id")) {
    const draftId = getActiveDraftId();
    if (draftId) headers.set("X-Automation-Draft-Id", draftId);
  }
  return fetch(input, { ...init, headers });
}
