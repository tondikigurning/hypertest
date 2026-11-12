import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";

const root = resolve(import.meta.dirname, "../../../");
const localEnv = existsSync(resolve(root, ".env.local")) ? dotenv.parse(readFileSync(resolve(root, ".env.local"))) : {};
const generatedKeyFile = resolve(root, ".cache", "automation-agent", "encryption.key");
const aad = Buffer.from("hypertest-automation-agent-key:v1");

function encryptionKey({ keyFile = generatedKeyFile, environment = process.env, fileEnvironment = localEnv } = {}) {
  const encoded =
    environment.AUTOMATION_AGENT_ENCRYPTION_KEY ||
    fileEnvironment.AUTOMATION_AGENT_ENCRYPTION_KEY ||
    (existsSync(keyFile) ? readFileSync(keyFile, "utf8").trim() : undefined);
  if (typeof encoded !== "string" || !encoded) return undefined;
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(encoded))
    throw new Error("AUTOMATION_AGENT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  const key = Buffer.from(encoded, "base64url");
  if (key.length !== 32) throw new Error("AUTOMATION_AGENT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function initializeAgentEncryption(options = {}) {
  if (encryptionKey(options)) return;
  const keyFile = options.keyFile || generatedKeyFile;
  mkdirSync(dirname(keyFile), { recursive: true, mode: 0o700 });
  try {
    writeFileSync(keyFile, `${randomBytes(32).toString("base64url")}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  if (!encryptionKey(options)) throw new Error("Could not initialize local provider-key encryption.");
}

export function isAgentEncryptionConfigured() {
  return Boolean(encryptionKey());
}

export function encryptAgentSecret(value) {
  const key = encryptionKey();
  if (!key) throw new Error("Configure AUTOMATION_AGENT_ENCRYPTION_KEY before saving provider API keys.");
  if (typeof value !== "string" || !value.trim()) throw new Error("Enter a provider API key.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(value.trim(), "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptAgentSecret(value) {
  const key = encryptionKey();
  if (!key) throw new Error("Configure AUTOMATION_AGENT_ENCRYPTION_KEY before using provider API keys.");
  if (typeof value !== "string") throw new Error("The saved provider API key is unavailable.");
  const [version, encodedIv, encodedTag, encodedCiphertext, ...extra] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext || extra.length)
    throw new Error("The saved provider API key is invalid.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encodedIv, "base64url"));
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, "base64url")), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    throw new Error("The saved provider API key could not be decrypted. Check the configured encryption key.");
  }
}
