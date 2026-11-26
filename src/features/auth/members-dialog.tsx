import { type FormEvent, type RefObject, useCallback, useEffect, useState } from "react";
import { FormField, PrimaryButton, TextInput } from "../../components";
import { AccountDialog } from "./account-dialog";

interface Member {
  id: string;
  displayName: string;
  username: string | null;
  role: "engineer" | "viewer";
  status: "active" | "disabled";
}
export function MembersDialog({
  onClose,
  returnFocus,
}: {
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const [members, setMembers] = useState<Array<Member>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetId, setResetId] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/members", { signal });
    if (!response.ok) throw new Error("Could not load members.");
    const data = (await response.json()) as { users: Array<Member> };
    setMembers(data.users);
    setLoadError("");
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .catch(() => {
        if (!controller.signal.aborted) setLoadError("Could not load members. Close this dialog and try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(resetId ? `/api/members/${resetId}/password` : "/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetId ? { password } : { username, password }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Could not save viewer.");
      }
      setMessage(
        resetId
          ? "Password reset. The viewer must change it at sign-in."
          : "Viewer created. They must change their password at sign-in.",
      );
      setUsername("");
      setPassword("");
      setResetId("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save viewer.");
    } finally {
      setBusy(false);
    }
  }
  async function disable(member: Member) {
    if (!window.confirm(`Disable access for ${member.displayName}?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/members/${member.id}/disable`, { method: "POST" });
      if (!response.ok) throw new Error("Could not disable viewer.");
      setMessage("Viewer access disabled.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not disable viewer.");
    } finally {
      setBusy(false);
    }
  }
  const selected = members.find((member) => member.id === resetId);
  return (
    <AccountDialog
      titleId="members-title"
      title="User management"
      description="Manage viewer access to your workspace."
      onClose={onClose}
      returnFocus={returnFocus}
    >
      {loading ? (
        <p role="status">Loading members...</p>
      ) : loadError ? (
        <p className="auth-error" role="alert">
          {loadError}
        </p>
      ) : members.length === 0 ? (
        <p>No members yet.</p>
      ) : (
        <ul className="members-list">
          {members.map((member) => (
            <li className="members-row" key={member.id}>
              <div className="members-name">
                <strong>{member.displayName}</strong>
                <span>
                  {member.role} &middot; {member.status}
                </span>
              </div>
              {member.role === "viewer" && member.status === "active" && (
                <div className="members-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setResetId(member.id);
                      setPassword("");
                      setError("");
                      setMessage("");
                    }}
                  >
                    Reset password
                  </button>
                  <button type="button" disabled={busy} onClick={() => void disable(member)}>
                    Disable
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <section className="members-create" aria-labelledby="viewer-form-title">
        <h3 id="viewer-form-title">
          {resetId ? `Reset password for ${selected?.displayName || "viewer"}` : "Add a viewer"}
        </h3>
        <p className="members-description">
          {resetId
            ? "Set a temporary password. This signs the viewer out on all devices."
            : "Viewers can run scenarios and see results, but cannot author changes."}
        </p>
        <form className="members-form" onSubmit={submit}>
          {!resetId && (
            <FormField htmlFor="viewer-username" label="Username">
              <TextInput
                id="viewer-username"
                name="username"
                required
                autoComplete="off"
                spellCheck={false}
                value={username}
                onValueChange={setUsername}
              />
            </FormField>
          )}
          <FormField htmlFor="viewer-password" label="Temporary password">
            <TextInput
              id="viewer-password"
              name="password"
              required
              minLength={12}
              type="password"
              autoComplete="new-password"
              aria-describedby="viewer-password-hint"
              value={password}
              onValueChange={setPassword}
            />
          </FormField>
          <span className="auth-hint" id="viewer-password-hint">
            Use at least 12 characters. The viewer will change this at sign-in.
          </span>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="members-success" role="status">
              {message}
            </p>
          )}
          <div className="members-form-actions">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Saving..." : resetId ? "Reset password" : "Create viewer"}
            </PrimaryButton>
            {resetId && (
              <button
                className="members-cancel"
                type="button"
                onClick={() => {
                  setResetId("");
                  setPassword("");
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    </AccountDialog>
  );
}
