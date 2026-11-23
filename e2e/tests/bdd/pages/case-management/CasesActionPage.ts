import { expect, type Locator, type Page } from "@playwright/test";
import { CasesPrerequisiteError, type CasesPage } from "./CasesPage";

/** Previews and cancels actions; no method confirms a transfer or close. */
export class CasesActionPage {
    private targetAgent = "";
    private caseNumber = "";

    constructor(private readonly page: Page, private readonly cases: CasesPage) {}

    private field(label: string): Locator {
        return this.page.getByRole("term").filter({ has: this.page.getByText(label, { exact: true }) }).first().locator("../..").getByRole("definition");
    }
    private transferDialog(): Locator { return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: /Reassign Agent to Case/ }) }); }
    private confirmation(): Locator { return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: /Reassign Confirmation/ }) }); }
    private closeDialog(): Locator { return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: "Close Case", exact: true }) }); }

    async prepareOpenUnassigned(): Promise<void> {
        await this.cases.navigateTo();
        await this.cases.selectPipeline("Open");
        this.caseNumber = await this.cases.openFirstVisibleReadOnlyCase({ agentUnassigned: true });
        if ((await this.field("Agent").innerText()).trim() !== "—") throw new CasesPrerequisiteError("The sampled Open case is not unassigned.");
    }
    async prepareInProgressUnassigned(): Promise<void> {
        await this.cases.navigateTo();
        await this.cases.selectPipeline("In Progress");
        this.caseNumber = await this.cases.openFirstVisibleReadOnlyCase({ agentUnassigned: true });
        if ((await this.field("Agent").innerText()).trim() !== "—") throw new CasesPrerequisiteError("The sampled In Progress case is not unassigned.");
    }
    async prepareTransfer(needsAgent: boolean): Promise<void> {
        await this.cases.openOwnedCase("In Progress", !needsAgent);
        this.caseNumber = (await this.field("Case Number").innerText()).trim();
        await this.cases.openMoreActions();
        const transfer = this.page.getByRole("menuitem", { name: "Transfer Case", exact: true });
        if (!(await transfer.isVisible().catch(() => false))) throw new CasesPrerequisiteError("The sampled case does not offer Transfer Case.");
        if (needsAgent) {
            await transfer.click();
            const available = this.transferDialog().getByRole("checkbox").and(this.page.locator(":not([disabled])"));
            if (await available.count() === 0) throw new CasesPrerequisiteError("No selectable agent is available for the transfer preview.");
        }
    }
    async openTransfer(): Promise<void> { await this.page.getByRole("menuitem", { name: "Transfer Case", exact: true }).click(); }
    async expectTransferNextDisabled(): Promise<void> { await expect(this.transferDialog().getByRole("button", { name: "Next", exact: true })).toBeDisabled(); }
    async selectAgentAndContinue(): Promise<void> {
        const checkbox = this.transferDialog().getByRole("checkbox").and(this.page.locator(":not([disabled])")).first();
        const row = checkbox.locator("xpath=ancestor::tr");
        this.targetAgent = (await row.getByTestId("user-cell").locator("span.text-neutral-1000").first().innerText()).trim();
        if (!this.targetAgent) throw new CasesPrerequisiteError("The available agent has no visible name.");
        await checkbox.check();
        await this.transferDialog().getByRole("button", { name: "Next", exact: true }).click();
    }
    async expectTransferSummary(): Promise<void> {
        if (!this.caseNumber || !this.targetAgent) throw new Error("The case and selected agent must be recorded before the preview.");
        await expect(this.confirmation()).toContainText(this.caseNumber);
        const term = this.confirmation().getByRole("term").filter({ has: this.page.getByText("Reassigned to", { exact: true }) });
        await expect(term.locator("../..").getByRole("definition")).toContainText(this.targetAgent);
    }
    async backFromTransfer(): Promise<void> { await this.confirmation().getByRole("button", { name: "Back", exact: true }).click(); }
    async cancelTransfer(): Promise<void> { await this.transferDialog().getByRole("button", { name: "Cancel", exact: true }).click(); }
    async expectMenuAction(name: "Assign Case" | "Transfer Case", visible: boolean): Promise<void> {
        const action = this.page.getByRole("menuitem", { name, exact: true });
        if (visible) await expect(action).toBeVisible();
        else await expect(action).toHaveCount(0);
    }
    async prepareSolved(): Promise<void> {
        await this.cases.navigateTo();
        await this.cases.selectPipeline("All");
        await this.cases.filterStatus("Solved");
        this.caseNumber = await this.cases.openFirstVisibleReadOnlyCase();
        await this.cases.openMoreActions();
        if (!(await this.page.getByRole("menuitem", { name: "Close Case", exact: true }).isVisible().catch(() => false))) {
            throw new CasesPrerequisiteError("The sampled Solved case does not offer Close Case.");
        }
    }
    async openClose(): Promise<void> { await this.page.getByRole("menuitem", { name: "Close Case", exact: true }).click(); }
    async expectCloseWarning(): Promise<void> { await expect(this.closeDialog()).toContainText("This action cannot be undone."); }
    async cancelClose(): Promise<void> { await this.closeDialog().getByRole("button", { name: "Cancel", exact: true }).click(); }
    async expectSameCaseStatus(status: string): Promise<void> {
        if (!this.caseNumber) throw new Error("No case identity was captured.");
        await expect(this.field("Case Number")).toContainText(this.caseNumber);
        await expect(this.page.getByRole("button").filter({ has: this.page.getByText(status, { exact: true }) }).first()).toBeVisible();
    }
    async expectCreatePrepared(): Promise<void> {
        await expect(this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: /Create New Case/ }) })).toBeVisible();
    }
    async expectNewAssigned(): Promise<void> { await expect(this.page.getByRole("button").filter({ has: this.page.getByText("Assigned", { exact: true }) }).first()).toBeVisible(); }
    async searchCreatedAssigned(): Promise<void> {
        this.caseNumber = (await this.field("Case Number").innerText()).trim();
        if (!this.caseNumber) throw new Error("The newly created case has no visible identity.");
        await this.cases.navigateTo();
        await this.cases.selectPipeline("Assigned to Me");
        await this.cases.searchFor(this.caseNumber);
    }
    async expectCreatedInPipeline(): Promise<void> {
        if (!this.caseNumber) throw new Error("The newly created case identity was not retained.");
        await expect(this.page.getByRole("row").filter({ has: this.page.getByText(this.caseNumber, { exact: true }) })).toHaveCount(1);
    }
}
