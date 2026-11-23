export const storageKey = "automation-run-variables";
export function readVariables(defaults: Record<string, string> = {}): Record<string, string> {
  try {
    return { ...defaults, ...JSON.parse(sessionStorage.getItem(storageKey) || "{}") };
  } catch {
    return defaults;
  }
}
