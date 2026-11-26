import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

export function normalizeUsername(value) {
  if (typeof value !== "string") throw new Error("Invalid username.");
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(username)) throw new Error("Invalid username.");
  return username;
}

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 1024) {
    throw new Error("Password must contain at least 12 characters and at most 1024 bytes.");
  }
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 32, parameters);
  return `scrypt$32768$8$3$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password, stored) {
  if (typeof password !== "string" || Buffer.byteLength(password, "utf8") > 1024 || typeof stored !== "string")
    return false;
  const parts = stored.split("$");
  if (
    parts.length !== 6 ||
    parts[0] !== "scrypt" ||
    parts[1] !== "32768" ||
    parts[2] !== "8" ||
    !["1", "3"].includes(parts[3])
  )
    return false;
  if (!/^[A-Za-z0-9_-]{22}$/.test(parts[4]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[5])) return false;
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  const actual = await scrypt(password, salt, 32, { ...parameters, p: Number(parts[3]) });
  return timingSafeEqual(actual, expected);
}
