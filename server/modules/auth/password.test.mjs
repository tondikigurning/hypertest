import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, normalizeUsername, verifyPassword } from "./password.mjs";

test("viewer credentials normalize usernames and use salted one-way hashes", async () => {
  assert.equal(normalizeUsername("  Example.User  "), "example.user");
  assert.throws(() => normalizeUsername("invalid user"));
  const first = await hashPassword("a secure password");
  const second = await hashPassword("a secure password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("a secure password", first), true);
  assert.equal(await verifyPassword("incorrect password", first), false);
  assert.equal(await verifyPassword("a secure password", "scrypt$invalid"), false);
  await assert.rejects(hashPassword("short"));
});
