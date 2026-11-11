import { readdirSync, readFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";

/** Preserve source order, including backgrounds, example tags and step arguments. */
export function parseFeature(content, file) {
  const lines = content.split(/\r?\n/);
  const feature = content.match(/^\s*Feature:\s*(.+)$/m)?.[1]?.trim() ?? basename(file, ".feature");
  const module = file.split("/")[0];
  const scenarios = [];
  let pending = [],
    featureTags = [],
    ruleTags = [],
    featureBackground = [],
    ruleBackground = [];
  let inRule = false,
    current,
    section = "",
    docString = "";
  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    if (docString) {
      const target =
        section === "featureBackground"
          ? featureBackground
          : section === "ruleBackground"
            ? ruleBackground
            : current?.steps;
      target?.push(line);
      if (line.startsWith(docString)) docString = "";
      continue;
    }
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith('"""') || line.startsWith("```")) {
      const target =
        section === "featureBackground"
          ? featureBackground
          : section === "ruleBackground"
            ? ruleBackground
            : current?.steps;
      if (target) {
        target.push(line);
        docString = line.slice(0, 3);
      }
      continue;
    }
    if (line.startsWith("@")) {
      pending.push(...line.split(/\s+/).filter((t) => t.startsWith("@")));
      continue;
    }
    if (/^Feature:/.test(line)) {
      featureTags = pending;
      pending = [];
      continue;
    }
    if (/^Rule:/.test(line)) {
      inRule = true;
      ruleTags = pending;
      pending = [];
      ruleBackground = [];
      current = undefined;
      section = "";
      continue;
    }
    if (/^Background:/.test(line)) {
      section = inRule ? "ruleBackground" : "featureBackground";
      current = undefined;
      pending = [];
      continue;
    }
    const match = line.match(/^Scenario(?: Outline| Template)?:\s*(.+)$/);
    if (match) {
      const id = pending.find((tag) => /^@[A-Z]{2,4}_[A-Z0-9_]+_E2E_\d{3,4}$/.test(tag))?.slice(1);
      current = {
        key: `${file}:${index + 1}`,
        id: id ?? "",
        hasId: Boolean(id),
        title: match[1],
        feature,
        module,
        file,
        line: index + 1,
        tags: [...new Set([...featureTags, ...ruleTags, ...pending])],
        background: [...featureBackground, ...ruleBackground],
        steps: [],
        outline: /^Scenario (?:Outline|Template):/.test(line),
      };
      scenarios.push(current);
      pending = [];
      section = "scenario";
      continue;
    }
    if (/^Examples:/.test(line) && current) {
      current.steps.push(...pending, line);
      pending = [];
      section = "examples";
      continue;
    }
    if (
      /^(?:(?:Given|When|Then|And|But)\b|\*\s)/.test(line) ||
      line.startsWith("|") ||
      line.startsWith('"""') ||
      line.startsWith("```")
    ) {
      if (section === "featureBackground") featureBackground.push(line);
      else if (section === "ruleBackground") ruleBackground.push(line);
      else if (current) current.steps.push(line);
    }
  }
  return scenarios;
}

export function scenarioCatalog(root) {
  const scenarios = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith(".feature"))
        scenarios.push(...parseFeature(readFileSync(file, "utf8"), relative(root, file).replaceAll("\\", "/")));
    }
  }
  walk(root);
  const idCounts = new Map();
  for (const scenario of scenarios) if (scenario.hasId) idCounts.set(scenario.id, (idCounts.get(scenario.id) ?? 0) + 1);
  for (const scenario of scenarios) {
    const reasons = [];
    if (!scenario.hasId) reasons.push("A stable scenario ID is required for selection.");
    else if (idCounts.get(scenario.id) > 1) reasons.push("The scenario ID is used more than once in the catalog.");
    if (scenario.outline && !scenario.steps.some((step) => /^Examples:/.test(step))) {
      reasons.push("This outline has no examples in its feature file.");
    }
    scenario.availability = reasons.length ? "unavailable" : "unknown";
    scenario.availabilityReasons = reasons;
  }
  return scenarios;
}

/** Build the Automation catalog from the versioned feature sources. */
export function automationCatalog(root) {
  return scenarioCatalog(root).map((scenario) => {
    const tag = (prefix) => scenario.tags.find((value) => value.startsWith(prefix))?.slice(prefix.length);
    const flow = tag("@flow:")
      ?.replace(/_FLOW$/, "")
      .split("_");
    const category =
      flow
        ?.slice(flow.length > 2 ? 2 : flow.length === 2 ? 1 : 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ") || scenario.feature;
    let expect = tag("@expect:");
    if (expect) {
      try {
        expect = decodeURIComponent(expect);
      } catch {
        /* Keep the authored value. */
      }
    }
    if (!expect) {
      let asserting = false;
      for (const step of scenario.steps) {
        const match = step.match(/^(Given|When|Then|And|But)\s+(.+)$/);
        if (!match) continue;
        if (match[1] === "Then") asserting = true;
        else if (match[1] === "Given" || match[1] === "When") asserting = false;
        if (asserting) expect = match[2];
      }
    }
    return {
      ...scenario,
      category,
      type: tag("@type:") || "positive",
      method: "e2e",
      catalogTags: scenario.tags
        .filter((value) => ["@smoke", "@regression", "@quarantine", "@fixme"].includes(value))
        .map((value) => value.slice(1)),
      expect: expect || scenario.title,
      status: "",
      lastRun: "",
      duration: "",
      evidenceLabel: "View evidence",
      evidenceUrl: "",
    };
  });
}
