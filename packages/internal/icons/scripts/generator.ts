import { log } from "node:console";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getIconsCSS } from "@iconify/utils";
import icons from "../icon.mjs";

// Load file and parse it
const __dirname = dirname(fileURLToPath(import.meta.url));
const iconPath = join(__dirname, "..", "node_modules/@iconify-json/tabler/icons.json");
const iconSet = JSON.parse(await readFile(iconPath, "utf8")) as IconSet;

const css = generateCSS(iconSet, icons);
const _sprite = generateSprite(iconSet, icons);
const types = generateTypes(icons);

// Ensure src/gen directory exists before writing files
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const genDir = join(__dirname, "..", "src", "gen");
if (!existsSync(genDir)) {
  await mkdir(genDir, { recursive: true });
}

// Save generated code and log the size
await Promise.all([
  writer("CSS", join(genDir, "icon.css"), await css),
  // writer("SVG Sprite", join(genDir, "icon.svg"), await sprite),
  writer("Types", join(genDir, "types.ts"), await types),
]);

// -------------------------------------------------------------------------
// ----------------------- Generator function  -----------------------------
// -------------------------------------------------------------------------

type IconSet = Parameters<typeof getIconsCSS>[0];

async function generateSprite(iconSet: IconSet, icons: Array<string>) {
  const symbols = icons.map((icon) => {
    const iconData = iconSet.icons[icon];

    if (!iconData) {
      throw new Error(`Icon "${icon}" not found in icon set.`);
    }

    return `<symbol id="i-${icon}" viewBox="0 0 24 24">${iconData.body}</symbol>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="0" height="0">',
    "<defs>", // for semantics: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/defs
    ...symbols,
    "</defs>",
    "</svg>",
  ].join("\n");
}

async function generateCSS(iconSet: IconSet, icons: Array<string>) {
  const content = getIconsCSS(iconSet, icons, { iconSelector: ".i-{name}" });
  return [
    "/* biome-ignore format: generated file */",
    "/* This file is generated, do not edit manually */",
    "",
    content,
  ].join("\n");
}

async function generateTypes(iconNames: Array<string>) {
  const icons = iconNames.map((icon) => `\t "${icon}",`);
  return [
    "// biome-ignore format: generated file",
    "// This file is generated, do not edit manually",
    "",
    "export const icons = [",
    ...icons,
    "] as const;",
    "",
    "export type IconName = typeof icons[number];",
  ].join("\n");
}

async function writer(label: string, filepath: string, content: string) {
  await writeFile(filepath, content, "utf8");
  log(`${label} saved at: ${filepath}\n`);
}

// await writeFile(
//   join("icon.mjs"),
//   [
//     "// biome-ignore format: generated file",
//     `export default [`, //
//     ...Object.keys(iconSet.icons).map((icon) => `\t// "${icon}",`),
//     `];`,
//   ].join("\n"),
//   "utf8",
// );
