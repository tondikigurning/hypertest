import { useState } from "react";
import { effortPresetKey, isEffortLevel, readEffortPresets, writeEffortPreset } from "./agent-effort-preferences";

export function useAgentEffort(provider?: string, model?: string) {
  const [presets, setPresets] = useState(() => readEffortPresets(localStorage));
  const saved = provider && model ? presets[effortPresetKey(provider, model)] : undefined;
  const effort = saved && !(provider === "google" && saved === "xhigh") ? saved : "medium";
  return {
    effort,
    googleAdapter: provider === "google",
    select: (value: string) => {
      if (!provider || !model || !isEffortLevel(value) || (provider === "google" && value === "xhigh")) return;
      setPresets(writeEffortPreset(localStorage, provider, model, value));
    },
  };
}
