import { createConnection } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { localApiHost, localApiPort } from "./shared/local-api-config.mjs";

const host = process.env.AUTOMATION_WEB_HOST ?? "127.0.0.1";
const port = Number(process.env.AUTOMATION_WEB_PORT ?? 3110);
const apiWaitTimeoutMs = 60_000;
const apiRetryIntervalMs = 250;

await waitForLocalApi();

const server = await createServer({
  configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
  server: { host, port, strictPort: true },
});

await server.listen();
const address = server.httpServer.address();
if (!address || typeof address === "string") throw new Error("Vite did not expose its listening address.");
process.stdout.write(`\n  VITE ready\n\n  \u279c  Local:   http://${host}:${address.port}/\n\n`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => void server.close().finally(() => process.exit(0)));
}

async function waitForLocalApi() {
  const deadline = Date.now() + apiWaitTimeoutMs;
  let waitMessageShown = false;

  while (Date.now() < deadline) {
    if (await canConnectToLocalApi()) return;
    if (!waitMessageShown) {
      process.stdout.write(
        `Waiting for the Automation API at http://${localApiHost}:${localApiPort} before starting Vite...\n`,
      );
      waitMessageShown = true;
    }
    await delay(apiRetryIntervalMs);
  }

  throw new Error(
    `The Automation API did not start at http://${localApiHost}:${localApiPort} within ${apiWaitTimeoutMs / 1000} seconds. Check the API process output.`,
  );
}

function canConnectToLocalApi() {
  return new Promise((resolve) => {
    const socket = createConnection({ host: localApiHost, port: localApiPort });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}
