let principalId = "";
let currentDraft = "";
export function agentStorageKey(name: string) {
  return `automation-agent:${name}:v1:${principalId}`;
}
function activeDraftKey() {
  return `automation-agent-active-draft-id:v1:${principalId}`;
}
export function setAgentPrincipal(id: string) {
  if (principalId !== id) currentDraft = "";
  principalId = id;
}
export function getActiveDraftId() {
  if (!principalId) return "";
  try {
    return localStorage.getItem(activeDraftKey()) || "";
  } catch {
    return currentDraft;
  }
}
export function setActiveDraftId(draftId: string) {
  if (!principalId) return;
  currentDraft = draftId;
  try {
    if (draftId) localStorage.setItem(activeDraftKey(), draftId);
    else localStorage.removeItem(activeDraftKey());
  } catch {
    /* Keep the current draft in memory. */
  }
  window.dispatchEvent(new Event("automation-agent-draft-change"));
}
export function agentFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("X-Automation-Draft-Id")) {
    const draftId = getActiveDraftId();
    if (draftId) headers.set("X-Automation-Draft-Id", draftId);
  }
  return fetch(input, { ...init, headers });
}
