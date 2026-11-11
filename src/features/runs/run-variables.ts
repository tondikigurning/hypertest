export const storageKey = "automation-run-variables";
export function readVariables(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}
