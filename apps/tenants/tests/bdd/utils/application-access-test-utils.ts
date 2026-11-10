import type { Locator, Page } from "@playwright/test";

/** Stable application-access contract for BDD — modules/roles change infrequently. */
export const DEFAULT_APPLICATION_ACCESS = {
    module: "User Management",
    role: "User Management Administrator",
} as const;

type Scope = Page | Locator;

/**
 * Role chip inside a module card.
 * DOM: [data-slot=card] > [data-slot=card-content] > h3{module} + div > button{role}
 */
export function applicationAccessRoleButton(scope: Scope, module: string, role: string): Locator {
    return scope
        .getByRole("heading", { name: module, level: 3 })
        .locator("xpath=..")
        .getByRole("button", { name: role, exact: true });
}
