let principalId = "";
let variableValues: Record<string, string> = {};
const legacyKey = "automation-run-variables";

function storageKey() {
  return principalId ? `automation-run-variables:v2:${principalId}` : undefined;
}

function readStoredValues() {
  const key = storageKey();
  if (!key) return {};
  try {
    const current = sessionStorage.getItem(key);
    if (current) return JSON.parse(current);

    // Migrate values saved by older versions into tab-scoped storage.
    const legacySecretKey = `automation-run-variables:secrets:v1:${principalId}`;
    const oldSessionValues = JSON.parse(sessionStorage.getItem(legacySecretKey) || "{}");
    const oldLocalKey = `automation-run-variables:v1:${principalId}`;
    const oldLocalValues = JSON.parse(localStorage.getItem(oldLocalKey) || "{}");
    const migrated = { ...oldLocalValues, ...oldSessionValues };
    if (Object.keys(migrated).length) sessionStorage.setItem(key, JSON.stringify(migrated));
    sessionStorage.removeItem(legacySecretKey);
    localStorage.removeItem(oldLocalKey);
    return migrated;
  } catch {
    return {};
  }
}

export function setVariablesPrincipal(id: string) {
  if (principalId !== id) variableValues = {};
  principalId = id;
  variableValues = readStoredValues();
  try {
    sessionStorage.removeItem(legacyKey);
  } catch {
    /* Storage can be disabled. */
  }
}

export function clearVariables() {
  variableValues = {};
  const key = storageKey();
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Keep the current tab usable when storage is unavailable. */
  }
}

export function readVariables(defaults: Record<string, string> = {}): Record<string, string> {
  return { ...defaults, ...variableValues };
}

export function writeVariables(values: Record<string, string>) {
  variableValues = values;
  const key = storageKey();
  try {
    if (key) sessionStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* Keep values in this tab when session storage is unavailable. */
  }
}
