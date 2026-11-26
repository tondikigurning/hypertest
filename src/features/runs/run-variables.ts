let principalId = "";
let secretValues: Record<string, string> = {};
let memoryPublicValues: Record<string, string> = {};
const legacyKey = "automation-run-variables";
const transientVariableNames = new Set(["E2E_CASE_CUSTOMER_ID"]);

function storageKey() {
  return principalId ? `automation-run-variables:v1:${principalId}` : undefined;
}

function removeStoredTransientVariables() {
  const key = storageKey();
  if (!key) return;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    let changed = false;
    for (const name of transientVariableNames) {
      if (name in saved) {
        delete saved[name];
        changed = true;
      }
    }
    if (changed) localStorage.setItem(key, JSON.stringify(saved));
  } catch {
    /* Storage can be disabled or contain invalid data. */
  }
}

export function setVariablesPrincipal(id: string) {
  if (principalId !== id) {
    secretValues = {};
    memoryPublicValues = {};
  }
  principalId = id;
  try {
    sessionStorage.removeItem(legacyKey);
  } catch {
    /* Storage can be disabled. */
  }
  removeStoredTransientVariables();
}

export function clearVariableSecrets() {
  secretValues = {};
}

export function readVariables(defaults: Record<string, string> = {}): Record<string, string> {
  try {
    removeStoredTransientVariables();
    const key = storageKey();
    const saved = key ? JSON.parse(localStorage.getItem(key) || "{}") : {};
    return { ...defaults, ...saved, ...memoryPublicValues, ...secretValues };
  } catch {
    return { ...defaults, ...memoryPublicValues, ...secretValues };
  }
}

export function writeVariables(values: Record<string, string>, variables: Array<{ name: string; secret: boolean }>) {
  const publicValues: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const variable of variables) {
    if (variable.secret || transientVariableNames.has(variable.name))
      secrets[variable.name] = values[variable.name] || "";
    else publicValues[variable.name] = values[variable.name] || "";
  }
  secretValues = secrets;
  memoryPublicValues = publicValues;
  try {
    const key = storageKey();
    if (key) localStorage.setItem(key, JSON.stringify(publicValues));
  } catch {
    /* Keep the values in this tab when storage is unavailable. */
  }
}
