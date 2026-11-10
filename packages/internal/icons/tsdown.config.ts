import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    icons: "./src/gen/types.ts",
  },
  platform: "neutral",
  dts: false,
});
