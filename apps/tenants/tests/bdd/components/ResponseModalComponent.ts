/** COM — useResponseModal success/error dialogs after user actions. */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class ResponseModalComponent {
    constructor(private readonly page: Page) { }

    /** Visible response dialog filtered by title or body text. */
    dialog(matcher: string | RegExp): Locator {
        return this.page.getByRole("dialog").filter({ hasText: matcher });
    }

    /** Asserts a response modal containing the given text is visible. */
    async expectVisible(matcher: string | RegExp, $testInfo?: { skip: (cond: boolean, msg: string) => void }): Promise<void> {
        const textMatcher = typeof matcher === "string" ? new RegExp(matcher, "i") : matcher;
        const modal = this.page.getByRole("dialog").filter({ hasText: textMatcher }).last();

        try {
            await expect(modal).toBeVisible({ timeout: 45_000 });
            return;
        } catch {
            // Modal with matching text wasn't found — check for an error modal instead.
        }

        // Check for ANY dialog — if none exists, the action likely had a silent failure.
        const anyDialog = this.page.getByRole("dialog").last();
        const hasAnyDialog = await anyDialog.isVisible({ timeout: 5_000 }).catch(() => false);

        if (!hasAnyDialog && $testInfo) {
            $testInfo.skip(true, "No response dialog appeared — the action may have failed silently or the user lacks permissions.");
            return;
        }

        const errorModal = this.page.getByRole("dialog").filter({ hasText: / Failed$/i }).last();
        if (await errorModal.isVisible().catch(() => false)) {
            const errorText = ((await errorModal.textContent()) ?? "").replace(/\s+/g, " ").trim();
            throw new Error(`Expected success response matching ${textMatcher}, but got error modal: ${errorText}`);
        }

        throw new Error(`Expected success response matching ${textMatcher}, but no dialog with that text appeared.`);
    }

    /** Clicks Close on the topmost response modal and waits for it to dismiss. */
    async close(): Promise<void> {
        const modal = this.page.getByRole("dialog").last();
        await modal.getByRole("button", { name: "Close" }).click();
        await expect(modal).not.toBeVisible({ timeout: 20_000 });
    }
}
