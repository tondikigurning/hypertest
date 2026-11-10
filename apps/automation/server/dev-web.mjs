import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const host = process.env.AUTOMATION_WEB_HOST ?? "127.0.0.1";
const port = Number(process.env.AUTOMATION_WEB_PORT ?? 3110);
const server = await createServer({
  configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
  server: { host, port, strictPort: true },
});

await server.listen();
const address = server.httpServer.address();
if (!address || typeof address === "string") throw new Error("Vite did not expose its listening address.");
process.stdout.write(`\n  VITE ready\n\n  \u279c  Local:   http://${host}:${address.port}/automation\n\n`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => void server.close().finally(() => process.exit(0)));
}
