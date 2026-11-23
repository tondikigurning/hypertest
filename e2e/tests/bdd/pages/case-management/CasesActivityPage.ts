import { expect, type Locator, type Page } from "@playwright/test";
import { e2eValue } from "../../utils/e2e-test-data";
import { CasesPrerequisiteError, type CasesPage } from "./CasesPage";

export class CasesActivityPage {
    private previousEntries: string[] = [];

    constructor(private readonly page: Page, private readonly cases: CasesPage) {}

    private get root(): Locator { return this.page.getByText("Activities", { exact: true }).locator("../.."); }
    private get search(): Locator { return this.root.getByRole("textbox", { name: "Search..." }); }
    private get next(): Locator { return this.root.getByRole("button", { name: "Next Page", exact: true }); }
    private get previous(): Locator { return this.root.getByRole("button", { name: "Previous Page", exact: true }); }
    private entries(): Locator {
        return this.root.locator("p:has(+ div span)");
    }

    async prepare(): Promise<void> { await this.cases.openOwnedCase(); }
    async open(): Promise<void> {
        if (!(await this.root.isVisible().catch(() => false))) {
            await this.page.locator("button").filter({ has: this.page.locator("i.i-timeline-event-text") }).click();
        }
        await expect(this.root).toBeVisible();
    }
    async prepareWithEntries(): Promise<void> { await this.prepare(); await this.open(); await expect(this.entries().first()).toBeVisible(); }
    async prepareStatusChange(): Promise<void> {
        await this.prepareWithEntries();
        const found = await this.findEntry(/changed Case Status from .+ to .+/i);
        if (!found) throw new CasesPrerequisiteError("The selected case has no visible status-change activity.");
    }
    async prepareMultiplePages(): Promise<void> {
        await this.prepareWithEntries();
        if (!(await this.next.isEnabled())) throw new CasesPrerequisiteError("The selected case has only one page of activity.");
        this.previousEntries = await this.entries().allTextContents();
    }
    private async findEntry(pattern: RegExp): Promise<boolean> {
        for (let pageNumber = 0; pageNumber < 10; pageNumber += 1) {
            if (await this.root.getByText(pattern).first().isVisible().catch(() => false)) return true;
            if (!(await this.next.isEnabled())) break;
            await this.next.click();
        }
        return false;
    }
    async expectViewEntry(): Promise<void> { await expect(this.root.getByText(/opened and viewed the case/i).first()).toBeVisible(); }
    async expectEntryActorAndTime(kind: "view" | "status"): Promise<void> {
        const text = kind === "view" ? /opened and viewed the case/i : /changed Case Status from .+ to .+/i;
        const entry = this.root.getByText(text).first().locator("..");
        await expect(entry.locator("span").first()).toContainText(/\d{1,2}\s+\w+\s+\d{4}.*\d{1,2}:\d{2}/);
        const actor = entry.locator("span").last();
        await expect(actor).not.toHaveText(/^\s*$/);
        if (kind === "view") {
            const greeting = (await this.page.getByText(/^Hi, /).first().innerText()).replace(/^Hi,\s*/, "").trim();
            if (!greeting) throw new Error("The signed-in user's displayed name is unavailable.");
            await expect(actor).toHaveText(greeting);
        }
    }
    async searchMissing(): Promise<void> { await this.search.fill(e2eValue("activity search with no match")); await this.search.press("Enter"); }
    async expectEmpty(message: string): Promise<void> { await expect(this.root.getByText(message, { exact: true })).toBeVisible(); }
    async reset(): Promise<void> { await this.root.getByRole("button", { name: "Reset", exact: true }).click(); }
    async expectResetEntries(): Promise<void> { await expect(this.search).toHaveValue(""); await expect(this.entries().first()).toBeVisible(); }
    async expectStatusChange(): Promise<void> { await expect(this.root.getByText(/changed Case Status from .+ to .+/i).first()).toBeVisible(); }
    async nextPage(): Promise<void> { await this.next.click(); }
    async previousPage(): Promise<void> { await this.previous.click(); }
    async expectDifferentPage(): Promise<void> { await expect.poll(() => this.entries().allTextContents()).not.toEqual(this.previousEntries); }
    async expectPreviousPage(): Promise<void> { await expect.poll(() => this.entries().allTextContents()).toEqual(this.previousEntries); }
    async filterAgentViews(): Promise<void> {
        await this.root.getByRole("button", { name: "Add Filters", exact: true }).click();
        await this.page.getByRole("button", { name: "Event Type", exact: true }).click();
        await this.page.getByRole("textbox", { name: "Search for an item" }).click();
        await this.page.getByRole("option", { name: "ViewedByAgent", exact: true }).click();
        await this.page.keyboard.press("Escape");
    }
    async expectAgentViews(): Promise<void> {
        await expect(this.entries().first()).toBeVisible();
        for (const entry of await this.entries().all()) await expect(entry).toContainText(/opened and viewed the case/i);
    }
}
