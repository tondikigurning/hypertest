import { useEffect, useRef, useState } from "react";
import { useAuthActions, useWorkspaceUser } from "./auth-context";
import { MembersDialog } from "./members-dialog";
import { PullRequestsDialog } from "./pull-requests-dialog";

export function AccountControls() {
  const user = useWorkspaceUser();
  const { logout, busy } = useAuthActions();
  const [membersOpen, setMembersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pullRequestsOpen, setPullRequestsOpen] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  const menuButton = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current) {
        menu.current.open = false;
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);
  function openDialog(open: () => void) {
    if (menu.current) menu.current.open = false;
    open();
  }
  return (
    <div className="account-controls">
      <details ref={menu} className="account-menu" onToggle={(event) => setMenuOpen(event.currentTarget.open)}>
        <summary ref={menuButton} aria-label={`Account menu: ${user.displayName}, ${user.role}`}>
          <span className="account-avatar" aria-hidden="true">
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="account-identity">
            <strong>{user.displayName}</strong>
            <small>{user.role}</small>
          </span>
          <span className="account-chevron" aria-hidden="true">
            &#8964;
          </span>
        </summary>
        <div className="account-menu-panel">
          <button type="button" onClick={() => openDialog(() => setPullRequestsOpen(true))}>
            Pull requests
          </button>
          {user.role === "engineer" && (
            <button type="button" onClick={() => openDialog(() => setMembersOpen(true))}>
              User management
            </button>
          )}
          <button type="button" onClick={() => void logout()} disabled={busy}>
            Sign out
          </button>
        </div>
      </details>
      {membersOpen && <MembersDialog onClose={() => setMembersOpen(false)} returnFocus={menuButton} />}
      {pullRequestsOpen && <PullRequestsDialog onClose={() => setPullRequestsOpen(false)} returnFocus={menuButton} />}
    </div>
  );
}
