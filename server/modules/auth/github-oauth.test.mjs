import assert from "node:assert/strict";
import test from "node:test";
import { createGithubOAuth } from "./github-oauth.mjs";

test("GitHub OAuth binds PKCE and validates the provider identity", async () => {
  const requests = [];
  const oauth = createGithubOAuth({
    clientId: "client",
    clientSecret: "secret",
    callbackUrl: "http://localhost:3110/api/auth/github/callback",
    request: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        json: async () =>
          requests.length === 1 ? { access_token: "token", expires_in: 3600 } : { id: 123, login: "engineer" },
      };
    },
  });
  const start = oauth.start();
  assert.equal(new URL(start.url).searchParams.get("state"), start.state);
  assert.equal(new URL(start.url).searchParams.get("scope"), "offline_access");
  assert.equal(new URL(start.url).searchParams.get("code_challenge_method"), "S256");
  const identity = await oauth.exchange("code", start.verifier);
  assert.equal(identity.githubId, "123");
  assert.equal(JSON.parse(requests[0].options.body).code_verifier, start.verifier);
  assert.equal(requests[1].options.headers.Authorization, "Bearer token");
  await assert.rejects(oauth.exchange("", start.verifier));
  assert.throws(() =>
    createGithubOAuth({
      clientId: "x",
      clientSecret: "x",
      callbackUrl: "https://example.com/api/auth/github/callback",
    }),
  );
});
