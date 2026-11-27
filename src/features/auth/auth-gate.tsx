import "./auth.css";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { FormField, PrimaryButton, TextInput } from "../../components";
import { setAgentPrincipal } from "../agent/agent-api";
import { clearVariables, setVariablesPrincipal } from "../runs/run-variables";
import { AuthActionsContext, UserContext, type WorkspaceUser } from "./auth-context";

const sessionChangeKey = "automation-session-change";
function signalSessionChange() {
  try {
    localStorage.setItem(sessionChangeKey, crypto.randomUUID());
  } catch {
    /* The current tab remains usable when storage is unavailable. */
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WorkspaceUser | null>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ user: WorkspaceUser | null }>;
      })
      .then((data) => {
        setVariablesPrincipal(data.user?.id || "");
        setAgentPrincipal(data.user?.id || "");
        setUser(data.user);
        const url = new URL(window.location.href);
        if (data.user && url.searchParams.get("auth") === "github") {
          url.searchParams.delete("auth");
          window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
          signalSessionChange();
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setUser(null);
          setError("Could not restore your session. Try again.");
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== sessionChangeKey) return;
      clearVariables();
      setVariablesPrincipal("");
      setAgentPrincipal("");
      window.location.reload();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(user?.mustChangePassword ? "/api/auth/password" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          user?.mustChangePassword ? { currentPassword: password, newPassword } : { username, password },
        ),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not sign in.");
      }
      setPassword("");
      setNewPassword("");
      signalSessionChange();
      if (user?.mustChangePassword) {
        setUser(null);
        setNotice("Password changed. Sign in with your new password.");
      } else {
        const data = (await response.json()) as { user: WorkspaceUser };
        setVariablesPrincipal(data.user.id);
        setAgentPrincipal(data.user.id);
        setUser(data.user);
        if (window.location.pathname.startsWith("/auth/")) window.location.assign("/");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out.");
      clearVariables();
      setVariablesPrincipal("");
      setAgentPrincipal("");
      signalSessionChange();
      window.location.assign("/auth/login");
    } catch {
      setError("Could not sign out. Try again.");
      setBusy(false);
    }
  }
  if (user === undefined)
    return (
      <main className="auth-screen">
        <p className="auth-status" role="status">
          Restoring your session...
        </p>
      </main>
    );
  if (!user || user.mustChangePassword)
    return (
      <main className="auth-screen">
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-brand">
            <img src={new URL("../../assets/hyperscal-icon.svg", import.meta.url).href} width="32" height="32" alt="" />
            <span>HyperTest</span>
          </div>
          <p className="auth-eyebrow">AUTOMATION WORKSPACE</p>
          <h1 id="auth-title">{user ? "Set a new password" : "Welcome back"}</h1>
          <p className="auth-intro">
            {user
              ? "Choose a new password to continue. Your temporary password will no longer work."
              : "Sign in to explore scenarios, review results, and work with your team."}
          </p>
          {!user && (
            <>
              <a className="auth-github" href="/api/auth/github">
                Continue with GitHub <span aria-hidden="true">&rarr;</span>
              </a>
              <div className="auth-divider">
                <span>or sign in as a viewer</span>
              </div>
            </>
          )}
          <form className="auth-form" onSubmit={submit}>
            {!user && (
              <FormField htmlFor="auth-username" label="Username">
                <TextInput
                  id="auth-username"
                  name="username"
                  autoComplete="username"
                  spellCheck={false}
                  value={username}
                  onValueChange={setUsername}
                  required
                />
              </FormField>
            )}
            <FormField htmlFor="auth-password" label={user ? "Current password" : "Password"}>
              <TextInput
                id="auth-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onValueChange={setPassword}
                required
              />
            </FormField>
            {user && (
              <FormField htmlFor="auth-new-password" label="New password">
                <TextInput
                  id="auth-new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  aria-describedby="password-hint"
                  value={newPassword}
                  onValueChange={setNewPassword}
                  required
                />
                <span id="password-hint" className="auth-hint">
                  Use at least 12 characters.
                </span>
              </FormField>
            )}
            {notice && (
              <p className="members-success" role="status">
                {notice}
              </p>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            {!user && new URLSearchParams(window.location.search).get("error") === "github" && (
              <p className="auth-error" role="alert">
                GitHub sign-in failed or was cancelled. Try again.
              </p>
            )}
            <PrimaryButton className="auth-submit" type="submit" disabled={busy}>
              {busy ? "Please wait..." : user ? "Update password" : "Sign in"}
            </PrimaryButton>
          </form>
          {user && (
            <button className="auth-signout" type="button" onClick={logout} disabled={busy}>
              Sign out instead
            </button>
          )}
          {!user && <p className="auth-footer">Need a viewer account? Ask an Engineer to create one.</p>}
        </section>
      </main>
    );
  return (
    <UserContext.Provider value={user}>
      <AuthActionsContext.Provider value={{ logout, busy }}>
        {error && <p role="alert">{error}</p>}
        {children}
      </AuthActionsContext.Provider>
    </UserContext.Provider>
  );
}
