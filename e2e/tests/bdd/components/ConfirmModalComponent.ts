/** COM — useConfirmModal dialogs (Suspend, Activate, Remove, etc.). */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class ConfirmModalComponent {
    constructor(private readonly page: Page) { }

    dialog(title?: string): Locator {
        if (!title) return this.page.getByRole("dialog").first();
        return this.page.getByRole("dialog", { name: title });
    }

    confirmButton(label: string): Locator {
        return this.dialog().getByRole("button", { name: label });
    }

    // exact: true — avoids matching "Cancel Invitation" when dismissing confirm.
    cancelButton(): Locator {
        return this.dialog().getByRole("button", { name: "Cancel", exact: true });
    }

    async confirm(label: string): Promise<void> {
        const btn = this.confirmButton(label);
        await expect(btn).toBeEnabled({ timeout: 10_000 });
        await btn.click();
    }

    async cancel(): Promise<void> {
        await this.cancelButton().click();
        await this.dialog().waitFor({ state: "hidden", timeout: 20_000 });
    }

    async expectVisible(title: string): Promise<void> {
        await expect(this.dialog(title)).toBeVisible({ timeout: 10_000 });
    }

    async expectHidden(title: string): Promise<void> {
        await expect(this.dialog(title)).not.toBeVisible({ timeout: 10_000 });
    }
}
