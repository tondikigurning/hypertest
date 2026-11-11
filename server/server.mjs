import { createApp } from "./app.mjs";
import { syncScenarioCatalog } from "./modules/catalog/catalog-sync.mjs";

// This service runs only on the developer's machine until hosted access and execution are implemented.
const host = "127.0.0.1";
const port = 3111;

const scenarioCount = await syncScenarioCatalog();
process.stdout.write(`Automation catalog ready: ${scenarioCount} scenarios loaded into PostgreSQL.\n`);
createApp().listen(port, host);
