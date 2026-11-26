import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { localApiHost, localApiPort } from "./server/shared/local-api-config.mjs";

export default defineConfig({
  base: "/",
  server: {
    proxy: {
      "/api": { target: `http://${localApiHost}:${localApiPort}`, changeOrigin: false },
    },
  },
  plugins: [react(), tailwindcss()],
});
