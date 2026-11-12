import { createApp } from "./app.mjs";
import { syncScenarioCatalog } from "./modules/catalog/catalog-sync.mjs";
import { localApiHost, localApiPort } from "./shared/local-api-config.mjs";

// This service runs only on the developer's machine until hosted access and execution are implemented.
const scenarioCount = await syncScenarioCatalog();
createApp().listen(localApiPort, localApiHost, () => {
  process.stdout.write(
    `Automation API listening at http://${localApiHost}:${localApiPort}; ${scenarioCount} scenarios loaded into PostgreSQL.\n`,
  );
});
