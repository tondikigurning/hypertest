import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { automationCatalog } from "./server/modules/catalog/scenario-catalog.mjs";

const root = resolve(import.meta.dirname, "e2e/tests/bdd/features");

export default defineConfig({
  base: "/",
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:3111", changeOrigin: false },
    },
  },
  plugins: [
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
