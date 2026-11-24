import { expect, type Locator, type Page } from "@playwright/test";
import { e2eValue } from "../../utils/e2e-test-data";
import { CasesPrerequisiteError, type CasesPage } from "./CasesPage";

/** Draft-only email operations; no method previews, sends or changes a recipient. */
export class CasesEmailPage {
    private draftSubject = "";
    private hasDraft = false;

    constructor(private readonly page: Page, private readonly cases: CasesPage) {}
    private get composer(): Locator { return this.page.getByTestId("case-composer"); }
    private get subject(): Locator { return this.composer.getByRole("textbox", { name: "Subject", exact: true }); }
    private get body(): Locator { return this.composer.getByRole("textbox", { name: "Email body", exact: true }); }
    private get send(): Locator { return this.composer.getByRole("button", { name: "Preview & Send", exact: true }); }

    async open(): Promise<void> {
        const external = this.page.getByRole("button", { name: "Switch to External", exact: true });
        if (await external.isVisible().catch(() => false)) await external.click();
        await this.page.getByRole("tab", { name: /Email$/ }).click();
        await expect(this.composer).toBeVisible();
        if (!(await this.subject.isVisible().catch(() => false))) await this.composer.getByRole("button").first().click();
        await expect(this.subject).toBeVisible();
    }
    async prepareEditable(clear: boolean): Promise<void> {
        await this.cases.openOwnedCase("In Progress", true);
        await this.open();
        if (!(await this.subject.isEnabled())) throw new CasesPrerequisiteError("The sampled owned case does not permit email drafting.");
        if (clear) {
            await this.composer.getByRole("button", { name: "Discard", exact: true }).click();
            await expect(this.send).toBeDisabled();
        }
    }
    async enterSubject(): Promise<void> {
        for (const label of ["unsent email draft", "unsent email draft retry"]) {
            const value = e2eValue(label);
            if (!(await this.page.getByText(value, { exact: true }).isVisible().catch(() => false))) {
                this.draftSubject = value;
                this.hasDraft = true;
                await this.subject.fill(value);
                return;
            }
        }
        throw new CasesPrerequisiteError("No collision-free draft subject was available.");
    }
    async enterBody(): Promise<void> { this.hasDraft = true; await this.body.fill("Please provide an update on this request."); }
    async clearSubject(): Promise<void> { this.hasDraft = true; await this.subject.fill(""); }
    async discard(): Promise<void> {
        await this.composer.getByRole("button", { name: "Discard", exact: true }).click();
        this.hasDraft = false;
    }
    async cleanup(): Promise<void> {
        if (this.hasDraft && await this.composer.isVisible().catch(() => false)) await this.discard();
    }
    async expectCleared(): Promise<void> { await expect(this.subject).toHaveText(""); await expect(this.body).toHaveText(""); }
    async expectSendEnabled(enabled: boolean): Promise<void> { if (enabled) await expect(this.send).toBeEnabled(); else await expect(this.send).toBeDisabled(); }
    async expectDraftAbsent(): Promise<void> {
        if (!this.draftSubject) throw new Error("No draft subject was captured.");
        await expect(this.page.getByText(this.draftSubject, { exact: true })).toHaveCount(0);
    }
    async expectBlockedFields(): Promise<void> { await expect(this.subject).toBeDisabled(); await expect(this.body).toBeDisabled(); await expect(this.send).toBeDisabled(); }
    async expectMessage(message: string): Promise<void> { await expect(this.composer.getByText(message, { exact: true })).toBeVisible(); }
}
