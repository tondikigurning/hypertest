import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

const GROUP_SEARCH_LABEL = "Search by name, email or role";
/** Manage-membership search debounce in useMembershipManager (ms). */
const SEARCH_DEBOUNCE_MS = 600;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function waitForDirectoryReady(scope: Page | Locator): Promise<void> {
    const loading = scope.getByText("Loading...", { exact: true });
    await loading.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => { });
}

function resolvePage(scope: Page | Locator): Page {
    if (typeof (scope as Locator).page === "function") {
        return (scope as Locator).page();
    }
    return scope as Page;
}

/**
 * Clicks Add on the first group shown in the membership directory (left aside).
 * Returns false when the directory is blocked or has no addable groups (caller may skip).
 *
 * Note: Locator.isVisible({ timeout }) does not wait — use expect().toPass for browse settle.
 */
export async function tryAddFirstAvailableGroupFromDirectory(scope: Page | Locator): Promise<boolean> {
    const root = scope;
    const directory = root.locator("aside");

    // Directory stays empty until an entity is selected ("Choose Entity First") and browse loads.
    const blocked = root.getByText("Choose Entity First", { exact: true });
    if (await blocked.isVisible().catch(() => false)) {
        return false;
    }

    const addButton = directory.getByRole("button", { name: /^Add /i }).first();
    const noResults = directory.getByText("No results", { exact: true });

    const hasAddableGroup = await expect(async () => {
        const loadingVisible = await directory.getByText("Loading...", { exact: true }).isVisible().catch(() => false);
        expect(loadingVisible).toBe(false);
        const canAdd = await addButton.isVisible().catch(() => false);
        const empty = await noResults.isVisible().catch(() => false);
        expect(canAdd || empty).toBe(true);
    })
        .toPass({ timeout: 20_000 })
        .then(async () => addButton.isVisible().catch(() => false))
        .catch(() => false);

    if (!hasAddableGroup) {
        return false;
    }

    await addButton.click();

    // After add, the directory action flips to Remove.
    await expect(directory.getByRole("button", { name: /^Remove /i }).first()).toBeVisible({
        timeout: 10_000,
    });
    return true;
}

/**
 * Clicks Add on the first group shown in the membership directory.
 * Throws when no addable group appears (use try* when the scenario may skip).
 */
export async function addFirstAvailableGroupFromDirectory(scope: Page | Locator): Promise<void> {
    const added = await tryAddFirstAvailableGroupFromDirectory(scope);
    if (!added) {
        throw new Error("No addable group membership found in the membership directory.");
    }
}

/**
 * Searches the membership directory and clicks Add for the given group.
 * Waits for debounced search (manage-groups dialog) and falls back to a partial name match.
 */
export async function addGroupMembershipFromDirectory(scope: Page | Locator, groupName: string): Promise<void> {
    const root = scope;
    const page = resolvePage(scope);
    const searchInput = root.getByRole("textbox", { name: GROUP_SEARCH_LABEL });

    await waitForDirectoryReady(root);
    await searchInput.fill("");
    await searchInput.fill(groupName);
    await page.waitForTimeout(SEARCH_DEBOUNCE_MS);
    await waitForDirectoryReady(root);

    const exactAddButton = root.getByRole("button", { name: `Add ${groupName}`, exact: true });

    await expect(async () => {
        const hasExact = await exactAddButton.isVisible().catch(() => false);
        if (hasExact) {
            await exactAddButton.click();
            return;
        }

        const tokens = groupName.split(/\s+/).filter((token) => token.length > 3);
        const needle = tokens.at(-1) ?? groupName;
        const partialAddButton = root
            .getByRole("button", { name: new RegExp(`^Add .*${escapeRegExp(needle)}`, "i") })
            .first();

        await expect(partialAddButton).toBeVisible({ timeout: 3_000 });
        await partialAddButton.click();
    }).toPass({ timeout: 20_000 });

    await expect(
        root.getByRole("complementary").getByRole("button", { name: new RegExp(`^Remove `, "i") }).first(),
    ).toBeVisible({ timeout: 10_000 });
}
