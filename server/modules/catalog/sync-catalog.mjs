import { closeDatabase } from "../../database.mjs";
import { syncScenarioCatalog } from "./catalog-sync.mjs";

try {
  const count = await syncScenarioCatalog();
  process.stdout.write(`Stored ${count} BDD scenarios in automation_scenario_catalog.\n`);
} finally {
  await closeDatabase();
}
