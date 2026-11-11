export interface CatalogScenario {
  key: string;
  id: string;
  hasId: boolean;
  title: string;
  feature: string;
  module: string;
  file: string;
  line: number;
  tags: Array<string>;
  background: Array<string>;
  steps: Array<string>;
  outline: boolean;
  availability: "unknown" | "unavailable";
  availabilityReasons: Array<string>;
}
export interface AutomationScenario extends CatalogScenario {
  category: string;
  type: string;
  method: string;
  catalogTags: Array<string>;
  expect: string;
  status: string;
  lastRun: string;
  duration: string;
  evidenceLabel: string;
  evidenceUrl: string;
}
export function parseFeature(content: string, file: string): Array<CatalogScenario>;
export function scenarioCatalog(root: string): Array<CatalogScenario>;
export function enrichScenario(scenario: CatalogScenario): AutomationScenario;
export function automationCatalog(root: string): Array<AutomationScenario>;
