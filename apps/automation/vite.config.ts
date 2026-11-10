import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { automationCatalog } from "./server/modules/catalog/scenario-catalog.mjs";

const root = resolve(import.meta.dirname, "../tenants/tests/bdd/features");

function normalizeBasePath() {
  const redirect = (
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse,
    next: () => void,
  ) => {
    const url = request.url ?? "";
    if (url === "/automation/" || url.startsWith("/automation/?")) {
      response.statusCode = 308;
      response.setHeader("Location", `/automation${url.slice("/automation/".length)}`);
      response.end();
      return;
    }
    if (url === "/automation" || url.startsWith("/automation?")) {
      request.url = `/automation/${url.slice("/automation".length)}`;
    }
    next();
  };

  return {
    name: "automation-base-path-normalizer",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server: import("vite").PreviewServer) {
      server.middlewares.use(redirect);
    },
  };
}

export default defineConfig({
  base: "/automation/",
  server: {
    proxy: {
      "/automation/api": { target: "http://127.0.0.1:3111", changeOrigin: false },
    },
  },
  plugins: [
    normalizeBasePath(),
    react(),
    tailwindcss(),
    {
      name: "automation-catalog",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "scenario-catalog.json",
          source: JSON.stringify(automationCatalog(root)),
        });
      },
    },
  ],
});
