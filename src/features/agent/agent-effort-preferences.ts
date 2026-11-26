type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
const storageKey = "automation-agent-effort-presets-v1";
export const effortLevels = ["low", "medium", "high", "xhigh"] as const;
export type EffortLevel = (typeof effortLevels)[number];

export function isEffortLevel(value: unknown): value is EffortLevel {
  return effortLevels.some((level) => level === value);
}

export function effortPresetKey(provider: string, model: string) {
  return JSON.stringify([provider, model]);
}

export function readEffortPresets(storage: PreferenceStorage, key = storageKey): Record<string, EffortLevel> {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const presets: Record<string, EffortLevel> = {};
    for (const [key, effort] of Object.entries(value)) {
      if (isEffortLevel(effort)) presets[key] = effort;
    }
    return presets;
  } catch {
    return {};
  }
}

export function writeEffortPreset(
  storage: PreferenceStorage,
  provider: string,
  model: string,
  effort: EffortLevel,
  key = storageKey,
) {
  const presets = readEffortPresets(storage, key);
  presets[effortPresetKey(provider, model)] = effort;
  try {
    storage.setItem(key, JSON.stringify(presets));
  } catch {
    // A storage restriction must not stop changes in the current tab.
  }
  return presets;
}
