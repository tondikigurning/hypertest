import fs from "node:fs";
import path from "node:path";

/** Load ignored .env.local files from the working directory upward. */
export function loadEnvLocal(
  dir: string,
  env: NodeJS.ProcessEnv = process.env,
  allowedKeys?: ReadonlySet<string>,
): void {
  let current = path.resolve(dir);
  const root = path.parse(current).root;

  while (current !== root) {
    const envPath = path.join(current, ".env.local");
    if (fs.existsSync(envPath)) parseEnvFile(envPath, env, allowedKeys);
    current = path.dirname(current);
  }

  const pkgEnvPath = path.resolve(dir, "packages/internal/test-utils/.env.local");
  if (fs.existsSync(pkgEnvPath) && pkgEnvPath !== path.resolve(dir, ".env.local")) {
    parseEnvFile(pkgEnvPath, env, allowedKeys);
  }
}

function parseEnvFile(filePath: string, env: NodeJS.ProcessEnv, allowedKeys?: ReadonlySet<string>): void {
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (allowedKeys && !allowedKeys.has(key)) continue;
    const value = trimmed.slice(separator + 1).trim();
    if (!env[key]) env[key] = value;
  }
}
