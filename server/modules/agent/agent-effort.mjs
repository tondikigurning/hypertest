// Ordering and wire values understood by the adapters, never model capabilities.
const effortOrder = ["none", "default", "minimal", "low", "medium", "high", "xhigh", "max"];

export function agentEffortProfile(provider, model, metadata) {
  let advertised;
  if (provider === "anthropic") {
    // https://platform.claude.com/docs/en/api/models/retrieve
    const capability = metadata?.capabilities?.effort;
    if (capability?.supported === true)
      advertised = Object.keys(capability).filter((level) => capability[level]?.supported === true);
  } else if (provider !== "google") {
    // Optional model-list extensions on compatible endpoints. Parameter support
    // alone (e.g. supported_parameters) does not advertise the allowed values.
    advertised = metadata?.reasoning_efforts ?? metadata?.supported_reasoning_efforts;
  }
  const levels = Array.isArray(advertised)
    ? effortOrder.filter((level) => advertised.some((item) => item === level || item?.reasoning_effort === level))
    : [];
  return {
    provider,
    model,
    levels: levels.length ? levels : null,
    adaptiveThinking: provider === "anthropic" && metadata?.capabilities?.thinking?.types?.adaptive?.supported === true,
  };
}
