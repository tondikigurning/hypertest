import { createContext, useContext } from "react";

export interface WorkspaceUser {
  id: string;
  role: "engineer" | "viewer";
  displayName: string;
  username?: string;
  mustChangePassword: boolean;
}
export const UserContext = createContext<WorkspaceUser | null>(null);
export const AuthActionsContext = createContext<{ logout: () => Promise<void>; busy: boolean } | null>(null);
export function useAuthActions() {
  const actions = useContext(AuthActionsContext);
  if (!actions) throw new Error("Workspace session unavailable.");
  return actions;
}
export function useWorkspaceUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("Workspace session unavailable.");
  return user;
}
