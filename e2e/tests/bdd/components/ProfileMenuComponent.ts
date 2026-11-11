import type { Locator, Page } from "@playwright/test";

export class ProfileMenuComponent {
    constructor(private readonly page: Page) {}

    private get avatar(): Locator {
        return this.page.locator('[data-testid="user-profile-avatar"]').first();
    }

    private get trigger(): Locator {
        return this.page
            .locator('button[data-slot="dropdown-menu-trigger"]')
            .filter({ has: this.page.locator('[data-testid="user-profile-avatar"]') })
            .first();
    }

    private get content(): Locator {
        return this.page.locator('[data-slot="dropdown-menu-content"][role="menu"]').first();
    }

    private get logoutItem(): Locator {
        return this.page.locator('[data-testid="logout-menu-item"]').first();
    }

    async open(): Promise<void> {
        await this.page.waitForTimeout(5_000);
        await this.avatar.click();

        const openedFirstTry = await this.logoutItem.isVisible().catch(() => false);

        if (!openedFirstTry) {
            await this.page.waitForTimeout(5_000);
            await this.avatar.click();
        }

        await this.logoutItem.waitFor({ state: "visible", timeout: 5_000 });
    }

    async logout(): Promise<void> {
        await this.open();
        await this.logoutItem.waitFor({ state: "visible" });
        await this.logoutItem.click();
    }
}
