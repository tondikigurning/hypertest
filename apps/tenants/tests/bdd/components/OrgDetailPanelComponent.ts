/**
 * Org/Entity detail panel — full detail page with a left <aside> section nav.
 *
 * Unlike the shared DetailPanelComponent (Radix Tabs docked panel used by Users,
 * Work Orders, …), the Organization Management module renders its detail as a
 * route with an <aside> whose sections are `menuitem`s. The active section is
 * marked with `aria-current="page"`. This component models that layout so the
 * org/entity BDD steps can open sections, assert active state and close (back link).
 */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class OrgDetailPanelComponent {
    constructor(private readonly page: Page) {}

    /** The detail <aside> is identified by containing section `menuitem`s. */
    private get root(): Locator {
        return this.page
            .locator("aside, [role='complementary']")
            .filter({ has: this.page.getByRole("menuitem") })
            .first();
    }

    private tab(tabName: string): Locator {
        return this.root.getByRole("menuitem", {
            name: new RegExp(`^${escapeRegExp(tabName)}$`, "i"),
        });
    }

    async isVisible(): Promise<boolean> {
        return this.root.isVisible().catch(() => false);
    }

    async waitForVisible(timeout = 20_000): Promise<void> {
        await this.root.waitFor({ state: "visible", timeout });
    }

    async expectVisible(timeout = 20_000): Promise<void> {
        await expect(this.root).toBeVisible({ timeout });
    }

    async expectHidden(timeout = 10_000): Promise<void> {
        await expect(this.root).not.toBeVisible({ timeout });
    }

    /** Header action (e.g. "Organization Permission") — matches a button or section menuitem. */
    headerButton(name: string | RegExp): Locator {
        return this.root
            .getByRole("button", { name })
            .or(this.root.getByRole("menuitem", { name }))
            .first();
    }

    async clickTab(tabName: string, timeout = 20_000): Promise<void> {
        const t = this.tab(tabName);
        await expect(t).toBeVisible({ timeout });
        await t.click();
        await expect(t).toHaveAttribute("aria-current", "page", { timeout });
    }

    async expectTabVisible(tabName: string, timeout = 10_000): Promise<void> {
        await expect(this.tab(tabName)).toBeVisible({ timeout });
    }

    async expectTabContentVisible(tabName: string, timeout = 20_000): Promise<void> {
        // The active section is marked with aria-current="page" on its menuitem — that is the
        // reliable signal that the tab switched and its content rendered.
        await expect(this.tab(tabName)).toHaveAttribute("aria-current", "page", { timeout });
    }

    async expectHasTitle(timeout = 10_000): Promise<void> {
        await expect(this.page.locator("h1, h2, h3").first()).not.toBeEmpty({ timeout });
    }

    async close(): Promise<void> {
        const back = this.page.getByRole("link", { name: /back to/i });
        if (await back.isVisible().catch(() => false)) {
            await back.click();
        }
    }
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
