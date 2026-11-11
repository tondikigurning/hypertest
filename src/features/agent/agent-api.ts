const dummyUserKey = "automation-dummy-user-id";
const dummyUserId = localStorage.getItem(dummyUserKey) || crypto.randomUUID();
localStorage.setItem(dummyUserKey, dummyUserId);

export function agentFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-Automation-Dummy-User", dummyUserId);
  return fetch(input, { ...init, headers });
}
