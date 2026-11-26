import { createHash, randomBytes } from "node:crypto";

export function createGithubOAuth({ clientId, clientSecret, callbackUrl, request = fetch }) {
  const callback = new URL(callbackUrl);
  if (
    callback.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(callback.hostname) ||
    callback.pathname !== "/api/auth/github/callback" ||
    callback.search ||
    callback.hash
  ) {
    throw new Error("GitHub OAuth callback must be the configured loopback callback URL.");
  }
  if (!clientId || !clientSecret) throw new Error("GitHub OAuth is not configured.");
  return {
    start() {
      const state = randomBytes(32).toString("base64url");
      const verifier = randomBytes(32).toString("base64url");
      const challenge = createHash("sha256").update(verifier).digest("base64url");
      const url = new URL("https://github.com/login/oauth/authorize");
      url.search = new URLSearchParams({
        client_id: clientId,
        scope: "offline_access",
        redirect_uri: callback.href,
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      }).toString();
      return { state, verifier, url: url.href };
    },
    async exchange(code, verifier) {
      if (typeof code !== "string" || !code || code.length > 2048 || !/^[A-Za-z0-9_-]{43}$/.test(verifier || ""))
        throw new Error("GitHub authorization failed.");
      const response = await request("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: callback.href,
          code_verifier: verifier,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("GitHub authorization failed.");
      const tokens = await response.json();
      if (typeof tokens.access_token !== "string" || !tokens.access_token || tokens.error)
        throw new Error("GitHub authorization failed.");
      const profileResponse = await request("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Automation-Workspace",
        },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (!profileResponse.ok) throw new Error("GitHub identity could not be verified.");
      const profile = await profileResponse.json();
      if (
        !Number.isSafeInteger(profile.id) ||
        profile.id <= 0 ||
        typeof profile.login !== "string" ||
        !profile.login ||
        profile.login.length > 256
      )
        throw new Error("GitHub identity could not be verified.");
      const expiry = (seconds) =>
        Number.isSafeInteger(seconds) && seconds > 0 ? new Date(Date.now() + seconds * 1000) : null;
      return {
        githubId: String(profile.id),
        displayName: profile.login,
        accessToken: tokens.access_token,
        refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : undefined,
        expiresAt: expiry(tokens.expires_in),
        refreshExpiresAt: expiry(tokens.refresh_token_expires_in),
      };
    },
  };
}
