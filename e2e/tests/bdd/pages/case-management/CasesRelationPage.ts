import { expect, type Locator, type Page } from "@playwright/test";
import { e2eValue } from "../../utils/e2e-test-data";
import { CasesPrerequisiteError, type CasesPage } from "./CasesPage";

/** Read-only case selection and cancellation, with no relation-save operation. */
export class CasesRelationPage {
    private reference = "";
    private referenceSubject = "";

    constructor(private readonly page: Page, private readonly cases: CasesPage) {}
    private dialog(): Locator { return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: "Add Case Relation", exact: true }) }); }
    private async drawer(icon: "i-vector-triangle" | "i-file-stack"): Promise<void> {
        await this.page.locator("button").filter({ has: this.page.locator(`i.${icon}`) }).click();
    }
    async prepareEmpty(): Promise<void> {
        await this.cases.openAccessibleCase();
        await this.drawer("i-vector-triangle");
        if (!(await this.page.getByText("Currently there are no related cases. Add a case from the button above.", { exact: true }).isVisible().catch(() => false))) {
            throw new CasesPrerequisiteError("The sampled owned case already has related cases.");
        }
    }
    async prepareReference(): Promise<void> {
        await this.drawer("i-file-stack");
        const history = this.page.getByText("Ticket History", { exact: true }).locator("../../../../..");
        const candidate = history.getByRole("button").filter({ hasText: /E2E\s/ }).filter({ hasNotText: "Current" }).first();
        if (!(await candidate.isVisible().catch(() => false))) throw new CasesPrerequisiteError("No other accessible E2E case is available in ticket history.");
        const text = await candidate.innerText();
        const match = text.match(/HS-\d+-\d+/);
        if (!match) throw new CasesPrerequisiteError("The reference case did not show its identity.");
        this.reference = match[0];
        await this.drawer("i-vector-triangle");
    }
    async searchMissing(): Promise<void> {
        await this.page.getByRole("button", { name: "Add Case Relation", exact: true }).click();
        await this.dialog().getByRole("textbox", { name: "Search Ticket No" }).fill(e2eValue("missing case relation"));
    }
    async expectMissing(message: string): Promise<void> { await expect(this.page.getByText(message, { exact: true })).toBeVisible(); }
    async cancelSearch(): Promise<void> {
        await this.page.keyboard.press("Escape");
        await this.dialog().getByRole("button", { name: "Cancel", exact: true }).click();
    }
    async searchAndSelect(): Promise<void> {
        if (!this.reference) throw new Error("No reference case was captured.");
        await this.page.getByRole("button", { name: "Add Case Relation", exact: true }).click();
        await this.dialog().getByRole("textbox", { name: "Search Ticket No" }).fill(this.reference);
        const option = this.page.getByRole("option").filter({ hasText: this.reference });
        await expect(option).toHaveCount(1);
        const paragraphs = await option.locator("p").allTextContents();
        this.referenceSubject = paragraphs.map((value) => value.trim()).find((value) => /^E2E\s/.test(value)) ?? "";
        if (!this.referenceSubject) throw new CasesPrerequisiteError("The reference result did not establish its E2E subject.");
        await option.click();
    }
    async expectSelected(): Promise<void> {
        if (!this.reference || !this.referenceSubject) throw new Error("No reference case summary was captured.");
        await expect(this.dialog()).toContainText(this.reference);
        await expect(this.dialog()).toContainText(this.referenceSubject);
    }
    async backAndCancel(): Promise<void> {
        await this.dialog().getByRole("button", { name: "Back", exact: true }).click();
        await this.dialog().getByRole("button", { name: "Cancel", exact: true }).click();
    }
    async expectEmpty(): Promise<void> { await expect(this.page.getByText("Currently there are no related cases. Add a case from the button above.", { exact: true })).toBeVisible(); }
}
