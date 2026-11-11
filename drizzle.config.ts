import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/modules/results/schema.mjs",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.AUTOMATION_DATABASE_URL || "postgresql://automation:automation@127.0.0.1:55432/automation",
  },
});
