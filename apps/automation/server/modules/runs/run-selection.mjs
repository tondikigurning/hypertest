const validId = (id) => typeof id === "string" && /^[A-Z]{2,4}_[A-Z0-9_]+_E2E_\d{3,4}$/.test(id);

/** Resolve the requested scope from the server-side catalogs, never from client-supplied IDs. */
export function resolveSelection(input, features, catalog) {
  const selection = input?.kind ? input : { kind: "scenario", scenarioId: input?.scenarioId };
  let candidates;
  if (selection.kind === "scenario" && validId(selection.scenarioId)) {
    candidates = features.filter((item) => item.id === selection.scenarioId);
  } else if (selection.kind === "feature" && typeof selection.file === "string") {
    candidates = features.filter((item) => item.file === selection.file);
    const rows = catalog.filter((item) => item.file === selection.file);
    if (
      rows.length !== candidates.length ||
      rows.some((row) => row.availability === "unavailable" || !candidates.some((item) => item.key === row.key))
    ) {
      throw new Error(
        "The feature catalog does not match its scenarios. Refresh the catalog before running this feature.",
      );
    }
  } else if (
    selection.kind === "category" &&
    typeof selection.file === "string" &&
    typeof selection.category === "string"
  ) {
    const rows = catalog.filter(
      (item) => item.file === selection.file && (item.category || "Uncategorized") === selection.category,
    );
    if (rows.some((item) => item.availability === "unavailable"))
      throw new Error("This category contains scenarios without a unique, executable feature entry.");
    candidates = rows.map((row) => features.find((item) => item.key === row.key));
  } else throw new Error("Invalid run selection.");
  if (
    !candidates.length ||
    candidates.some(
      (item) =>
        !item ||
        !validId(item.id) ||
        item.availability === "unavailable" ||
        features.filter((other) => other.id === item.id).length !== 1,
    )
  ) {
    throw new Error("This selection contains missing or ambiguous scenario IDs and cannot be run as a group.");
  }
  const ids = [...new Set(candidates.map((item) => item.id))];
  if (ids.length !== candidates.length) throw new Error("This selection contains duplicate scenario IDs.");
  return { selection, ids, files: [...new Set(candidates.map((item) => item.file))] };
}

export function featureFilePatterns(files) {
  // Playwright interprets positional file arguments as regular expressions.
  // These paths come from the validated server catalog, not the request body.
  return files.map((file) => {
    const path = `tests/bdd/features/${file}.spec.js`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return `${path}$`;
  });
}

export function selectionPattern(ids) {
  // Playwright applies grep to normalized tags without their leading `@`.
  // Exclude @ref:<id> tags so selecting a shared scenario does not also run
  // every feature that references it.
  return `(?<!ref:)(?:${ids.join("|")})(?![A-Za-z0-9_])`;
}

export function missingSelectedIds(ids, suites) {
  const matched = new Set();
  const walk = (suite) => {
    for (const spec of suite.specs || [])
      for (const id of ids) if (spec.tags?.includes(id) || spec.tags?.includes(`@${id}`)) matched.add(id);
    for (const child of suite.suites || []) walk(child);
  };
  for (const suite of suites || []) walk(suite);
  return ids.filter((id) => !matched.has(id));
}
